"""Canal sortant bot (ex-Telegram) désactivé par défaut — TELEGRAM_NOTIFICATIONS_ENABLED (sans migration DB)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from recyclic_api.core.config import settings
from recyclic_api.services import sync_service
from recyclic_api.services.sync_service import KDriveSyncService, UploadFailedError
from recyclic_api.services.telegram_service import telegram_service


@pytest.mark.asyncio
async def test_service_no_http_when_channel_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "TELEGRAM_NOTIFICATIONS_ENABLED", False)
    with patch("recyclic_api.services.telegram_service.httpx.AsyncClient") as mock_client:
        r1 = await telegram_service.send_user_approval_notification("1", "user")
        r2 = await telegram_service.send_user_rejection_notification("1", "user")
        r3 = await telegram_service.notify_admins_user_processed("admin", "target", "approved")
        r4 = await telegram_service.notify_sync_failure("f", "r", "err")
    mock_client.assert_not_called()
    assert all((r1, r2, r3, r4))


@pytest.mark.asyncio
async def test_anomaly_alerts_skipped_when_channel_disabled(
    monkeypatch: pytest.MonkeyPatch,
    db_session,
) -> None:
    from recyclic_api.services.anomaly_detection_service import AnomalyDetectionService

    monkeypatch.setattr(settings, "TELEGRAM_NOTIFICATIONS_ENABLED", False)
    svc = AnomalyDetectionService(db_session)
    anomalies = {
        "summary": {"total_anomalies": 1, "critical_anomalies": 0},
        "anomalies": {"cash_anomalies": [{"type": "cash_variance", "severity": "medium"}]},
    }
    with patch("recyclic_api.services.anomaly_detection_service.telegram_service") as mock_ts:
        mock_ts.notify_sync_failure = AsyncMock(return_value=True)
        ok = await svc.send_anomaly_notifications(anomalies)
    assert ok is True
    mock_ts.notify_sync_failure.assert_not_called()


def test_admin_health_test_notifications_returns_disabled(admin_client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "TELEGRAM_NOTIFICATIONS_ENABLED", False)
    url = f"{settings.API_V1_STR.rstrip('/')}/admin/health/test-notifications"
    response = admin_client.post(url)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "disabled"
    assert "TELEGRAM_NOTIFICATIONS_ENABLED" in body["message"]


@pytest.mark.asyncio
async def test_admin_health_test_notifications_when_enabled_invokes_notify(
    admin_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "TELEGRAM_NOTIFICATIONS_ENABLED", True)
    monkeypatch.setattr(settings, "ADMIN_TELEGRAM_IDS", "123")
    url = f"{settings.API_V1_STR.rstrip('/')}/admin/health/test-notifications"
    with patch("recyclic_api.api.api_v1.endpoints.admin.telegram_service") as mock_svc:
        mock_svc.notify_sync_failure = AsyncMock(return_value=True)
        response = admin_client.post(url)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    mock_svc.notify_sync_failure.assert_awaited_once()


def test_sync_failure_does_not_schedule_notify_when_channel_disabled(
    monkeypatch: pytest.MonkeyPatch,
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
    monkeypatch.setattr(settings, "ADMIN_TELEGRAM_IDS", "123")
    monkeypatch.setattr(settings, "TELEGRAM_NOTIFICATIONS_ENABLED", False)

    calls: list[object] = []

    async def fake_notify(*_a, **_kw):
        calls.append(True)
        return True

    monkeypatch.setattr(sync_service.telegram_service, "notify_sync_failure", fake_notify)

    with pytest.raises(UploadFailedError):
        service.upload_file_to_kdrive(local_file, "/exports/failure.csv")

    assert calls == []
