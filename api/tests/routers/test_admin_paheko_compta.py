# Story 8.6 — Tests GET /v1/admin/paheko-compta-url.

from datetime import datetime, timedelta, timezone
import json
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from api.core import deps as core_deps
from api.models import AuditEvent, PahekoAccessException, User
from api.services.resilience import (
    DEPENDENCY_PAHEKO,
    record_dependency_result,
    reset_runtime_state_for_tests,
)
from tests.conftest import TestingSessionLocal, FAKE_SITE_ID, FAKE_USER_ID


def _set_fake_user_role(role: str) -> None:
    db = TestingSessionLocal()
    try:
        user = db.execute(select(User).where(User.id == FAKE_USER_ID)).scalars().one()
        user.role = role
        db.execute(delete(PahekoAccessException).where(PahekoAccessException.user_id == FAKE_USER_ID))
        db.commit()
    finally:
        db.close()


def _grant_exception(expires_at: datetime) -> None:
    db = TestingSessionLocal()
    try:
        row = PahekoAccessException(
            user_id=FAKE_USER_ID,
            requested_by_user_id=FAKE_USER_ID,
            approved_by_user_id=FAKE_USER_ID,
            reason="incident secours",
            expires_at=expires_at,
        )
        db.add(row)
        db.commit()
    finally:
        db.close()


def _create_benevole_user() -> User:
    db = TestingSessionLocal()
    try:
        user = User(
            id=uuid.uuid4(),
            username=f"benevole_{uuid.uuid4().hex[:8]}",
            email=f"benevole_{uuid.uuid4().hex[:8]}@example.test",
            password_hash="hash",
            role="benevole",
            status="active",
            site_id=FAKE_SITE_ID,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


class TestPahekoComptaUrl:
    """GET /v1/admin/paheko-compta-url (admin only)."""

    def test_paheko_compta_url_404_when_not_configured(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """Sans PAHEKO_PLUGIN_URL : 404."""
        _set_fake_user_role("admin")
        r = client.get("/v1/admin/paheko-compta-url", headers=auth_headers)
        assert r.status_code == 404
        data = r.json()
        assert "detail" in data

    def test_paheko_sensitive_route_returns_503_when_paheko_degraded(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("admin")
        reset_runtime_state_for_tests()
        record_dependency_result(
            dependency=DEPENDENCY_PAHEKO,
            ok=False,
            reason="member_sync_failed",
            request_id="req-paheko-degraded",
        )
        r = client.get(
            "/v1/admin/paheko-compta-url",
            headers={**auth_headers, "X-Request-Id": "req-paheko-degraded"},
        )
        assert r.status_code == 503
        assert r.json()["detail"]["error"]["code"] == "paheko_iam_dependency_unavailable"
        assert r.json()["detail"]["error"]["message"] == "Service temporairement indisponible"
        db = TestingSessionLocal()
        try:
            evt = (
                db.execute(
                    select(AuditEvent)
                    .where(AuditEvent.action == "FAIL_CLOSED_TRIGGERED")
                    .where(AuditEvent.resource_id == "req-paheko-degraded")
                    .order_by(AuditEvent.timestamp.desc())
                )
                .scalars()
                .first()
            )
            assert evt is not None
            details = json.loads(evt.details or "{}")
            assert details["dependency"] == "paheko"
            assert details["decision"] == "degraded"
            assert details["request_id"] == "req-paheko-degraded"
        finally:
            db.close()
            reset_runtime_state_for_tests()

    def test_paheko_compta_url_200_when_configured(
        self,
        client: TestClient,
        auth_headers: dict,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Avec PAHEKO_PLUGIN_URL : 200 et url = base + /admin/."""
        _set_fake_user_role("admin")
        monkeypatch.setenv("PAHEKO_PLUGIN_URL", "https://paheko.example/plugin/recyclic/push")
        # Recharger les settings pour prendre la nouvelle env
        from api.config.settings import get_settings
        get_settings.cache_clear()
        try:
            r = client.get("/v1/admin/paheko-compta-url", headers=auth_headers)
            assert r.status_code == 200
            data = r.json()
            assert data["url"] == "https://paheko.example/admin/"
        finally:
            get_settings.cache_clear()

    def test_paheko_compta_url_allows_super_admin_role(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("super_admin")
        r = client.get("/v1/admin/paheko-compta-url", headers=auth_headers)
        assert r.status_code in (200, 404)
        assert r.status_code != 403

    def test_paheko_compta_url_allows_admin_role(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("admin")
        r = client.get("/v1/admin/paheko-compta-url", headers=auth_headers)
        assert r.status_code in (200, 404)
        assert r.status_code != 403

    def test_paheko_compta_url_denies_benevole_by_default(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("benevole")
        r = client.get(
            "/v1/admin/paheko-compta-url",
            headers={**auth_headers, "X-Request-Id": "req-paheko-deny-default"},
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "Acces reserve roles autorises"

    def test_paheko_compta_url_allows_benevole_with_active_exception(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("benevole")
        _grant_exception(datetime.now(timezone.utc) + timedelta(minutes=30))
        r = client.get("/v1/admin/paheko-compta-url", headers=auth_headers)
        assert r.status_code in (200, 404)
        assert r.status_code != 403

    def test_paheko_compta_url_allows_benevole_exception_without_admin_permission(
        self,
        client: TestClient,
        auth_headers: dict,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        _set_fake_user_role("benevole")
        _grant_exception(datetime.now(timezone.utc) + timedelta(minutes=30))
        monkeypatch.setattr(core_deps, "get_user_permission_codes_from_user", lambda db, user: set())
        r = client.get("/v1/admin/paheko-compta-url", headers=auth_headers)
        assert r.status_code == 403
        assert r.json()["detail"] == "Insufficient permissions"

    def test_paheko_compta_url_expired_exception_returns_to_deny_default_and_audits(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("benevole")
        _grant_exception(datetime.now(timezone.utc) - timedelta(minutes=5))
        r = client.get(
            "/v1/admin/paheko-compta-url",
            headers={**auth_headers, "X-Request-Id": "req-paheko-expired"},
        )
        assert r.status_code == 403
        db = TestingSessionLocal()
        try:
            evt = (
                db.execute(
                    select(AuditEvent)
                    .where(AuditEvent.action == "paheko_access_decision")
                    .order_by(AuditEvent.timestamp.desc())
                )
                .scalars()
                .first()
            )
            assert evt is not None
            details = json.loads(evt.details or "{}")
            assert details["request_id"] == "req-paheko-expired"
            assert details["decision"] == "deny"
            assert details["reason"] == "deny_by_default_benevole"
        finally:
            db.close()

    def test_paheko_access_decision_exposes_backend_authoritative_signal(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("benevole")
        r = client.get("/v1/admin/paheko-access", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["allowed"] is False
        assert data["reason"] == "deny_by_default_benevole"

    def test_grant_and_revoke_exception_endpoints_are_operable(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("admin")
        benevole = _create_benevole_user()
        now = datetime.now(timezone.utc)
        grant_payload = {
            "user_id": str(benevole.id),
            "requested_by_user_id": str(FAKE_USER_ID),
            "reason": "incident de secours",
            "expires_at": (now + timedelta(hours=2)).isoformat(),
        }
        grant_response = client.post(
            "/v1/admin/paheko-access/exceptions",
            headers={**auth_headers, "X-Request-Id": "req-grant-exception"},
            json=grant_payload,
        )
        assert grant_response.status_code == 201
        grant_data = grant_response.json()
        assert grant_data["user_id"] == str(benevole.id)
        assert grant_data["approved_by_user_id"] == str(FAKE_USER_ID)
        exception_id = grant_data["id"]

        revoke_response = client.post(
            f"/v1/admin/paheko-access/exceptions/{exception_id}/revoke",
            headers={**auth_headers, "X-Request-Id": "req-revoke-exception"},
            json={"revocation_reason": "fin intervention"},
        )
        assert revoke_response.status_code == 200
        revoke_data = revoke_response.json()
        assert revoke_data["id"] == exception_id
        assert revoke_data["revocation_reason"] == "fin intervention"
        assert revoke_data["revoked_by_user_id"] == str(FAKE_USER_ID)

    def test_benevole_with_active_exception_cannot_manage_exceptions(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("benevole")
        _grant_exception(datetime.now(timezone.utc) + timedelta(minutes=30))
        target_benevole = _create_benevole_user()
        payload = {
            "user_id": str(target_benevole.id),
            "requested_by_user_id": str(FAKE_USER_ID),
            "reason": "demande test",
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        }
        response = client.post(
            "/v1/admin/paheko-access/exceptions",
            headers={**auth_headers, "X-Request-Id": "req-deny-benevole-manage-exception"},
            json=payload,
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "Acces reserve roles autorises"

    def test_paheko_access_decision_allows_active_exception_from_database(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("benevole")
        _grant_exception(datetime.now(timezone.utc) + timedelta(minutes=30))
        monkeypatched_codes = lambda db, user: set()
        original = core_deps.get_user_permission_codes_from_user
        core_deps.get_user_permission_codes_from_user = monkeypatched_codes
        try:
            r = client.get("/v1/admin/paheko-access", headers=auth_headers)
            assert r.status_code == 200
            data = r.json()
            assert data["allowed"] is True
            assert data["reason"] == "benevole_exception_active"
        finally:
            core_deps.get_user_permission_codes_from_user = original
