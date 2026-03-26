"""
Intégration dépôt / classification : routes bot historiques retirées (410 Gone).

Les tests de workflow audio via bot sont remplacés par des assertions de contrat HTTP ;
les champs Story 4.2 du modèle restent couverts en bas de fichier.
"""

import pytest

from recyclic_api.core.bot_auth import TELEGRAM_DEPOSIT_BOT_DISABLED_DETAIL
from recyclic_api.core.config import settings
from recyclic_api.models.deposit import DepositStatus

_V1 = settings.API_V1_STR.rstrip("/")


class TestDepositBotClassificationRetired:
    """POST from-bot et POST classify ne modifient plus la base."""

    def test_from_bot_returns_410(self, client):
        response = client.post(
            f"{_V1}/deposits/from-bot",
            json={
                "telegram_user_id": "story42_user",
                "audio_file_path": "/audio/ordinateur_test.ogg",
                "status": "pending_audio",
            },
        )
        assert response.status_code == 410
        assert response.json()["detail"] == TELEGRAM_DEPOSIT_BOT_DISABLED_DETAIL

    def test_classify_returns_410_even_if_uuid_valid(self, client):
        deposit_id = "00000000-0000-0000-0000-000000000000"
        response = client.post(f"{_V1}/deposits/{deposit_id}/classify")
        assert response.status_code == 410
        assert response.json()["detail"] == TELEGRAM_DEPOSIT_BOT_DISABLED_DETAIL


class TestDepositModelStory42Fields:
    """Test that the new Story 4.2 fields are properly stored in the database."""

    def test_new_deposit_status_enum_values(self):
        """Test that new DepositStatus enum values are available."""

        # Verify new status values exist
        assert DepositStatus.PENDING_VALIDATION in DepositStatus
        assert DepositStatus.CLASSIFICATION_FAILED in DepositStatus

        # Verify string values
        assert DepositStatus.PENDING_VALIDATION.value == "pending_validation"
        assert DepositStatus.CLASSIFICATION_FAILED.value == "classification_failed"

    def test_deposit_model_has_new_fields(self):
        """Test that Deposit model has the new Story 4.2 fields."""
        from recyclic_api.models.deposit import Deposit

        # Create a deposit instance to verify fields exist
        deposit = Deposit()

        # Verify new fields exist
        assert hasattr(deposit, 'transcription')
        assert hasattr(deposit, 'eee_category')
        assert hasattr(deposit, 'confidence_score')
        assert hasattr(deposit, 'alternative_categories')


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
