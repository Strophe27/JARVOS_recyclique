"""
Vérification du retrait du flux bot : création / classification dépôt → 410 Gone.
"""

import pytest
from unittest.mock import patch

from recyclic_api.core.bot_auth import TELEGRAM_DEPOSIT_BOT_DISABLED_DETAIL
from recyclic_api.core.config import settings

TEST_BOT_TOKEN = "test_bot_token_123"
_V1 = settings.API_V1_STR.rstrip("/")


def test_deposit_from_bot_and_classify_return_410(client):
    with patch("recyclic_api.core.config.settings.TELEGRAM_BOT_TOKEN", TEST_BOT_TOKEN):
        headers = {"X-Bot-Token": TEST_BOT_TOKEN, "Content-Type": "application/json"}
        create_payload = {
            "telegram_user_id": "12345",
            "audio_file_path": "/audio/test_deposit.ogg",
            "status": "pending_audio",
        }
        create_response = client.post(
            f"{_V1}/deposits/from-bot",
            json=create_payload,
            headers=headers,
        )
        assert create_response.status_code == 410
        assert create_response.json()["detail"] == TELEGRAM_DEPOSIT_BOT_DISABLED_DETAIL

        uid = "00000000-0000-0000-0000-000000000001"
        classify_response = client.post(
            f"{_V1}/deposits/{uid}/classify",
            headers=headers,
        )
        assert classify_response.status_code == 410
        assert classify_response.json()["detail"] == TELEGRAM_DEPOSIT_BOT_DISABLED_DETAIL


if __name__ == "__main__":
    pytest.main([__file__])
