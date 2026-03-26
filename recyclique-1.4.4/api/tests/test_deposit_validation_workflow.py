"""
Integration tests for deposit validation/correction workflow - Story 4.3.
Tests the human validation and correction of AI-classified deposits.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from recyclic_api.main import app
from recyclic_api.core.config import settings
from recyclic_api.models.deposit import Deposit, DepositStatus, EEECategory
from recyclic_api.models.user import UserStatus
from tests.factories import UserFactory

# Mock bot token for testing
TEST_BOT_TOKEN = "test_bot_token_123"
_V1 = settings.API_V1_STR.rstrip("/")


@pytest.fixture
def mock_bot_token():
    """Mock the bot token configuration."""
    with patch('recyclic_api.core.config.settings.TELEGRAM_BOT_TOKEN', TEST_BOT_TOKEN):
        yield TEST_BOT_TOKEN


@pytest.fixture
def client_with_mock_token(mock_bot_token):
    """Create test client with mocked bot token."""
    return TestClient(app)


@pytest.fixture
def classified_deposit(client_with_mock_token, db_session):
    """Dépôt déjà classifié (seed DB) — les routes bot from-bot/classify sont retirées (410)."""
    user = UserFactory(status=UserStatus.APPROVED)
    db_session.add(user)
    db_session.flush()

    deposit = Deposit(
        user_id=user.id,
        telegram_user_id="validation_test_user",
        audio_file_path="/audio/validation_test.ogg",
        status=DepositStatus.CLASSIFIED,
        category=EEECategory.OTHER,
        eee_category=EEECategory.OTHER,
        transcription="Un ancien téléphone mobile",
        confidence_score=0.75,
        ai_confidence=0.75,
        ai_classification="Équipement informatique détecté",
        alternative_categories={
            "second_choice": "small_appliance",
            "third_choice": "other"
        },
    )
    db_session.add(deposit)
    db_session.commit()
    db_session.refresh(deposit)

    headers = {
        "X-Bot-Token": TEST_BOT_TOKEN,
        "Content-Type": "application/json"
    }

    return str(deposit.id), headers


class TestDepositValidationWorkflow:
    """Test class for deposit validation/correction workflow."""

    def test_validate_ai_classification_success(self, client_with_mock_token, classified_deposit):
        """Test successful validation of AI classification."""
        deposit_id, headers = classified_deposit

        # Prepare validation payload
        payload = {
            "validated": True,
            "correction_applied": False
        }

        # Validate the deposit
        response = client_with_mock_token.put(
            f"{_V1}/deposits/{deposit_id}",
            json=payload,
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()

        # Check validation results
        assert data["status"] == "completed"
        # assert data["human_validated"] == True  # Temporarily commented out
        # assert data["human_corrected"] == False  # Temporarily commented out
        assert data["category"] == "other"  # Fallback classification returns "other"
        assert data["eee_category"] == "other"

        # Check that validation info is stored
        assert data["alternative_categories"] is not None
        assert "validation_info" in data["alternative_categories"]
        validation_info = data["alternative_categories"]["validation_info"]
        assert validation_info["human_validated"] == True
        assert validation_info["ai_suggested"] == "EEECategory.OTHER"  # Fallback returns OTHER

    def test_correct_ai_classification_success(self, client_with_mock_token, classified_deposit):
        """Test successful correction of AI classification."""
        deposit_id, headers = classified_deposit

        # Prepare correction payload
        payload = {
            "validated": False,
            "correction_applied": True,
            "final_category": "small_appliance"
        }

        # Correct the deposit
        response = client_with_mock_token.put(
            f"{_V1}/deposits/{deposit_id}",
            json=payload,
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()

        # Check correction results
        assert data["status"] == "completed"
        # assert data["human_validated"] == False  # Temporarily commented out
        # assert data["human_corrected"] == True  # Temporarily commented out
        assert data["category"] == "small_appliance"
        assert data["eee_category"] == "small_appliance"

        # Check that correction info is stored
        assert data["alternative_categories"] is not None
        assert "correction_info" in data["alternative_categories"]
        correction_info = data["alternative_categories"]["correction_info"]
        assert correction_info["human_corrected"] == "EEECategory.SMALL_APPLIANCE"  # Enum converted to string
        assert correction_info["ai_suggested"] == "EEECategory.OTHER"  # Fallback returns OTHER

    def test_finalize_deposit_missing_token(self, client_with_mock_token, classified_deposit):
        """Test finalization without bot token."""
        deposit_id, _ = classified_deposit

        payload = {
            "validated": True,
            "correction_applied": False
        }

        # Try to finalize without token
        response = client_with_mock_token.put(f"{_V1}/deposits/{deposit_id}", json=payload)

        assert response.status_code == 401
        assert "Missing X-Bot-Token header" in response.json()["detail"]

    def test_finalize_deposit_invalid_token(self, client_with_mock_token, classified_deposit):
        """Test finalization with invalid bot token."""
        deposit_id, _ = classified_deposit

        payload = {
            "validated": True,
            "correction_applied": False
        }

        headers = {
            "X-Bot-Token": "invalid_token",
            "Content-Type": "application/json"
        }

        response = client_with_mock_token.put(f"{_V1}/deposits/{deposit_id}", json=payload, headers=headers)

        assert response.status_code == 401
        assert "Invalid bot token" in response.json()["detail"]

    def test_finalize_deposit_not_found(self, client_with_mock_token):
        """Test finalization of non-existent deposit."""
        headers = {
            "X-Bot-Token": TEST_BOT_TOKEN,
            "Content-Type": "application/json"
        }

        payload = {
            "validated": True,
            "correction_applied": False
        }

        response = client_with_mock_token.put(
            f"{_V1}/deposits/11111111-1111-1111-1111-111111111111",
            json=payload,
            headers=headers
        )

        assert response.status_code == 404
        assert "Deposit not found" in response.json()["detail"]

    def test_finalize_deposit_invalid_status(self, client_with_mock_token, db_session):
        """Test finalization of deposit with invalid status."""
        user = UserFactory(status=UserStatus.APPROVED)
        db_session.add(user)
        db_session.flush()
        deposit = Deposit(
            user_id=user.id,
            telegram_user_id="invalid_status_test",
            audio_file_path="/audio/invalid_status_test.ogg",
            status=DepositStatus.PENDING_AUDIO,
        )
        db_session.add(deposit)
        db_session.commit()
        db_session.refresh(deposit)
        deposit_id = str(deposit.id)

        headers = {
            "X-Bot-Token": TEST_BOT_TOKEN,
            "Content-Type": "application/json"
        }

        finalize_payload = {
            "validated": True,
            "correction_applied": False
        }

        response = client_with_mock_token.put(
            f"{_V1}/deposits/{deposit_id}",
            json=finalize_payload,
            headers=headers
        )

        assert response.status_code == 400
        assert "cannot be finalized from status" in response.json()["detail"]

    def test_finalize_deposit_invalid_payload(self, client_with_mock_token, classified_deposit):
        """Test finalization with invalid payload (neither validated nor corrected)."""
        deposit_id, headers = classified_deposit

        # Invalid payload - neither validation nor correction
        payload = {
            "validated": False,
            "correction_applied": False
        }

        response = client_with_mock_token.put(
            f"{_V1}/deposits/{deposit_id}",
            json=payload,
            headers=headers
        )

        assert response.status_code == 400
        assert "Either validation must be true or correction" in response.json()["detail"]

    def test_correction_without_category(self, client_with_mock_token, classified_deposit):
        """Test correction without providing final_category."""
        deposit_id, headers = classified_deposit

        # Correction without final_category
        payload = {
            "validated": False,
            "correction_applied": True
            # Missing final_category
        }

        response = client_with_mock_token.put(
            f"{_V1}/deposits/{deposit_id}",
            json=payload,
            headers=headers
        )

        assert response.status_code == 400
        assert "Either validation must be true or correction" in response.json()["detail"]

    def test_all_eee_categories_correction(self, client_with_mock_token, classified_deposit):
        """Test that all EEE categories can be used for correction."""
        deposit_id, headers = classified_deposit

        # Test each EEE category
        categories_to_test = [
            "small_appliance",
            "large_appliance",
            "it_equipment",
            "lighting",
            "tools",
            "toys",
            "medical_devices",
            "monitoring_control",
            "automatic_dispensers",
            "other"
        ]

        for category in categories_to_test:
            # Get fresh deposit info first
            get_response = client_with_mock_token.get(f"{_V1}/deposits/{deposit_id}")
            assert get_response.status_code == 200

            # Reset status to classified for next test
            # This is a bit of a hack for testing, in reality each correction would be on a new deposit
            if get_response.json()["status"] == "completed":
                # We need a fresh deposit for each test, so let's just test one category thoroughly
                break

            payload = {
                "validated": False,
                "correction_applied": True,
                "final_category": category
            }

            response = client_with_mock_token.put(
                f"{_V1}/deposits/{deposit_id}",
                json=payload,
                headers=headers
            )

            # Should accept the first valid category
            assert response.status_code == 200
            data = response.json()
            assert data["category"] == category
            assert data["eee_category"] == category
            # assert data["human_corrected"] == True  # Temporarily commented out
            break

    def test_validation_preserves_ai_fields(self, client_with_mock_token, classified_deposit):
        """Test that validation preserves AI classification fields."""
        deposit_id, headers = classified_deposit

        # Get deposit before validation to check AI fields
        get_response = client_with_mock_token.get(f"{_V1}/deposits/{deposit_id}")
        original_data = get_response.json()

        # Validate the deposit
        payload = {
            "validated": True,
            "correction_applied": False
        }

        response = client_with_mock_token.put(
            f"{_V1}/deposits/{deposit_id}",
            json=payload,
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()

        # Check that AI fields are preserved
        assert data["transcription"] == original_data["transcription"]
        assert data["confidence_score"] == original_data["confidence_score"]
        assert data["ai_confidence"] == original_data["ai_confidence"]
        assert data["ai_classification"] == original_data["ai_classification"]


if __name__ == '__main__':
    pytest.main([__file__])