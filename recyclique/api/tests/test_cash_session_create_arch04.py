"""
ARCH-04 — POST /cash-sessions/ : orchestration dans application.cash_session_opening.

Tests unitaires ciblés (mocks) pour permissions différées et anti-doublon opérateur.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from recyclic_api.application.cash_session_opening import open_cash_session
from recyclic_api.models.user import UserRole
from recyclic_api.schemas.cash_session import CashSessionCreate
from recyclic_api.services.cash_session_service import CashSessionService


def _user(role: UserRole = UserRole.USER):
    return SimpleNamespace(id=uuid4(), username="tester", role=role)


def _payload(**kwargs):
    base = {
        "operator_id": str(uuid4()),
        "site_id": str(uuid4()),
        "register_id": str(uuid4()),
        "initial_amount": 50.0,
    }
    base.update(kwargs)
    return CashSessionCreate(**base)


@patch("recyclic_api.application.cash_session_opening.log_cash_session_opening")
@patch("recyclic_api.application.cash_session_opening.user_has_permission", return_value=False)
def test_open_cash_session_403_deferred_without_permission(mock_perm, mock_audit):
    db = MagicMock()
    user = _user(UserRole.USER)
    past = datetime.now(timezone.utc) - timedelta(days=1)
    data = _payload(opened_at=past)

    with pytest.raises(HTTPException) as exc_info:
        open_cash_session(db=db, current_user=user, session_data=data)

    assert exc_info.value.status_code == 403
    assert "caisse.deferred.access" in exc_info.value.detail
    mock_audit.assert_called()
    assert mock_audit.call_args.kwargs.get("success") is False


@patch("recyclic_api.application.cash_session_opening.log_cash_session_opening")
@patch.object(CashSessionService, "get_open_session_by_operator")
@patch.object(CashSessionService, "create_session")
def test_open_cash_session_400_when_operator_already_has_open_session(
    mock_create, mock_get_open, mock_audit
):
    mock_get_open.return_value = SimpleNamespace(id=uuid4())
    db = MagicMock()
    user = _user(UserRole.USER)
    data = _payload()

    with pytest.raises(HTTPException) as exc_info:
        open_cash_session(db=db, current_user=user, session_data=data)

    assert exc_info.value.status_code == 400
    assert "déjà ouverte" in exc_info.value.detail
    mock_create.assert_not_called()
    mock_audit.assert_called()
    assert mock_audit.call_args.kwargs.get("success") is False


@patch("recyclic_api.application.cash_session_opening.enrich_session_response")
@patch("recyclic_api.application.cash_session_opening.log_cash_session_opening")
@patch.object(CashSessionService, "get_open_session_by_operator")
@patch.object(CashSessionService, "create_session")
def test_open_cash_session_deferred_skips_duplicate_operator_check(
    mock_create, mock_get_open, mock_audit, mock_enrich
):
    """Session différée : une session normale peut rester ouverte pour le même opérateur."""
    mock_get_open.return_value = SimpleNamespace(id=uuid4())
    sess = SimpleNamespace(
        id=uuid4(),
        operator_id=uuid4(),
        site_id=uuid4(),
        register_id=uuid4(),
        initial_amount=50.0,
        current_amount=50.0,
        status="open",
        opened_at=datetime.now(timezone.utc) - timedelta(days=2),
        closed_at=None,
        total_sales=0.0,
        total_items=0,
        closing_amount=None,
        actual_amount=None,
        variance=None,
        variance_comment=None,
    )
    mock_create.return_value = sess
    mock_enrich.return_value = MagicMock()

    db = MagicMock()
    user = _user(UserRole.ADMIN)
    past = datetime.now(timezone.utc) - timedelta(days=2)
    data = _payload(opened_at=past)

    open_cash_session(db=db, current_user=user, session_data=data)

    mock_create.assert_called_once()
    mock_enrich.assert_called_once()
