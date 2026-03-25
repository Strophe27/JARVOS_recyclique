"""Tests ciblés pour les endpoints admin santé / probes (admin_health)."""

from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from recyclic_api.core.config import settings

_V1 = f"{settings.API_V1_STR.rstrip('/')}/admin"


def test_admin_health_public_no_auth(client: TestClient):
    r = client.get(f"{_V1}/health/public")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert data["service"] == "recyclic-api"
    assert "timestamp" in data


def test_admin_health_database_no_auth(client: TestClient):
    r = client.get(f"{_V1}/health/database")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] in ("healthy", "unhealthy")
    assert "timestamp" in data
    assert "database" in data


def test_admin_health_test_no_auth(client: TestClient):
    r = client.get(f"{_V1}/health-test")
    assert r.status_code == 200
    assert r.json() == {"message": "Admin endpoint accessible"}


def test_admin_system_health_uses_anomaly_service(admin_client: TestClient):
    fake_anomalies = {
        "summary": {
            "total_anomalies": 0,
            "critical_anomalies": 0,
        },
        "anomalies": [],
        "recommendations": [],
        "timestamp": "2025-01-01T00:00:00",
    }
    mock_svc = MagicMock()
    mock_svc.run_anomaly_detection = AsyncMock(return_value=fake_anomalies)

    with patch(
        "recyclic_api.services.anomaly_detection_service.get_anomaly_detection_service",
        return_value=mock_svc,
    ), patch(
        "recyclic_api.services.scheduler_service.get_scheduler_service",
        return_value=MagicMock(
            get_status=MagicMock(
                return_value={"running": True, "total_tasks": 3}
            )
        ),
    ):
        r = admin_client.get(f"{_V1}/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "success"
    assert body["system_health"]["overall_status"] == "healthy"
    assert body["system_health"]["scheduler_running"] is True


def test_admin_health_anomalies_mocked(admin_client: TestClient):
    fake = {
        "anomalies": [{"id": "a1"}],
        "summary": {"total_anomalies": 1, "critical_anomalies": 0},
        "timestamp": "2025-01-01T00:00:00",
    }
    mock_svc = MagicMock()
    mock_svc.run_anomaly_detection = AsyncMock(return_value=fake)

    with patch(
        "recyclic_api.services.anomaly_detection_service.get_anomaly_detection_service",
        return_value=mock_svc,
    ):
        r = admin_client.get(f"{_V1}/health/anomalies")
    assert r.status_code == 200
    assert r.json()["status"] == "success"
    assert len(r.json()["anomalies"]) == 1


def test_admin_health_scheduler_mocked(admin_client: TestClient):
    with patch(
        "recyclic_api.services.scheduler_service.get_scheduler_service",
        return_value=MagicMock(
            get_status=MagicMock(return_value={"running": False, "jobs": []})
        ),
    ):
        r = admin_client.get(f"{_V1}/health/scheduler")
    assert r.status_code == 200
    assert r.json()["status"] == "success"
    assert r.json()["scheduler"]["running"] is False
