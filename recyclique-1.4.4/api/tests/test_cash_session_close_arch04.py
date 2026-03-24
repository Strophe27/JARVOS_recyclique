"""
ARCH-04 — POST /cash-sessions/{id}/close : orchestration dans application.cash_session_closing.

Tests unitaires ciblés (mocks) pour droits opérateur et résultat fermeté / session vide.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from recyclic_api.application.cash_session_closing import run_close_cash_session
from recyclic_api.models.cash_session import CashSessionStatus
from recyclic_api.models.user import UserRole
from recyclic_api.schemas.cash_session import CashSessionClose


def _user(role: UserRole = UserRole.USER, user_id=None):
    uid = user_id or uuid4()
    return SimpleNamespace(id=uid, username="tester", role=role)


def _close_payload(actual: float = 75.0, comment: str | None = None):
    return CashSessionClose(actual_amount=actual, variance_comment=comment)


@patch("recyclic_api.application.cash_session_closing.log_cash_session_closing")
def test_run_close_cash_session_403_when_user_not_operator(mock_audit):
    operator_id = uuid4()
    other_id = uuid4()
    session = SimpleNamespace(
        id=uuid4(),
        operator_id=operator_id,
        current_amount=50.0,
        initial_amount=50.0,
        total_sales=0.0,
        status=CashSessionStatus.OPEN,
    )
    db = MagicMock()
    service = MagicMock()
    service.get_session_by_id_or_raise.return_value = session

    with pytest.raises(HTTPException) as exc_info:
        run_close_cash_session(
            db=db,
            service=service,
            current_user=_user(UserRole.USER, other_id),
            session_id=str(session.id),
            close_data=_close_payload(),
        )

    assert exc_info.value.status_code == 403
    assert "Accès non autorisé" in exc_info.value.detail
    mock_audit.assert_called()
    assert mock_audit.call_args.kwargs.get("success") is False
    service.validate_session_close.assert_not_called()


@patch("recyclic_api.application.cash_session_closing.log_cash_session_closing")
def test_run_close_cash_session_admin_can_close_any_session(mock_audit):
    operator_id = uuid4()
    admin_id = uuid4()
    session = SimpleNamespace(
        id=uuid4(),
        operator_id=operator_id,
        current_amount=125.0,
        initial_amount=50.0,
        total_sales=75.0,
        status=CashSessionStatus.OPEN,
    )
    closed = SimpleNamespace(
        id=session.id,
        operator_id=operator_id,
        current_amount=125.0,
        initial_amount=50.0,
        operator=None,
        actual_amount=125.0,
        closing_amount=None,
    )
    db = MagicMock()
    service = MagicMock()
    service.get_session_by_id_or_raise.return_value = session
    service.validate_session_close.return_value = {
        "total_donations": 0.0,
        "theoretical_amount": 125.0,
        "variance": 0.0,
    }
    service.close_session_with_amounts.return_value = closed

    outcome = run_close_cash_session(
        db=db,
        service=service,
        current_user=_user(UserRole.ADMIN, admin_id),
        session_id=str(session.id),
        close_data=_close_payload(actual=125.0),
    )

    assert outcome.closed_session is closed
    assert outcome.session_id == str(session.id)
    service.close_session_with_amounts.assert_called_once()
    mock_audit.assert_called()
    assert mock_audit.call_args.kwargs.get("success") is True


@patch("recyclic_api.application.cash_session_closing.log_cash_session_closing")
def test_run_close_cash_session_empty_deleted_outcome(mock_audit):
    uid = uuid4()
    session = SimpleNamespace(
        id=uuid4(),
        operator_id=uid,
        current_amount=50.0,
        initial_amount=50.0,
        total_sales=0.0,
        status=CashSessionStatus.OPEN,
    )
    db = MagicMock()
    service = MagicMock()
    service.get_session_by_id_or_raise.return_value = session
    service.validate_session_close.return_value = {
        "total_donations": 0.0,
        "theoretical_amount": 50.0,
        "variance": 0.0,
    }
    service.close_session_with_amounts.return_value = None

    outcome = run_close_cash_session(
        db=db,
        service=service,
        current_user=_user(UserRole.USER, uid),
        session_id=str(session.id),
        close_data=_close_payload(actual=50.0),
    )

    assert outcome.closed_session is None
    assert outcome.session_id == str(session.id)
    mock_audit.assert_called()
    assert mock_audit.call_args.kwargs.get("success") is True
