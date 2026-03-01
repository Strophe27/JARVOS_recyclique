"""Story 17.1 — verrouillage RBAC super_admin phase 1 (health/settings/sites)."""

from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api.core import deps
from api.db import get_db
from api.main import app
from api.models import User
from tests.conftest import override_get_db

PHASE1_ENDPOINTS = (
    "/v1/admin/health",
    "/v1/admin/settings",
    "/v1/sites",
)


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
def role_client() -> Generator[callable, None, None]:
    original_get_codes = deps.get_user_permission_codes_from_user
    app.dependency_overrides[get_db] = override_get_db

    def _factory(role: str):
        user = _build_user(role)

        def _get_current_user() -> User:
            return user

        deps.get_user_permission_codes_from_user = lambda db, current_user: {"admin"}
        app.dependency_overrides[deps.get_current_user] = _get_current_user
        return TestClient(app)

    try:
        yield _factory
    finally:
        app.dependency_overrides.clear()
        deps.get_user_permission_codes_from_user = original_get_codes


@pytest.mark.parametrize("endpoint", PHASE1_ENDPOINTS)
def test_phase1_super_admin_authorized(role_client, endpoint: str) -> None:
    with role_client("super_admin") as client:
        response = client.get(endpoint)
    assert response.status_code == 200


@pytest.mark.parametrize("endpoint", PHASE1_ENDPOINTS)
def test_phase1_admin_non_super_admin_forbidden(role_client, endpoint: str) -> None:
    with role_client("admin") as client:
        response = client.get(endpoint)
    assert response.status_code == 403
    assert response.json()["detail"] == "Insufficient permissions"


@pytest.mark.parametrize("endpoint", PHASE1_ENDPOINTS)
def test_phase1_unauthenticated_rejected(auth_client: TestClient, endpoint: str) -> None:
    response = auth_client.get(endpoint)
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"
