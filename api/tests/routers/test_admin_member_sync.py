from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import select

from api.models import User
from api.services.member_sync import MemberSyncCounters, MemberSyncResult, MemberSyncService
from tests.conftest import FAKE_USER_ID, TestingSessionLocal


def _set_fake_user_role(role: str) -> None:
    db = TestingSessionLocal()
    try:
        user = db.execute(select(User).where(User.id == FAKE_USER_ID)).scalars().one()
        user.role = role
        db.commit()
    finally:
        db.close()


def test_get_member_sync_status_returns_contract_and_counters(
    client: TestClient,
    auth_headers: dict,
    monkeypatch,
) -> None:
    def fake_get_last_status(self):
        return {
            "last_sync_at": datetime(2026, 2, 28, 10, 0, tzinfo=timezone.utc),
            "last_success_at": datetime(2026, 2, 28, 10, 1, tzinfo=timezone.utc),
            "last_status": "success",
            "last_request_id": "req-status-1",
            "last_error": None,
            "watermark": datetime(2026, 2, 28, 10, 0, tzinfo=timezone.utc),
            "last_cursor": None,
            "counters": {"created": 1, "updated": 2, "deleted": 0, "errors": 0, "conflicts": 0},
            "contract_fields": ["sub", "email", "display_name", "role", "tenant", "membership_status"],
            "excluded_local_user_fields": ["password_hash", "pin_hash", "status", "site_id", "groups"],
        }

    monkeypatch.setattr(MemberSyncService, "get_last_status", fake_get_last_status)
    resp = client.get("/v1/admin/paheko/members/sync/status", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["last_status"] == "success"
    assert data["counters"]["updated"] == 2
    assert "tenant" in data["contract_fields"]
    assert "password_hash" in data["excluded_local_user_fields"]


def test_post_member_sync_manual_trigger_uses_request_id(
    client: TestClient,
    auth_headers: dict,
    monkeypatch,
) -> None:
    captured = {"request_id": None, "force_full": None}

    def fake_run_sync(self, *, request_id: str, actor_user_id, force_full: bool = False):
        captured["request_id"] = request_id
        captured["force_full"] = force_full
        return MemberSyncResult(
            status="success",
            request_id=request_id,
            counters=MemberSyncCounters(created=3, updated=1, deleted=1, errors=0, conflicts=0),
            watermark=datetime(2026, 2, 28, 11, 0, tzinfo=timezone.utc),
            cursor=None,
        )

    monkeypatch.setattr(MemberSyncService, "run_sync", fake_run_sync)
    resp = client.post(
        "/v1/admin/paheko/members/sync",
        headers={**auth_headers, "X-Request-Id": "req-manual-123"},
        json={"force_full": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert captured["request_id"] == "req-manual-123"
    assert captured["force_full"] is True
    assert data["counters"]["created"] == 3
    assert data["status"] == "success"


def test_post_member_sync_returns_503_when_paheko_dependency_is_unavailable(
    client: TestClient,
    auth_headers: dict,
    monkeypatch,
) -> None:
    _set_fake_user_role("admin")

    def fake_run_sync(self, *, request_id: str, actor_user_id, force_full: bool = False):
        return MemberSyncResult(
            status="error",
            request_id=request_id,
            counters=MemberSyncCounters(created=0, updated=0, deleted=0, errors=1, conflicts=0),
            watermark=None,
            cursor=None,
            message="paheko_api_unreachable",
        )

    monkeypatch.setattr(MemberSyncService, "run_sync", fake_run_sync)
    resp = client.post(
        "/v1/admin/paheko/members/sync",
        headers={**auth_headers, "X-Request-Id": "req-manual-503"},
        json={"force_full": False},
    )
    assert resp.status_code == 503
    assert resp.json()["detail"] == "Service temporairement indisponible"

