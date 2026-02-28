import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.models import PahekoMemberLink, PahekoMemberSyncState, User
from api.services.audit import write_audit_event
from api.services.paheko_client import PahekoClient, PahekoClientError
from api.services.resilience import DEPENDENCY_PAHEKO, record_dependency_result

ALLOWED_SYNC_ROLES = {"super_admin", "admin", "benevole"}
SYNC_CONTRACT_FIELDS = {
    "sub",
    "email",
    "display_name",
    "role",
    "tenant",
    "membership_status",
}
# Champs strictement locaux RecyClique, exclus de la sync phase 1.
SYNC_EXCLUDED_LOCAL_USER_FIELDS = {
    "password_hash",
    "pin_hash",
    "status",
    "site_id",
    "groups",
}


@dataclass
class MemberSyncCounters:
    created: int = 0
    updated: int = 0
    deleted: int = 0
    errors: int = 0
    conflicts: int = 0


@dataclass
class MemberSyncResult:
    status: str
    request_id: str
    counters: MemberSyncCounters
    watermark: datetime | None
    cursor: str | None
    message: str | None = None


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(value, str) and value.strip():
        text = value.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(text)
        except ValueError:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    return None


def _json_details(data: dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=True, default=str)


def _coerce_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalize_role(raw_role: str | None) -> str | None:
    if raw_role is None:
        return None
    role = raw_role.strip().lower()
    aliases = {
        "superadmin": "super_admin",
        "super-admin": "super_admin",
        "administrator": "admin",
        "member": "benevole",
        "volunteer": "benevole",
    }
    role = aliases.get(role, role)
    return role


class MemberSyncService:
    def __init__(
        self,
        db: Session,
        *,
        paheko_client: PahekoClient | None = None,
    ) -> None:
        self.db = db
        self.paheko_client = paheko_client or PahekoClient()

    def _get_state(self) -> PahekoMemberSyncState:
        state = self.db.get(PahekoMemberSyncState, 1)
        if state is None:
            state = PahekoMemberSyncState(id=1)
            self.db.add(state)
            self.db.flush()
        return state

    def _write_sync_audit(
        self,
        *,
        action: str,
        request_id: str,
        actor_user_id: UUID | None,
        details: dict[str, Any],
    ) -> None:
        payload = {"request_id": request_id, **details}
        write_audit_event(
            self.db,
            user_id=actor_user_id,
            action=action,
            resource_type="paheko_member_sync",
            resource_id=request_id,
            details=_json_details(payload),
        )

    def _find_local_user(
        self,
        *,
        email: str,
        sub: str,
        source_id: str,
        request_id: str,
        actor_user_id: UUID | None,
        counters: MemberSyncCounters,
    ) -> User | None:
        users_by_sub = list(
            self.db.execute(select(User).where(User.username == sub)).scalars().all()
        )
        users_by_email = list(
            self.db.execute(select(User).where(User.email == email)).scalars().all()
        )

        if users_by_sub:
            selected = users_by_sub[0]
            if users_by_email and users_by_email[0].id != selected.id:
                counters.conflicts += 1
                self._write_sync_audit(
                    action="LOCAL_USER_RESOLUTION_COLLISION",
                    request_id=request_id,
                    actor_user_id=actor_user_id,
                    details={
                        "reason": "sub_email_mismatch",
                        "source_id": source_id,
                        "sub": sub,
                        "email": email,
                        "sub_user_id": str(selected.id),
                        "email_user_id": str(users_by_email[0].id),
                    },
                )
            return selected

        if len(users_by_email) == 1:
            return users_by_email[0]

        if len(users_by_email) > 1:
            counters.conflicts += 1
            self._write_sync_audit(
                action="LOCAL_USER_RESOLUTION_COLLISION",
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={
                    "reason": "email_ambiguous",
                    "source_id": source_id,
                    "email": email,
                    "candidate_count": len(users_by_email),
                },
            )
        return None

    def _upsert_member(
        self,
        *,
        member: dict[str, Any],
        request_id: str,
        actor_user_id: UUID | None,
        counters: MemberSyncCounters,
    ) -> datetime | None:
        source_id = _coerce_str(member.get("id") or member.get("member_id") or member.get("sub"))
        sub = _coerce_str(member.get("sub")) or source_id
        email = _coerce_str(member.get("email"))
        display_name = _coerce_str(member.get("display_name") or member.get("name"))
        role = _normalize_role(_coerce_str(member.get("role")))
        tenant = _coerce_str(member.get("tenant"))
        membership_status = _coerce_str(
            member.get("membership_status") or member.get("adhesion_status") or member.get("status")
        )
        source_updated_at = _parse_datetime(member.get("updated_at") or member.get("modified_at"))

        if not source_id or not sub or not email or not display_name or not role or not tenant or not membership_status:
            counters.errors += 1
            self._write_sync_audit(
                action="MEMBER_SYNC_RECORD_ERROR",
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={"reason": "invalid_payload", "source_id": source_id},
            )
            return source_updated_at
        if role not in ALLOWED_SYNC_ROLES:
            counters.conflicts += 1
            self._write_sync_audit(
                action="ROLE_INCONSISTENCY_DETECTED",
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={"reason": "unsupported_role", "source_id": source_id, "role": role},
            )
            self._write_sync_audit(
                action="FAIL_CLOSED_TRIGGERED",
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={"reason": "unsupported_role", "source_id": source_id},
            )
            return source_updated_at
        local_user = self._find_local_user(
            email=email,
            sub=sub,
            source_id=source_id,
            request_id=request_id,
            actor_user_id=actor_user_id,
            counters=counters,
        )
        if local_user is not None and local_user.role != role:
            counters.conflicts += 1
            self._write_sync_audit(
                action="ROLE_INCONSISTENCY_DETECTED",
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={
                    "reason": "local_role_mismatch",
                    "source_id": source_id,
                    "incoming_role": role,
                    "local_role": local_user.role,
                },
            )
        row = (
            self.db.execute(
                select(PahekoMemberLink).where(PahekoMemberLink.paheko_member_id == source_id)
            )
            .scalars()
            .one_or_none()
        )
        if row is not None and row.tenant != tenant:
            counters.conflicts += 1
            self._write_sync_audit(
                action="TENANT_INCONSISTENCY_DETECTED",
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={
                    "reason": "tenant_changed",
                    "source_id": source_id,
                    "incoming_tenant": tenant,
                    "previous_tenant": row.tenant,
                },
            )
        if row is not None and row.membership_status != membership_status:
            counters.conflicts += 1
            self._write_sync_audit(
                action="MEMBERSHIP_STATUS_INCONSISTENCY_DETECTED",
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={
                    "reason": "membership_status_changed",
                    "source_id": source_id,
                    "incoming_membership_status": membership_status,
                    "previous_membership_status": row.membership_status,
                },
            )
        now = _now_utc()
        if row is None:
            row = PahekoMemberLink(
                paheko_member_id=source_id,
                sub=sub,
                email=email,
                display_name=display_name,
                role=role,
                tenant=tenant,
                membership_status=membership_status,
                source_updated_at=source_updated_at,
                local_user_id=local_user.id if local_user else None,
                last_synced_at=now,
            )
            self.db.add(row)
            counters.created += 1
        else:
            row.sub = sub
            row.email = email
            row.display_name = display_name
            row.role = role
            row.tenant = tenant
            row.membership_status = membership_status
            row.source_updated_at = source_updated_at
            row.local_user_id = local_user.id if local_user else row.local_user_id
            row.last_synced_at = now
            counters.updated += 1
        return source_updated_at

    def _delete_member(
        self,
        *,
        member: dict[str, Any],
        request_id: str,
        actor_user_id: UUID | None,
        counters: MemberSyncCounters,
    ) -> None:
        source_id = _coerce_str(member.get("id") or member.get("member_id") or member.get("sub"))
        if not source_id:
            counters.errors += 1
            self._write_sync_audit(
                action="MEMBER_SYNC_RECORD_ERROR",
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={"reason": "missing_id_for_delete"},
            )
            return
        self.db.flush()
        row = (
            self.db.execute(
                select(PahekoMemberLink).where(PahekoMemberLink.paheko_member_id == source_id)
            )
            .scalars()
            .one_or_none()
        )
        if row is None:
            return
        self.db.delete(row)
        counters.deleted += 1

    def get_last_status(self) -> dict[str, Any]:
        state = self._get_state()
        return {
            "last_sync_at": state.last_sync_at,
            "last_success_at": state.last_success_at,
            "last_status": state.last_status,
            "last_request_id": state.last_request_id,
            "last_error": state.last_error,
            "watermark": state.watermark,
            "last_cursor": state.last_cursor,
            "counters": {
                "created": state.last_created_count,
                "updated": state.last_updated_count,
                "deleted": state.last_deleted_count,
                "errors": state.last_error_count,
                "conflicts": state.last_conflict_count,
            },
            "contract_fields": sorted(SYNC_CONTRACT_FIELDS),
            "excluded_local_user_fields": sorted(SYNC_EXCLUDED_LOCAL_USER_FIELDS),
        }

    def run_sync(
        self,
        *,
        request_id: str,
        actor_user_id: UUID | None,
        force_full: bool = False,
    ) -> MemberSyncResult:
        state = self._get_state()
        counters = MemberSyncCounters()
        state.last_sync_at = _now_utc()
        state.last_request_id = request_id
        state.last_status = "running"
        state.scheduler_enabled = bool(self.paheko_client.settings.paheko_members_sync_scheduler_enabled)
        self._write_sync_audit(
            action="MEMBER_SYNC_STARTED",
            request_id=request_id,
            actor_user_id=actor_user_id,
            details={"force_full": force_full},
        )
        self.db.flush()

        cursor = None if force_full else state.last_cursor
        watermark = None if force_full else _parse_datetime(state.watermark)
        max_seen_watermark = watermark
        state.last_cursor = cursor
        state.watermark = watermark
        self.db.flush()

        try:
            while True:
                page = self.paheko_client.fetch_members_page(cursor=cursor, updated_after=watermark)
                for item in page.items:
                    deleted = bool(item.get("deleted")) or _coerce_str(item.get("state")) == "deleted"
                    if deleted:
                        self._delete_member(
                            member=item,
                            request_id=request_id,
                            actor_user_id=actor_user_id,
                            counters=counters,
                        )
                        continue
                    seen = self._upsert_member(
                        member=item,
                        request_id=request_id,
                        actor_user_id=actor_user_id,
                        counters=counters,
                    )
                    if seen and (max_seen_watermark is None or seen > max_seen_watermark):
                        max_seen_watermark = seen
                next_cursor = page.next_cursor
                state.last_cursor = next_cursor
                state.watermark = max_seen_watermark
                self.db.commit()
                if not next_cursor:
                    cursor = None
                    break
                cursor = next_cursor
            state.last_status = "success"
            state.last_success_at = _now_utc()
            state.last_error = None
            state.watermark = max_seen_watermark
            state.last_cursor = cursor
            state.last_created_count = counters.created
            state.last_updated_count = counters.updated
            state.last_deleted_count = counters.deleted
            state.last_error_count = counters.errors
            state.last_conflict_count = counters.conflicts
            self._write_sync_audit(
                action="MEMBER_SYNC_SUCCESS",
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={
                    "created": counters.created,
                    "updated": counters.updated,
                    "deleted": counters.deleted,
                    "errors": counters.errors,
                    "conflicts": counters.conflicts,
                    "watermark": max_seen_watermark.isoformat() if max_seen_watermark else None,
                },
            )
            self.db.commit()
            record_dependency_result(
                dependency=DEPENDENCY_PAHEKO,
                ok=True,
                reason="member_sync_success",
                request_id=request_id,
            )
            return MemberSyncResult(
                status="success",
                request_id=request_id,
                counters=counters,
                watermark=max_seen_watermark,
                cursor=cursor,
            )
        except PahekoClientError as exc:
            state.last_status = "error"
            state.last_error = str(exc)
            state.last_cursor = cursor
            state.watermark = max_seen_watermark
            state.last_created_count = counters.created
            state.last_updated_count = counters.updated
            state.last_deleted_count = counters.deleted
            state.last_error_count = counters.errors + 1
            state.last_conflict_count = counters.conflicts
            self._write_sync_audit(
                action="MEMBER_SYNC_FAILED",
                request_id=request_id,
                actor_user_id=actor_user_id,
                details={"reason": str(exc)},
            )
            self.db.commit()
            record_dependency_result(
                dependency=DEPENDENCY_PAHEKO,
                ok=False,
                reason="member_sync_failed",
                request_id=request_id,
            )
            return MemberSyncResult(
                status="error",
                request_id=request_id,
                counters=MemberSyncCounters(
                    created=counters.created,
                    updated=counters.updated,
                    deleted=counters.deleted,
                    errors=counters.errors + 1,
                    conflicts=counters.conflicts,
                ),
                watermark=max_seen_watermark,
                cursor=cursor,
                message=str(exc),
            )

