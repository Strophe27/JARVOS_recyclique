"""Story 17.6 — tests API /v1/admin/settings (persistance, 401, 403)."""

from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from api.core import deps
from api.db import get_db
from api.main import app
from api.models import User
from api.tests.conftest import override_get_db

SETTINGS_URL = "/v1/admin/settings"


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


def test_settings_put_then_get_nominal(role_client) -> None:
    """Parcours nominal : super_admin PUT puis GET, valeurs identiques."""
    body = {
        "activity_threshold": 42.5,
        "alert_thresholds": {"low": 10},
        "session": {"timeout": 3600},
        "email": {"smtp_host": "test.example.com"},
    }
    with role_client("super_admin") as client:
        put_res = client.put(SETTINGS_URL, json=body)
        assert put_res.status_code == 200
        put_data = put_res.json()
        assert put_data["activity_threshold"] == 42.5
        assert put_data["alert_thresholds"] == {"low": 10}
        assert put_data["session"] == {"timeout": 3600}
        assert put_data["email"] == {"smtp_host": "test.example.com"}
        assert "stub" not in str(put_data).lower()

        get_res = client.get(SETTINGS_URL)
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["activity_threshold"] == put_data["activity_threshold"]
        assert get_data["alert_thresholds"] == put_data["alert_thresholds"]
        assert get_data["session"] == put_data["session"]
        assert get_data["email"] == put_data["email"]


def test_settings_get_structure(role_client) -> None:
    """GET retourne la structure attendue (alert_thresholds, session, email, activity_threshold)."""
    with role_client("super_admin") as client:
        res = client.get(SETTINGS_URL)
    assert res.status_code == 200
    data = res.json()
    assert "alert_thresholds" in data
    assert "session" in data
    assert "email" in data
    assert "activity_threshold" in data
    assert "stub" not in str(data).lower()


def test_settings_unauthenticated_401(auth_client: TestClient) -> None:
    """401 si non authentifié."""
    res = auth_client.get(SETTINGS_URL)
    assert res.status_code == 401
    assert res.json()["detail"] == "Not authenticated"

    res_put = auth_client.put(SETTINGS_URL, json={"activity_threshold": 1.0})
    assert res_put.status_code == 401


def test_settings_admin_forbidden_403(role_client) -> None:
    """403 si rôle admin (non super_admin)."""
    with role_client("admin") as client:
        res_get = client.get(SETTINGS_URL)
        assert res_get.status_code == 403
        assert res_get.json()["detail"] == "Insufficient permissions"

        res_put = client.put(SETTINGS_URL, json={"activity_threshold": 1.0})
        assert res_put.status_code == 403


def test_settings_get_empty_db_defaults(role_client) -> None:
    """GET sur BDD vide retourne valeurs par defaut sans 500."""
    with role_client("super_admin") as client:
        res = client.get(SETTINGS_URL)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data.get("alert_thresholds"), dict)
    assert isinstance(data.get("session"), dict)
    assert isinstance(data.get("email"), dict)
