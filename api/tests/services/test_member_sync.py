from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from sqlalchemy import select

from api.models import AuditEvent, PahekoMemberLink, PahekoMemberSyncState, User
from api.services.member_sync import MemberSyncService
from api.services.paheko_client import PahekoClientError, PahekoMembersPage
from api.tests.conftest import TestingSessionLocal


class StubPahekoClient:
    def __init__(self, pages: dict[str | None, PahekoMembersPage], *, error: str | None = None) -> None:
        self.pages = pages
        self.error = error
        self.settings = SimpleNamespace(paheko_members_sync_scheduler_enabled=False)

    def fetch_members_page(
        self,
        *,
        cursor: str | None = None,
        updated_after: datetime | None = None,
    ) -> PahekoMembersPage:
        if self.error:
            raise PahekoClientError(self.error)
        return self.pages.get(cursor, PahekoMembersPage(items=[], next_cursor=None))


class StatefulStubPahekoClient:
    def __init__(
        self,
        pages: dict[str | None, PahekoMembersPage],
        *,
        fail_once_on_cursor: str | None = None,
        fail_error: str = "http_503",
    ) -> None:
        self.pages = pages
        self.fail_once_on_cursor = fail_once_on_cursor
        self.fail_error = fail_error
        self.failed = False
        self.settings = SimpleNamespace(paheko_members_sync_scheduler_enabled=False)

    def fetch_members_page(
        self,
        *,
        cursor: str | None = None,
        updated_after: datetime | None = None,
    ) -> PahekoMembersPage:
        if cursor == self.fail_once_on_cursor and not self.failed:
            self.failed = True
            raise PahekoClientError(self.fail_error)
        return self.pages.get(cursor, PahekoMembersPage(items=[], next_cursor=None))


def test_member_sync_upsert_idempotent_and_status_persisted() -> None:
    db = TestingSessionLocal()
    try:
        pages_first = {
            None: PahekoMembersPage(
                items=[
                    {
                        "id": "p-1",
                        "sub": "sub-1",
                        "email": "member1@example.org",
                        "display_name": "Membre Un",
                        "role": "admin",
                        "tenant": "tenant-a",
                        "membership_status": "active",
                        "updated_at": "2026-02-28T10:00:00+00:00",
                    }
                ],
                next_cursor=None,
            )
        }
        service = MemberSyncService(db, paheko_client=StubPahekoClient(pages_first))
        res1 = service.run_sync(request_id="req-sync-1", actor_user_id=None)
        assert res1.status == "success"
        assert res1.counters.created == 1
        assert res1.counters.updated == 0

        pages_second = {
            None: PahekoMembersPage(
                items=[
                    {
                        "id": "p-1",
                        "sub": "sub-1",
                        "email": "member1@example.org",
                        "display_name": "Membre Un MAJ",
                        "role": "admin",
                        "tenant": "tenant-a",
                        "membership_status": "active",
                        "updated_at": "2026-02-28T11:00:00+00:00",
                    }
                ],
                next_cursor=None,
            )
        }
        service = MemberSyncService(db, paheko_client=StubPahekoClient(pages_second))
        res2 = service.run_sync(request_id="req-sync-2", actor_user_id=None)
        assert res2.status == "success"
        assert res2.counters.created == 0
        assert res2.counters.updated == 1

        row = db.execute(select(PahekoMemberLink).where(PahekoMemberLink.paheko_member_id == "p-1")).scalars().one()
        assert row.display_name == "Membre Un MAJ"
        state = db.get(PahekoMemberSyncState, 1)
        assert state is not None
        assert state.last_status == "success"
        assert state.last_request_id == "req-sync-2"
    finally:
        db.close()


def test_member_sync_detects_conflict_and_delete_without_overwriting_local_user() -> None:
    db = TestingSessionLocal()
    try:
        local_user = User(
            id=uuid4(),
            username="sub-2",
            email="member2@example.org",
            password_hash="hash",
            role="benevole",
            status="active",
        )
        db.add(local_user)
        db.commit()

        pages = {
            None: PahekoMembersPage(
                items=[
                    {
                        "id": "p-2",
                        "sub": "sub-2",
                        "email": "member2@example.org",
                        "display_name": "Membre Deux",
                        "role": "admin",
                        "tenant": "tenant-b",
                        "membership_status": "active",
                        "updated_at": "2026-02-28T10:00:00+00:00",
                    },
                    {
                        "id": "p-2",
                        "deleted": True,
                    },
                ],
                next_cursor=None,
            )
        }
        service = MemberSyncService(db, paheko_client=StubPahekoClient(pages))
        res = service.run_sync(request_id="req-sync-conflict", actor_user_id=None, force_full=True)
        assert res.status == "success"
        assert res.counters.created == 1
        assert res.counters.deleted == 1
        assert res.counters.conflicts == 1

        # Données locales exclues du contrat : pas d'écrasement.
        db.refresh(local_user)
        assert local_user.role == "benevole"

        conflict_events = db.execute(
            select(AuditEvent).where(AuditEvent.action == "ROLE_INCONSISTENCY_DETECTED")
        ).scalars().all()
        assert len(conflict_events) >= 1
        assert "local_role_mismatch" in (conflict_events[-1].details or "")
    finally:
        db.close()


def test_member_sync_handles_paheko_error_and_marks_state_error() -> None:
    db = TestingSessionLocal()
    try:
        service = MemberSyncService(
            db,
            paheko_client=StubPahekoClient({}, error="http_503"),
        )
        res = service.run_sync(request_id="req-sync-error", actor_user_id=None)
        assert res.status == "error"
        assert res.counters.errors >= 1

        state = db.get(PahekoMemberSyncState, 1)
        assert state is not None
        assert state.last_status == "error"
        assert state.last_error == "http_503"
    finally:
        db.close()


def test_member_sync_detects_tenant_and_membership_conflicts() -> None:
    db = TestingSessionLocal()
    try:
        first_pages = {
            None: PahekoMembersPage(
                items=[
                    {
                        "id": "p-tenant-1",
                        "sub": "sub-tenant-1",
                        "email": "member-tenant@example.org",
                        "display_name": "Membre Tenant",
                        "role": "admin",
                        "tenant": "tenant-a",
                        "membership_status": "active",
                        "updated_at": "2026-02-28T09:00:00+00:00",
                    }
                ],
                next_cursor=None,
            )
        }
        service = MemberSyncService(db, paheko_client=StubPahekoClient(first_pages))
        first = service.run_sync(request_id="req-sync-tenant-1", actor_user_id=None, force_full=True)
        assert first.status == "success"
        assert first.counters.conflicts == 0

        second_pages = {
            None: PahekoMembersPage(
                items=[
                    {
                        "id": "p-tenant-1",
                        "sub": "sub-tenant-1",
                        "email": "member-tenant@example.org",
                        "display_name": "Membre Tenant",
                        "role": "admin",
                        "tenant": "tenant-b",
                        "membership_status": "expired",
                        "updated_at": "2026-02-28T10:00:00+00:00",
                    }
                ],
                next_cursor=None,
            )
        }
        service = MemberSyncService(db, paheko_client=StubPahekoClient(second_pages))
        second = service.run_sync(request_id="req-sync-tenant-2", actor_user_id=None, force_full=True)
        assert second.status == "success"
        assert second.counters.conflicts == 2

        tenant_events = db.execute(
            select(AuditEvent).where(AuditEvent.action == "TENANT_INCONSISTENCY_DETECTED")
        ).scalars().all()
        status_events = db.execute(
            select(AuditEvent).where(AuditEvent.action == "MEMBERSHIP_STATUS_INCONSISTENCY_DETECTED")
        ).scalars().all()
        assert len(tenant_events) >= 1
        assert len(status_events) >= 1
    finally:
        db.close()


def test_member_sync_resumes_from_checkpointed_cursor_after_failure() -> None:
    db = TestingSessionLocal()
    try:
        client = StatefulStubPahekoClient(
            {
                None: PahekoMembersPage(
                    items=[
                        {
                            "id": "p-resume-1",
                            "sub": "sub-resume-1",
                            "email": "resume1@example.org",
                            "display_name": "Resume One",
                            "role": "admin",
                            "tenant": "tenant-r",
                            "membership_status": "active",
                            "updated_at": "2026-02-28T08:00:00+00:00",
                        }
                    ],
                    next_cursor="cursor-2",
                ),
                "cursor-2": PahekoMembersPage(
                    items=[
                        {
                            "id": "p-resume-2",
                            "sub": "sub-resume-2",
                            "email": "resume2@example.org",
                            "display_name": "Resume Two",
                            "role": "admin",
                            "tenant": "tenant-r",
                            "membership_status": "active",
                            "updated_at": "2026-02-28T09:00:00+00:00",
                        }
                    ],
                    next_cursor=None,
                ),
            },
            fail_once_on_cursor="cursor-2",
            fail_error="http_503",
        )
        service = MemberSyncService(db, paheko_client=client)

        first = service.run_sync(request_id="req-sync-resume-1", actor_user_id=None, force_full=True)
        assert first.status == "error"
        state_after_error = db.get(PahekoMemberSyncState, 1)
        assert state_after_error is not None
        assert state_after_error.last_cursor == "cursor-2"
        assert state_after_error.watermark is not None
        assert state_after_error.watermark.isoformat().startswith("2026-02-28T08:00:00")

        second = service.run_sync(request_id="req-sync-resume-2", actor_user_id=None)
        assert second.status == "success"
        assert second.counters.created == 1
        state_after_success = db.get(PahekoMemberSyncState, 1)
        assert state_after_success is not None
        assert state_after_success.last_cursor is None
        assert state_after_success.watermark is not None
        assert state_after_success.watermark.isoformat().startswith("2026-02-28T09:00:00")

        resumed_links = (
            db.execute(
                select(PahekoMemberLink).where(
                    PahekoMemberLink.paheko_member_id.in_(["p-resume-1", "p-resume-2"])
                )
            )
            .scalars()
            .all()
        )
        assert {link.paheko_member_id for link in resumed_links} == {"p-resume-1", "p-resume-2"}
    finally:
        db.close()


def test_member_sync_resolves_local_user_with_sub_priority_and_collision_audit() -> None:
    db = TestingSessionLocal()
    try:
        user_by_sub = User(
            id=uuid4(),
            username="sub-priority",
            email="sub-owner@example.org",
            password_hash="hash",
            role="admin",
            status="active",
        )
        user_by_email = User(
            id=uuid4(),
            username="email-owner",
            email="collision@example.org",
            password_hash="hash",
            role="admin",
            status="active",
        )
        db.add_all([user_by_sub, user_by_email])
        db.commit()

        service = MemberSyncService(
            db,
            paheko_client=StubPahekoClient(
                {
                    None: PahekoMembersPage(
                        items=[
                            {
                                "id": "p-collision-1",
                                "sub": "sub-priority",
                                "email": "collision@example.org",
                                "display_name": "Collision Case",
                                "role": "admin",
                                "tenant": "tenant-c",
                                "membership_status": "active",
                                "updated_at": "2026-02-28T10:00:00+00:00",
                            }
                        ],
                        next_cursor=None,
                    )
                }
            ),
        )
        res = service.run_sync(request_id="req-sync-collision", actor_user_id=None, force_full=True)
        assert res.status == "success"
        assert res.counters.conflicts >= 1

        link = (
            db.execute(select(PahekoMemberLink).where(PahekoMemberLink.paheko_member_id == "p-collision-1"))
            .scalars()
            .one()
        )
        assert link.local_user_id == user_by_sub.id

        collision_events = db.execute(
            select(AuditEvent).where(AuditEvent.action == "LOCAL_USER_RESOLUTION_COLLISION")
        ).scalars().all()
        assert len(collision_events) >= 1
        assert "sub_email_mismatch" in (collision_events[-1].details or "")
    finally:
        db.close()

