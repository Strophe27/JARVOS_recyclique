import json
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.models import AuditEvent, PahekoAccessException, User

PAHEKO_EXCEPTION_GROUP = "iam-benevole-exception-paheko"
PAHEKO_EXCEPTION_PERMISSIONS = {
    "iam.exception.paheko",
    "iam.exception.paheko.read",
    "iam.exception.paheko.limited-write",
}
PAHEKO_ALLOWED_ROLES = {"admin", "super_admin"}


@dataclass
class PahekoAccessDecision:
    allowed: bool
    reason: str
    exception_id: UUID | None = None
    exception_expired: bool = False


class PahekoAccessService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _as_utc(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def grant_benevole_exception(
        self,
        *,
        user_id: UUID,
        requested_by_user_id: UUID,
        approved_by_user_id: UUID,
        reason: str,
        expires_at: datetime,
        request_id: str | None = None,
    ) -> PahekoAccessException:
        reason_clean = reason.strip()
        if not reason_clean:
            raise ValueError("reason_required")
        expires_at_utc = self._as_utc(expires_at)
        if expires_at_utc <= self._now_utc():
            raise ValueError("expires_at_must_be_in_future")
        user = self.db.execute(select(User).where(User.id == user_id)).scalars().one_or_none()
        if user is None:
            raise ValueError("user_not_found")
        if user.role != "benevole":
            raise ValueError("exception_only_for_benevole")
        row = PahekoAccessException(
            user_id=user_id,
            requested_by_user_id=requested_by_user_id,
            approved_by_user_id=approved_by_user_id,
            reason=reason_clean,
            expires_at=expires_at_utc,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        self.write_audit_event(
            user_id=approved_by_user_id,
            action="IAM_EXCEPTION_GRANTED",
            details={
                "request_id": request_id or str(uuid4()),
                "subject": str(user_id),
                "actor": str(approved_by_user_id),
                "requested_by": str(requested_by_user_id),
                "decision": "approved",
                "reason": reason_clean,
                "expires_at": expires_at_utc.isoformat(),
                "exception_id": str(row.id),
            },
        )
        return row

    def revoke_exception(
        self,
        *,
        exception_id: UUID,
        revoked_by_user_id: UUID | None,
        revocation_reason: str,
        request_id: str | None = None,
    ) -> PahekoAccessException | None:
        revocation_reason_clean = revocation_reason.strip()
        if not revocation_reason_clean:
            raise ValueError("revocation_reason_required")
        row = self.db.execute(
            select(PahekoAccessException).where(PahekoAccessException.id == exception_id)
        ).scalars().one_or_none()
        if row is None:
            return None
        if row.revoked_at is not None:
            return row
        row.revoked_at = self._now_utc()
        row.revoked_by_user_id = revoked_by_user_id
        row.revocation_reason = revocation_reason_clean
        self.db.commit()
        self.db.refresh(row)
        self.write_audit_event(
            user_id=revoked_by_user_id,
            action="IAM_EXCEPTION_REVOKED",
            details={
                "request_id": request_id or str(uuid4()),
                "subject": str(row.user_id),
                "actor": str(revoked_by_user_id) if revoked_by_user_id else None,
                "decision": "revoked",
                "reason": revocation_reason_clean,
                "exception_id": str(row.id),
            },
        )
        return row

    def get_active_benevole_exception(self, user_id: UUID) -> PahekoAccessException | None:
        now = self._now_utc()
        row = self.db.execute(
            select(PahekoAccessException)
            .where(PahekoAccessException.user_id == user_id)
            .where(PahekoAccessException.revoked_at.is_(None))
            .order_by(PahekoAccessException.created_at.desc())
        ).scalars().first()
        if row is None:
            return None
        expires_at = self._as_utc(row.expires_at)
        if expires_at <= now:
            row.revoked_at = now
            row.revocation_reason = "auto_expired"
            self.db.commit()
            self.write_audit_event(
                user_id=None,
                action="IAM_EXCEPTION_REVOKED",
                details={
                    "request_id": str(uuid4()),
                    "subject": str(row.user_id),
                    "actor": None,
                    "decision": "auto_expired",
                    "reason": "auto_expired",
                    "exception_id": str(row.id),
                },
            )
            return None
        return row

    def evaluate_access(
        self,
        *,
        user: User,
        permission_codes: set[str],
    ) -> PahekoAccessDecision:
        role = (user.role or "").strip()
        if role in PAHEKO_ALLOWED_ROLES:
            return PahekoAccessDecision(allowed=True, reason=f"role_allowed:{role}")
        if role != "benevole":
            return PahekoAccessDecision(allowed=False, reason="fail_closed_invalid_role")
        exception_row = self.get_active_benevole_exception(user.id)
        if exception_row is not None:
            return PahekoAccessDecision(
                allowed=True,
                reason="benevole_exception_active",
                exception_id=exception_row.id,
            )
        return PahekoAccessDecision(allowed=False, reason="deny_by_default_benevole")

    def write_audit_event(
        self,
        *,
        user_id: UUID | None,
        action: str,
        details: dict[str, object],
    ) -> None:
        evt = AuditEvent(
            user_id=user_id,
            action=action,
            resource_type="paheko_access",
            resource_id=str(details.get("exception_id")) if details.get("exception_id") else None,
            details=json.dumps(details, ensure_ascii=True),
        )
        self.db.add(evt)
        self.db.commit()
