"""Ancien canal sortant bot / Telegram : retiré côté API (sync / anomalies / admin test)."""

from __future__ import annotations

import logging

import pytest

from recyclic_api.core.config import settings
from recyclic_api.services.sync_service import KDriveSyncService, UploadFailedError


@pytest.mark.asyncio
async def test_anomaly_alerts_logs_only_no_external_channel(
    db_session,
    caplog: pytest.LogCaptureFixture,
) -> None:
    from recyclic_api.services.anomaly_detection_service import AnomalyDetectionService

    caplog.set_level(logging.WARNING)
    svc = AnomalyDetectionService(db_session)
    anomalies = {
        "summary": {"total_anomalies": 1, "critical_anomalies": 0},
        "anomalies": {"cash_anomalies": [{"type": "cash_variance", "severity": "medium"}]},
    }
    ok = await svc.send_anomaly_notifications(anomalies)
    assert ok is True
    assert any("pas de canal de notification sortant" in r.message for r in caplog.records)


def test_admin_health_test_notifications_unavailable(admin_client) -> None:
    """Le flux admin ne déclenche plus d'envoi."""
    url = f"{settings.API_V1_STR.rstrip('/')}/admin/health/test-notifications"
    response = admin_client.post(url)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "unavailable"
    assert "Telegram" in body["message"]


def test_sync_failure_logs_warning_no_task(
    caplog: pytest.LogCaptureFixture,
    tmp_path,
) -> None:
    local_file = tmp_path / "failure.csv"
    local_file.write_text("ko", encoding="utf-8")

    class _FailClient:
        def upload_sync(self, *args, **kwargs):
            raise RuntimeError("simulated upload failure")

        def check(self, path: str) -> bool:
            return path.rstrip("/") in {"", "/exports"}

        def mkdir(self, path: str) -> None:
            pass

    def _factory():
        return _FailClient()

    service = KDriveSyncService(client_factory=_factory, max_retries=1, retry_delay_seconds=0)
    caplog.set_level(logging.WARNING)

    with pytest.raises(UploadFailedError):
        service.upload_file_to_kdrive(local_file, "/exports/failure.csv")

    assert any("no external alert channel" in r.message for r in caplog.records)
