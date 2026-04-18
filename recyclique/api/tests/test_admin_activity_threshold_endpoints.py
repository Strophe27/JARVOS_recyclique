"""Tests ciblés : routes admin seuil d'activité (module admin_activity_threshold)."""

import pytest
from fastapi.testclient import TestClient

from recyclic_api.core.config import settings
from recyclic_api.models.setting import Setting
from recyclic_api.services.activity_service import ActivityService

_V1 = f"{settings.API_V1_STR.rstrip('/')}/admin"
_THRESHOLD_PATH = f"{_V1}/settings/activity-threshold"


def test_register_admin_activity_threshold_importable():
    from recyclic_api.api.api_v1.endpoints.admin_activity_threshold import (
        register_admin_activity_threshold_routes,
    )

    assert callable(register_admin_activity_threshold_routes)


def test_activity_threshold_get_requires_auth(client: TestClient):
    r = client.get(_THRESHOLD_PATH)
    assert r.status_code in (401, 403)


def test_activity_threshold_put_requires_auth(client: TestClient):
    r = client.put(_THRESHOLD_PATH, json={"activity_threshold_minutes": 30})
    assert r.status_code in (401, 403)


def test_activity_threshold_get_default_shape(admin_client: TestClient, db_session):
    db_session.query(Setting).filter(Setting.key == "activity_threshold_minutes").delete()
    db_session.commit()

    r = admin_client.get(_THRESHOLD_PATH)
    assert r.status_code == 200
    body = r.json()
    assert body["activity_threshold_minutes"] == 15
    assert "description" in body
    assert "en ligne" in body["description"]


def test_activity_threshold_put_valid_then_get(admin_client: TestClient, db_session):
    db_session.query(Setting).filter(Setting.key == "activity_threshold_minutes").delete()
    db_session.commit()

    r = admin_client.put(_THRESHOLD_PATH, json={"activity_threshold_minutes": 42})
    assert r.status_code == 200
    body = r.json()
    assert body["activity_threshold_minutes"] == 42
    assert "42" in body["message"]

    assert ActivityService._cached_threshold_minutes == 42

    r2 = admin_client.get(_THRESHOLD_PATH)
    assert r2.status_code == 200
    assert r2.json()["activity_threshold_minutes"] == 42


@pytest.mark.parametrize(
    "payload",
    [
        {"activity_threshold_minutes": 0},
        {"activity_threshold_minutes": 2000},
        {"activity_threshold_minutes": "30"},
        {},
    ],
)
def test_activity_threshold_put_validation_400(admin_client: TestClient, payload):
    r = admin_client.put(_THRESHOLD_PATH, json=payload)
    assert r.status_code == 400
