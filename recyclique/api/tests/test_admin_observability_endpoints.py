"""Tests ciblés : routes admin observabilité (journaux) enregistrées via admin_observability."""

import os

import pytest
from fastapi.testclient import TestClient

from recyclic_api.core.config import settings

_V1 = f"{settings.API_V1_STR.rstrip('/')}/admin"


def test_register_admin_observability_importable():
    from recyclic_api.api.api_v1.endpoints.admin_observability import (
        register_admin_observability_routes,
    )

    assert callable(register_admin_observability_routes)


@pytest.mark.parametrize(
    "subpath",
    ["transaction-logs", "audit-log", "email-logs"],
)
def test_observability_endpoints_require_auth(client: TestClient, subpath: str):
    r = client.get(f"{_V1}/{subpath}")
    assert r.status_code in (401, 403), subpath


@pytest.mark.skipif(
    os.environ.get("TEST_DATABASE_URL", "").startswith("sqlite"),
    reason="Table audit_logs non créée sous SQLite (conftest create_all partiel).",
)
def test_audit_log_admin_empty_shape(admin_client: TestClient):
    r = admin_client.get(f"{_V1}/audit-log")
    assert r.status_code == 200
    body = r.json()
    assert "entries" in body
    assert "pagination" in body
    assert "filters_applied" in body
    assert body["pagination"]["page"] == 1
    assert isinstance(body["entries"], list)
