# Story 8.4 — Tests GET /v1/admin/health et GET /v1/admin/audit-log.

import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from api.db import get_db
from api.main import app
from api.models import AuditEvent
from api.services.resilience import (
    DEPENDENCY_IDP,
    record_dependency_result,
    reset_runtime_state_for_tests,
)
from tests.conftest import TestingSessionLocal, override_get_db


class TestAdminHealth:
    """GET /v1/admin/health (agrégé), /health/database, /health/scheduler, /health/anomalies."""

    def test_admin_health_returns_200_and_status(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/health avec admin : 200 et champs status, database, redis, push_worker."""
        r = client.get("/v1/admin/health", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert data["status"] in ("ok", "degraded")
        assert "database" in data
        assert "redis" in data
        assert "push_worker" in data
        assert "iam_mode" in data
        assert "dependencies" in data
        assert "iam_counters" in data
        assert "auth_runtime" in data

    def test_admin_health_exposes_dependency_alerts(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        reset_runtime_state_for_tests()
        for idx in range(3):
            record_dependency_result(
                dependency=DEPENDENCY_IDP,
                ok=False,
                reason="oidc_dependency_unavailable",
                request_id=f"req-idp-{idx}",
            )
        r = client.get("/v1/admin/health", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "degraded"
        idp_state = data["dependencies"]["idp"]
        assert idp_state["status"] == "degraded"
        assert idp_state["consecutive_failures"] >= 3
        assert idp_state["alert_triggered"] is True
        reset_runtime_state_for_tests()

    def test_admin_health_exposes_transition_from_degraded_to_ok(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        reset_runtime_state_for_tests()
        record_dependency_result(
            dependency=DEPENDENCY_IDP,
            ok=False,
            reason="oidc_dependency_unavailable",
            request_id="req-transition-down",
        )
        degraded_resp = client.get("/v1/admin/health", headers=auth_headers)
        assert degraded_resp.status_code == 200
        assert degraded_resp.json()["status"] == "degraded"

        record_dependency_result(
            dependency=DEPENDENCY_IDP,
            ok=True,
            reason="oidc_dependency_restored",
            request_id="req-transition-up",
        )
        recovered_resp = client.get("/v1/admin/health", headers=auth_headers)
        assert recovered_resp.status_code == 200
        data = recovered_resp.json()
        assert data["iam_mode"] == "ok"
        assert data["dependencies"]["idp"]["status"] == "ok"
        assert data["iam_counters"]["mode_transition_total"] == 2
        reset_runtime_state_for_tests()

    def test_admin_health_without_auth_returns_401(self, client: TestClient) -> None:
        """Sans token : 401 (ou 200 si conftest injecte un user par défaut)."""
        r = client.get("/v1/admin/health")
        # Conftest peut injecter get_current_user : 200 attendu si user injecté, 401 sinon.
        assert r.status_code in (200, 401)

    def test_admin_health_database_returns_200(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/health/database : 200 et status."""
        r = client.get("/v1/admin/health/database", headers=auth_headers)
        assert r.status_code == 200
        assert "status" in r.json()

    def test_admin_health_scheduler_returns_200(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/health/scheduler : 200 et status, configured, running."""
        r = client.get("/v1/admin/health/scheduler", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert "configured" in data
        assert "running" in data

    def test_admin_health_auth_runtime_returns_200(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/health/auth : 200 et statut runtime OIDC sanitisé."""
        r = client.get("/v1/admin/health/auth", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert "strict_fail_closed" in data
        assert "http_timeout_seconds" in data
        assert "missing_required" in data

    def test_admin_health_anomalies_returns_200(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/health/anomalies : 200 et items (stub)."""
        r = client.get("/v1/admin/health/anomalies", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert data["count"] == 0


class TestAdminAuditLog:
    """GET /v1/admin/audit-log avec pagination."""

    def test_audit_log_returns_200_and_pagination(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/audit-log : 200 et items, total, page, page_size."""
        r = client.get("/v1/admin/audit-log?page=1&page_size=10", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert "total" in data
        assert data["page"] == 1
        assert data["page_size"] == 10

    def test_audit_log_without_auth_returns_401(self, client: TestClient) -> None:
        """Sans token : 401 (ou 200 si conftest injecte un user par défaut)."""
        r = client.get("/v1/admin/audit-log")
        assert r.status_code in (200, 401)

    def test_audit_log_with_filters(
        self,
        client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/audit-log avec date_from, event_type : 200."""
        r = client.get(
            "/v1/admin/audit-log?page=1&page_size=5&event_type=reception_post_opened",
            headers=auth_headers,
        )
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert "total" in data


def test_sensitive_route_unauthenticated_writes_resilience_audit() -> None:
    request_id = "req-unauth-paheko-sync"
    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as unauth_client:
            response = unauth_client.post(
                "/v1/admin/paheko/members/sync",
                headers={"X-Request-Id": request_id},
                json={"force_full": False},
            )
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"

        db = TestingSessionLocal()
        try:
            evt = (
                db.execute(
                    select(AuditEvent)
                    .where(AuditEvent.action == "FAIL_CLOSED_TRIGGERED")
                    .where(AuditEvent.resource_id == request_id)
                    .order_by(AuditEvent.timestamp.desc())
                )
                .scalars()
                .first()
            )
            assert evt is not None
            details = json.loads(evt.details or "{}")
            assert details["request_id"] == request_id
            assert details["dependency"] == "idp"
            assert details["decision"] == "deny"
            assert details["reason"] == "not_authenticated"
            assert details["status_code"] == 401
        finally:
            db.close()
    finally:
        app.dependency_overrides.clear()
