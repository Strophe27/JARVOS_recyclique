from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock

import pytest

from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.models.cash_session import CashSessionStatus
from recyclic_api.services.cash_session_service import CashSessionService


def test_close_session_with_amounts_raises_not_found_for_unknown_session():
    db = MagicMock()
    service = CashSessionService(db)
    service.get_session_by_id = MagicMock(return_value=None)

    with pytest.raises(NotFoundError, match="Session de caisse non trouvée"):
        service.close_session_with_amounts(str(uuid4()), 75.0)


def test_get_session_by_id_or_raise_raises_validation_error_for_invalid_uuid():
    service = CashSessionService(MagicMock())

    with pytest.raises(ValidationError, match="session_id invalide"):
        service.get_session_by_id_or_raise("not-a-uuid")


def test_validate_session_close_raises_conflict_for_closed_session():
    service = CashSessionService(MagicMock())
    session = SimpleNamespace(status=CashSessionStatus.CLOSED)

    with pytest.raises(ConflictError, match="déjà fermée"):
        service.validate_session_close(session, 75.0)


def test_validate_session_close_raises_validation_error_when_comment_missing():
    service = CashSessionService(MagicMock())
    session = SimpleNamespace(
        id=uuid4(),
        status=CashSessionStatus.OPEN,
        initial_amount=50.0,
        total_sales=25.0,
    )
    service.get_total_donations_for_session = MagicMock(return_value=0.0)

    with pytest.raises(ValidationError, match="commentaire est obligatoire"):
        service.validate_session_close(session, 80.0, None)


def test_validate_session_close_rejects_blank_comment():
    service = CashSessionService(MagicMock())
    session = SimpleNamespace(
        id=uuid4(),
        status=CashSessionStatus.OPEN,
        initial_amount=50.0,
        total_sales=25.0,
    )
    service.get_total_donations_for_session = MagicMock(return_value=0.0)

    with pytest.raises(ValidationError, match="commentaire est obligatoire"):
        service.validate_session_close(session, 80.0, "   ")
