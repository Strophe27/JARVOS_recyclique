"""ARCH-03 : TelegramLinkService — liaison désactivée ; route link-telegram → 410."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import TelegramLinkDisabledError
from recyclic_api.services.telegram_link_service import (
    TELEGRAM_LINK_DISABLED_DETAIL,
    TelegramLinkService,
)

_V1 = settings.API_V1_STR.rstrip("/")


def test_link_telegram_account_raises_telegram_link_disabled():
    db = MagicMock()
    service = TelegramLinkService(db)
    with pytest.raises(TelegramLinkDisabledError) as exc_info:
        service.link_telegram_account("user", "pass", "telegram-1")
    assert exc_info.value.detail == TELEGRAM_LINK_DISABLED_DETAIL


def test_link_telegram_route_returns_410(client):
    response = client.post(
        f"{_V1}/users/link-telegram",
        json={
            "username": "x",
            "password": "y",
            "telegram_id": "z",
        },
    )

    assert response.status_code == 410
    assert response.json()["detail"] == TELEGRAM_LINK_DISABLED_DETAIL
