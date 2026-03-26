"""
Integration tests for deposit validation/correction workflow - Story 4.3.
Tests the human validation and correction of AI-classified deposits.
"""

import pytest

from recyclic_api.core.config import settings
from recyclic_api.models.deposit import Deposit, DepositStatus, EEECategory
from recyclic_api.models.user import UserStatus
from tests.factories import UserFactory

_V1 = settings.API_V1_STR.rstrip("/")
_JSON = {"Content-Type": "application/json"}


@pytest.fixture
def classified_deposit(db_session):
    """Dépôt déjà classifié (seed DB) pour tests de finalisation ``PUT .../deposits/{id}``."""
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

    return str(deposit.id)


class TestDepositValidationWorkflow:
    """Test class for deposit validation/correction workflow."""

    def test_validate_ai_classification_success(self, client, classified_deposit):
        """Test successful validation of AI classification."""
        deposit_id = classified_deposit

        payload = {
            "validated": True,
            "correction_applied": False
        }

        response = client.put(
            f"{_V1}/deposits/{deposit_id}",
            json=payload,
            headers=_JSON,
        )

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "completed"
        assert data["category"] == "other"
        assert data["eee_category"] == "other"

        assert data["alternative_categories"] is not None
        assert "validation_info" in data["alternative_categories"]
        validation_info = data["alternative_categories"]["validation_info"]
        assert validation_info["human_validated"] is True
        assert validation_info["ai_suggested"] == "EEECategory.OTHER"

    def test_correct_ai_classification_success(self, client, classified_deposit):
        """Test successful correction of AI classification."""
        deposit_id = classified_deposit

        payload = {
            "validated": False,
            "correction_applied": True,
            "final_category": "small_appliance"
        }

        response = client.put(
            f"{_V1}/deposits/{deposit_id}",
            json=payload,
            headers=_JSON,
        )

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "completed"
        assert data["category"] == "small_appliance"
        assert data["eee_category"] == "small_appliance"

        assert data["alternative_categories"] is not None
        assert "correction_info" in data["alternative_categories"]
        correction_info = data["alternative_categories"]["correction_info"]
        assert correction_info["human_corrected"] == "EEECategory.SMALL_APPLIANCE"
        assert correction_info["ai_suggested"] == "EEECategory.OTHER"

    def test_finalize_deposit_put_without_extra_auth_succeeds(self, client, classified_deposit):
        """Finalisation sans en-tête bot (même contrat que GET/POST ``/deposits``)."""
        deposit_id = classified_deposit
        response = client.put(
            f"{_V1}/deposits/{deposit_id}",
            json={"validated": True, "correction_applied": False},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "completed"

    def test_finalize_deposit_not_found(self, client):
        """Test finalization of non-existent deposit."""
        payload = {
            "validated": True,
            "correction_applied": False
        }

        response = client.put(
            f"{_V1}/deposits/11111111-1111-1111-1111-111111111111",
            json=payload,
            headers=_JSON,
        )

        assert response.status_code == 404
        assert "Deposit not found" in response.json()["detail"]

    def test_finalize_deposit_invalid_status(self, client, db_session):
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

        finalize_payload = {
            "validated": True,
            "correction_applied": False
        }

        response = client.put(
            f"{_V1}/deposits/{deposit_id}",
            json=finalize_payload,
            headers=_JSON,
        )

        assert response.status_code == 400
        assert "cannot be finalized from status" in response.json()["detail"]

    def test_finalize_deposit_invalid_payload(self, client, classified_deposit):
        """Test finalization with invalid payload (neither validated nor corrected)."""
        deposit_id = classified_deposit

        payload = {
            "validated": False,
            "correction_applied": False
        }

        response = client.put(
            f"{_V1}/deposits/{deposit_id}",
            json=payload,
            headers=_JSON,
        )

        assert response.status_code == 400
        assert "Either validation must be true or correction" in response.json()["detail"]

    def test_correction_without_category(self, client, classified_deposit):
        """Test correction without providing final_category."""
        deposit_id = classified_deposit

        payload = {
            "validated": False,
            "correction_applied": True
        }

        response = client.put(
            f"{_V1}/deposits/{deposit_id}",
            json=payload,
            headers=_JSON,
        )

        assert response.status_code == 400
        assert "Either validation must be true or correction" in response.json()["detail"]

    def test_all_eee_categories_correction(self, client, classified_deposit):
        """Test that all EEE categories can be used for correction."""
        deposit_id = classified_deposit

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
            get_response = client.get(f"{_V1}/deposits/{deposit_id}")
            assert get_response.status_code == 200

            if get_response.json()["status"] == "completed":
                break

            payload = {
                "validated": False,
                "correction_applied": True,
                "final_category": category
            }

            response = client.put(
                f"{_V1}/deposits/{deposit_id}",
                json=payload,
                headers=_JSON,
            )

            assert response.status_code == 200
            data = response.json()
            assert data["category"] == category
            assert data["eee_category"] == category
            break

    def test_validation_preserves_ai_fields(self, client, classified_deposit):
        """Test that validation preserves AI classification fields."""
        deposit_id = classified_deposit

        get_response = client.get(f"{_V1}/deposits/{deposit_id}")
        original_data = get_response.json()

        payload = {
            "validated": True,
            "correction_applied": False
        }

        response = client.put(
            f"{_V1}/deposits/{deposit_id}",
            json=payload,
            headers=_JSON,
        )

        assert response.status_code == 200
        data = response.json()

        assert data["transcription"] == original_data["transcription"]
        assert data["confidence_score"] == original_data["confidence_score"]
        assert data["ai_confidence"] == original_data["ai_confidence"]
        assert data["ai_classification"] == original_data["ai_classification"]


def test_openapi_has_no_x_bot_token_header(openapi_schema):
    """Le contrat OpenAPI ne doit plus référencer l'en-tête bot (produit Telegram retiré)."""
    paths = openapi_schema["paths"]
    for path, path_item in paths.items():
        for method, operation in path_item.items():
            if method not in {"get", "post", "put", "patch", "delete"}:
                continue
            parameters = operation.get("parameters", [])
            for parameter in parameters:
                if parameter.get("in") == "header" and parameter.get("name", "").lower() == "x-bot-token":
                    pytest.fail(f"x-bot-token still documented on {method.upper()} {path}")


if __name__ == '__main__':
    pytest.main([__file__])
