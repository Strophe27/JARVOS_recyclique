# Story 17.8 — Tests GET /v1/admin/email-logs.

from collections.abc import Generator
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api.core import deps
from api.db import get_db
from api.main import app
from api.models import EmailLog, User
from tests.conftest import TestingSessionLocal, override_get_db


def _build_user(role: str) -> User:
    return User(
        id=uuid4(),
        username=f"{role}-user-{uuid4().hex[:8]}",
        email=f"{role}-{uuid4().hex[:8]}@test.local",
        password_hash="hash",
        role=role,
        status="active",
    )


@pytest.fixture
def admin_client() -> Generator[TestClient, None, None]:
    """Client avec user admin mock (ne depend pas de la BDD)."""
    original_get_codes = deps.get_user_permission_codes_from_user
    app.dependency_overrides[get_db] = override_get_db

    def _get_current_user() -> User:
        return _build_user("admin")

    deps.get_user_permission_codes_from_user = lambda db, u: {"admin"}
    app.dependency_overrides[deps.get_current_user] = _get_current_user

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    deps.get_user_permission_codes_from_user = original_get_codes


class TestAdminEmailLogs:
    """GET /v1/admin/email-logs — pagination, filtres, 401."""

    def test_email_logs_returns_200_and_pagination(
        self,
        admin_client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/email-logs : 200 et items, total, page, page_size."""
        r = admin_client.get("/v1/admin/email-logs?page=1&page_size=10", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert "total" in data
        assert data["page"] == 1
        assert data["page_size"] == 10

    def test_email_logs_without_auth_returns_401(
        self,
        auth_client: TestClient,
    ) -> None:
        """Sans token : 401."""
        r = auth_client.get("/v1/admin/email-logs")
        assert r.status_code == 401

    def test_email_logs_with_filters(
        self,
        admin_client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/email-logs avec date_from, recipient, status : 200."""
        r = admin_client.get(
            "/v1/admin/email-logs?page=1&page_size=5&status=sent",
            headers=auth_headers,
        )
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert "total" in data

    def test_email_logs_list_non_empty_with_fixture(
        self,
        admin_client: TestClient,
        auth_headers: dict,
    ) -> None:
        """GET /v1/admin/email-logs : liste non vide avec fixture."""
        db = TestingSessionLocal()
        try:
            for i in range(2):
                entry = EmailLog(
                    recipient=f"fixture{i}@test.local",
                    subject="Test fixture",
                    status="sent",
                    event_type="test",
                )
                entry.sent_at = datetime.now(timezone.utc)
                db.add(entry)
            db.commit()
        finally:
            db.close()

        r = admin_client.get("/v1/admin/email-logs?page=1&page_size=20", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 2
        assert len(data["items"]) >= 2
        for item in data["items"]:
            assert "id" in item
            assert "sent_at" in item
            assert "recipient" in item
            assert "subject" in item
            assert "status" in item
