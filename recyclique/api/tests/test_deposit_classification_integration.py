"""
Champs Story 4.2 du modèle dépôt (les routes bot from-bot / classify ont été retirées du contrat HTTP).
"""

import pytest

from recyclic_api.models.deposit import DepositStatus


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
