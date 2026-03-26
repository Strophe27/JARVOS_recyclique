"""
Tests des endpoints historiques bot — création / classification dépôt (410 Gone).

Le flux Telegram est retiré ; le contrat HTTP reste documenté (OpenAPI) avec 410 stable.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from recyclic_api.main import app
from recyclic_api.core.bot_auth import TELEGRAM_DEPOSIT_BOT_DISABLED_DETAIL
from recyclic_api.core.config import settings

TEST_BOT_TOKEN = "test_bot_token_123"
_FROM_BOT = f"{settings.API_V1_STR.rstrip('/')}/deposits/from-bot"


@pytest.fixture
def mock_bot_token():
    with patch("recyclic_api.core.config.settings.TELEGRAM_BOT_TOKEN", TEST_BOT_TOKEN):
        yield TEST_BOT_TOKEN


@pytest.fixture
def client_with_mock_token(mock_bot_token):
    return TestClient(app)


class TestDepositBotEndpointsRetired:
    """POST from-bot et POST classify → 410 ; pas d'écriture DB pour from-bot."""

    def test_create_deposit_from_bot_returns_410_stable_detail(self, client_with_mock_token):
        payload = {
            "telegram_user_id": "12345",
            "audio_file_path": "/audio/test_deposit.ogg",
            "status": "pending_audio",
        }
        headers = {
            "X-Bot-Token": TEST_BOT_TOKEN,
            "Content-Type": "application/json",
        }

        response = client_with_mock_token.post(_FROM_BOT, json=payload, headers=headers)

        assert response.status_code == 410
        assert response.json()["detail"] == TELEGRAM_DEPOSIT_BOT_DISABLED_DETAIL

    def test_create_deposit_from_bot_410_without_bot_token(self, client_with_mock_token):
        """Plus de contrôle X-Bot-Token sur cette route : 410 direct."""
        payload = {
            "telegram_user_id": "12345",
            "audio_file_path": "/audio/test_deposit.ogg",
            "status": "pending_audio",
        }
        response = client_with_mock_token.post(_FROM_BOT, json=payload)
        assert response.status_code == 410
        assert response.json()["detail"] == TELEGRAM_DEPOSIT_BOT_DISABLED_DETAIL

    def test_create_deposit_from_bot_validation_error_missing_fields(self, client_with_mock_token):
        response = client_with_mock_token.post(_FROM_BOT, json={})
        assert response.status_code == 422
        assert "detail" in response.json()

    def test_classify_deposit_returns_410(self, client_with_mock_token):
        uid = "11111111-1111-1111-1111-111111111111"
        headers = {"X-Bot-Token": TEST_BOT_TOKEN, "Content-Type": "application/json"}
        response = client_with_mock_token.post(
            f"{settings.API_V1_STR.rstrip('/')}/deposits/{uid}/classify",
            headers=headers,
        )
        assert response.status_code == 410
        assert response.json()["detail"] == TELEGRAM_DEPOSIT_BOT_DISABLED_DETAIL

    def test_classify_deposit_410_without_bot_token(self, client_with_mock_token):
        uid = "11111111-1111-1111-1111-111111111111"
        response = client_with_mock_token.post(
            f"{settings.API_V1_STR.rstrip('/')}/deposits/{uid}/classify",
        )
        assert response.status_code == 410

    def test_get_deposits_list(self, client_with_mock_token):
        response = client_with_mock_token.get(f"{settings.API_V1_STR.rstrip('/')}/deposits/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_openapi_documents_410_for_from_bot_and_classify(self, client: TestClient, openapi_schema):
        v1 = settings.API_V1_STR.rstrip("/")
        from_bot = openapi_schema["paths"][f"{v1}/deposits/from-bot"]["post"]
        assert "410" in from_bot.get("responses", {})
        classify = openapi_schema["paths"][f"{v1}/deposits/{{deposit_id}}/classify"]["post"]
        assert "410" in classify.get("responses", {})


if __name__ == "__main__":
    pytest.main([__file__])
