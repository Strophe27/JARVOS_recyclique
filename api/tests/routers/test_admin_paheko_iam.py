import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from api.models import AuditEvent, User
from api.routers.v1.admin import paheko_iam as paheko_iam_router
from api.services.paheko_iam_plugin import (
    PahekoIamPluginBusinessError,
    PahekoIamPluginDependencyError,
    PahekoIamPluginResult,
)
from tests.conftest import FAKE_SITE_ID, FAKE_USER_ID, TestingSessionLocal


def _set_fake_user_role(role: str) -> None:
    db = TestingSessionLocal()
    try:
        user = db.execute(select(User).where(User.id == FAKE_USER_ID)).scalars().one()
        user.role = role
        db.commit()
    finally:
        db.close()


class TestPahekoIamContract:
    def test_contract_exposes_version_and_error_codes(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("admin")
        resp = client.get("/v1/admin/paheko/iam/contract", headers=auth_headers)
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["contract_version"] == "2026-02-28"
        assert "paheko_iam_dependency_unavailable" in payload["error_codes"]
        assert "POST /v1/admin/paheko/iam/groups" in payload["endpoints"]
        assert "POST /v1/admin/paheko/iam/permissions" in payload["endpoints"]
        assert "POST /v1/admin/paheko/iam/users/groups/grant" in payload["endpoints"]


class TestPahekoIamGuards:
    def test_groups_list_denies_tenant_mismatch(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        _set_fake_user_role("admin")
        resp = client.post(
            "/v1/admin/paheko/iam/groups",
            headers=auth_headers,
            json={"tenant": "tenant-unknown"},
        )
        assert resp.status_code == 403
        assert resp.json()["detail"] == "tenant_scope_mismatch"

    def test_groups_list_calls_plugin_when_tenant_matches_scope(
        self,
        client: TestClient,
        auth_headers: dict,
        monkeypatch,
    ) -> None:
        _set_fake_user_role("admin")

        def fake_request(self, *, method, path, request_id, idempotency_key=None, payload=None, params=None):
            assert method == "POST"
            assert path == "/groups/list"
            assert payload["tenant"] == str(FAKE_SITE_ID)
            return PahekoIamPluginResult(
                data=[{"code": "iam-admin", "label": "Admins"}],
                status_code=200,
            )

        monkeypatch.setattr(paheko_iam_router.PahekoIamPluginService, "request", fake_request)
        resp = client.post(
            "/v1/admin/paheko/iam/groups",
            headers={**auth_headers, "X-Request-Id": "req-paheko-iam-groups"},
            json={"tenant": str(FAKE_SITE_ID)},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["request_id"] == "req-paheko-iam-groups"
        assert body["contract_version"] == "2026-02-28"
        assert body["data"][0]["code"] == "iam-admin"

    def test_group_grant_uses_idempotency_key_priority(
        self,
        client: TestClient,
        auth_headers: dict,
        monkeypatch,
    ) -> None:
        _set_fake_user_role("admin")
        captured = {"idempotency_key": None}

        def fake_request(self, *, method, path, request_id, idempotency_key=None, payload=None, params=None):
            captured["idempotency_key"] = idempotency_key
            assert payload["idempotency_key"] == "idem-header-123"
            return PahekoIamPluginResult(
                data={"result": "granted"},
                status_code=200,
            )

        monkeypatch.setattr(paheko_iam_router.PahekoIamPluginService, "request", fake_request)
        resp = client.post(
            "/v1/admin/paheko/iam/users/groups/grant",
            headers={
                **auth_headers,
                "X-Request-Id": "req-idem",
                "X-Idempotency-Key": "idem-header-123",
            },
            json={
                "tenant": str(FAKE_SITE_ID),
                "user_id": str(uuid4()),
                "group_code": "iam-admin",
                "idempotency_key": "idem-body-should-not-win",
            },
        )
        assert resp.status_code == 200
        assert captured["idempotency_key"] == "idem-header-123"

    def test_exception_grant_calls_plugin_with_expected_payload(
        self,
        client: TestClient,
        auth_headers: dict,
        monkeypatch,
    ) -> None:
        _set_fake_user_role("admin")
        captured = {"path": None, "payload": None}

        def fake_request(self, *, method, path, request_id, idempotency_key=None, payload=None, params=None):
            captured["path"] = path
            captured["payload"] = payload
            return PahekoIamPluginResult(
                data={"result": "exception_granted"},
                status_code=200,
            )

        monkeypatch.setattr(paheko_iam_router.PahekoIamPluginService, "request", fake_request)
        user_id = str(uuid4())
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        resp = client.post(
            "/v1/admin/paheko/iam/exceptions/grant",
            headers={**auth_headers, "X-Request-Id": "req-exception-grant"},
            json={
                "tenant": str(FAKE_SITE_ID),
                "user_id": user_id,
                "scope": "paheko.iam",
                "expires_at": expires_at,
                "reason": "incident_window",
            },
        )
        assert resp.status_code == 200
        assert captured["path"] == "/exceptions/grant"
        assert captured["payload"]["tenant"] == str(FAKE_SITE_ID)
        assert captured["payload"]["user_id"] == user_id
        assert captured["payload"]["scope"] == "paheko.iam"

    def test_exception_revoke_uses_explicit_exception_id_contract(
        self,
        client: TestClient,
        auth_headers: dict,
        monkeypatch,
    ) -> None:
        _set_fake_user_role("admin")
        captured = {"path": None, "payload": None}

        def fake_request(self, *, method, path, request_id, idempotency_key=None, payload=None, params=None):
            captured["path"] = path
            captured["payload"] = payload
            return PahekoIamPluginResult(
                data={"result": "exception_revoked"},
                status_code=200,
            )

        monkeypatch.setattr(paheko_iam_router.PahekoIamPluginService, "request", fake_request)
        exception_id = str(uuid4())
        resp = client.post(
            "/v1/admin/paheko/iam/exceptions/revoke",
            headers={**auth_headers, "X-Request-Id": "req-exception-revoke"},
            json={
                "tenant": str(FAKE_SITE_ID),
                "exception_id": exception_id,
                "reason": "incident_closed",
            },
        )
        assert resp.status_code == 200
        assert captured["path"] == "/exceptions/revoke"
        assert captured["payload"]["exception_id"] == exception_id
        assert "user_id" not in captured["payload"]
        assert "scope" not in captured["payload"]


class TestPahekoIamResilienceAndAudit:
    def test_dependency_unavailable_returns_503_and_audits(
        self,
        client: TestClient,
        auth_headers: dict,
        monkeypatch,
    ) -> None:
        _set_fake_user_role("admin")

        def fake_request(self, *, method, path, request_id, idempotency_key=None, payload=None, params=None):
            raise PahekoIamPluginDependencyError("paheko_iam_dependency_unavailable")

        monkeypatch.setattr(paheko_iam_router.PahekoIamPluginService, "request", fake_request)
        resp = client.post(
            "/v1/admin/paheko/iam/groups",
            headers={**auth_headers, "X-Request-Id": "req-paheko-iam-503"},
            json={"tenant": str(FAKE_SITE_ID)},
        )
        assert resp.status_code == 503
        assert resp.json()["detail"]["error"]["code"] == "paheko_iam_dependency_unavailable"
        assert resp.json()["detail"]["error"]["message"] == "Service temporairement indisponible"

        db = TestingSessionLocal()
        try:
            events = (
                db.execute(
                    select(AuditEvent)
                    .where(AuditEvent.resource_id == "req-paheko-iam-503")
                    .order_by(AuditEvent.timestamp.desc())
                )
                .scalars()
                .all()
            )
            assert len(events) >= 2
            resilience_evt = next(evt for evt in events if evt.action == "FAIL_CLOSED_TRIGGERED")
            plugin_evt = next(evt for evt in events if evt.action == "PAHEKO_IAM_PLUGIN_DECISION")
            resilience_details = json.loads(resilience_evt.details or "{}")
            plugin_details = json.loads(plugin_evt.details or "{}")
            assert resilience_details["dependency"] == "paheko"
            assert resilience_details["decision"] == "degraded"
            assert plugin_details["decision"] == "deny"
            assert plugin_details["reason"] == "paheko_iam_dependency_unavailable"
            assert plugin_details["request_id"] == "req-paheko-iam-503"
            assert plugin_details["tenant"] == str(FAKE_SITE_ID)
            assert plugin_details["role"] == "admin"
        finally:
            db.close()

    def test_business_error_returns_structured_error_envelope(
        self,
        client: TestClient,
        auth_headers: dict,
        monkeypatch,
    ) -> None:
        _set_fake_user_role("admin")

        def fake_request(self, *, method, path, request_id, idempotency_key=None, payload=None, params=None):
            raise PahekoIamPluginBusinessError(
                status_code=409,
                code="group_assignment_conflict",
                message="assignment_already_exists",
            )

        monkeypatch.setattr(paheko_iam_router.PahekoIamPluginService, "request", fake_request)
        resp = client.post(
            "/v1/admin/paheko/iam/users/groups/grant",
            headers={**auth_headers, "X-Request-Id": "req-paheko-iam-409"},
            json={
                "tenant": str(FAKE_SITE_ID),
                "user_id": str(uuid4()),
                "group_code": "iam-admin",
                "reason": "replay",
                "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            },
        )
        assert resp.status_code == 409
        error = resp.json()["detail"]["error"]
        assert error["code"] == "group_assignment_conflict"
        assert error["message"] == "assignment_already_exists"

    def test_sync_drift_returns_structured_error_for_rights_coherence(
        self,
        client: TestClient,
        auth_headers: dict,
        monkeypatch,
    ) -> None:
        _set_fake_user_role("admin")
        subject_user_id = str(uuid4())

        def fake_request(self, *, method, path, request_id, idempotency_key=None, payload=None, params=None):
            raise PahekoIamPluginBusinessError(
                status_code=409,
                code="rights_sync_drift_detected",
                message="reconciliation_required",
            )

        monkeypatch.setattr(paheko_iam_router.PahekoIamPluginService, "request", fake_request)
        resp = client.post(
            f"/v1/admin/paheko/iam/users/{subject_user_id}/groups",
            headers={**auth_headers, "X-Request-Id": "req-sync-drift-409"},
            json={"tenant": str(FAKE_SITE_ID)},
        )
        assert resp.status_code == 409
        error = resp.json()["detail"]["error"]
        assert error["code"] == "rights_sync_drift_detected"
        assert error["message"] == "reconciliation_required"
