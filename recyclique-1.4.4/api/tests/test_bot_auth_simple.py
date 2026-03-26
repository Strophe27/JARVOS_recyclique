"""
Contrôle du jeton bot (X-Bot-Token) sur les routes qui l'exigent encore.

``POST .../deposits/from-bot`` ne valide plus le jeton (410 Gone sans auth).
La finalisation ``PUT .../deposits/{id}`` conserve la validation bot.
"""

import pytest
from unittest.mock import patch

from recyclic_api.core.config import settings
from recyclic_api.models.deposit import Deposit, DepositStatus, EEECategory
from recyclic_api.models.user import UserStatus
from tests.factories import UserFactory

TEST_BOT_TOKEN = "test_bot_token_123"
_V1 = settings.API_V1_STR.rstrip("/")


def _classified_deposit_id(db_session) -> str:
    user = UserFactory(status=UserStatus.APPROVED)
    db_session.add(user)
    db_session.flush()
    deposit = Deposit(
        user_id=user.id,
        telegram_user_id="bot_auth_test",
        audio_file_path="/audio/bot_auth.ogg",
        status=DepositStatus.CLASSIFIED,
        category=EEECategory.OTHER,
        eee_category=EEECategory.OTHER,
        transcription="test",
        confidence_score=0.5,
        ai_confidence=0.5,
        ai_classification="test reasoning",
    )
    db_session.add(deposit)
    db_session.commit()
    db_session.refresh(deposit)
    return str(deposit.id)


def test_bot_auth_missing_token(client, db_session):
    deposit_id = _classified_deposit_id(db_session)
    response = client.put(
        f"{_V1}/deposits/{deposit_id}",
        json={"validated": True, "correction_applied": False},
    )
    assert response.status_code == 401
    assert "Missing X-Bot-Token header" in response.json()["detail"]


def test_bot_auth_with_configured_token(client, db_session):
    deposit_id = _classified_deposit_id(db_session)
    with patch("recyclic_api.core.config.settings.TELEGRAM_BOT_TOKEN", TEST_BOT_TOKEN):
        headers = {"X-Bot-Token": TEST_BOT_TOKEN, "Content-Type": "application/json"}
        response = client.put(
            f"{_V1}/deposits/{deposit_id}",
            json={"validated": True, "correction_applied": False},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "completed"


def test_bot_auth_invalid_token(client, db_session):
    deposit_id = _classified_deposit_id(db_session)
    with patch("recyclic_api.core.config.settings.TELEGRAM_BOT_TOKEN", TEST_BOT_TOKEN):
        headers = {"X-Bot-Token": "wrong_token", "Content-Type": "application/json"}
        response = client.put(
            f"{_V1}/deposits/{deposit_id}",
            json={"validated": True, "correction_applied": False},
            headers=headers,
        )
        assert response.status_code == 401
        assert "Invalid bot token" in response.json()["detail"]


def test_bot_auth_no_token_configured(client, db_session):
    deposit_id = _classified_deposit_id(db_session)
    with patch("recyclic_api.core.config.settings.TELEGRAM_BOT_TOKEN", None):
        headers = {"X-Bot-Token": "any_token", "Content-Type": "application/json"}
        response = client.put(
            f"{_V1}/deposits/{deposit_id}",
            json={"validated": True, "correction_applied": False},
            headers=headers,
        )
        assert response.status_code == 503
        assert "Bot token not configured on server" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__])
