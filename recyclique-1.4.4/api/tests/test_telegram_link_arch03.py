"""ARCH-03 : TelegramLinkService sans HTTPException ; mapping route pour link-telegram."""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import AuthenticationError, ConflictError
from recyclic_api.services.telegram_link_service import TelegramLinkService

_V1 = settings.API_V1_STR.rstrip("/")


def test_link_telegram_raises_authentication_error_when_invalid_credentials():
    db = MagicMock()
    service = TelegramLinkService(db)
    with patch.object(service, "authenticate_user", return_value=None):
        with pytest.raises(AuthenticationError, match="Identifiants invalides"):
            service.link_telegram_account("user", "wrong", "telegram-1")


def test_link_telegram_raises_conflict_when_telegram_id_used_elsewhere():
    user = MagicMock()
    user.id = uuid4()
    db = MagicMock()
    service = TelegramLinkService(db)
    with patch.object(service, "authenticate_user", return_value=user):
        with patch.object(service, "check_telegram_id_conflict", return_value=True):
            with pytest.raises(ConflictError, match="déjà lié"):
                service.link_telegram_account("user", "ok", "dup-id")


def test_link_telegram_route_maps_authentication_error_to_401(client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.users.TelegramLinkService"
    ) as mock_cls:
        mock_cls.return_value.link_telegram_account.side_effect = AuthenticationError(
            "Identifiants invalides"
        )
        response = client.post(
            f"{_V1}/users/link-telegram",
            json={
                "username": "x",
                "password": "y",
                "telegram_id": "z",
            },
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Identifiants invalides"


def test_link_telegram_route_maps_conflict_error_to_409(client):
    detail = "Ce Telegram ID est déjà lié à un autre compte"
    with patch(
        "recyclic_api.api.api_v1.endpoints.users.TelegramLinkService"
    ) as mock_cls:
        mock_cls.return_value.link_telegram_account.side_effect = ConflictError(detail)
        response = client.post(
            f"{_V1}/users/link-telegram",
            json={
                "username": "x",
                "password": "y",
                "telegram_id": "z",
            },
        )

    assert response.status_code == 409
    assert response.json()["detail"] == detail


def test_link_telegram_route_success_returns_message(client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.users.TelegramLinkService"
    ) as mock_cls:
        mock_cls.return_value.link_telegram_account.return_value = (
            True,
            "Compte Telegram lié avec succès",
        )
        response = client.post(
            f"{_V1}/users/link-telegram",
            json={
                "username": "x",
                "password": "y",
                "telegram_id": "z",
            },
        )

    assert response.status_code == 200
    assert response.json()["message"] == "Compte Telegram lié avec succès"
