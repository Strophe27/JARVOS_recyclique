from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock

from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.models.cash_session import CashSessionStep


def test_cash_session_create_commits_once_and_initializes_step():
    db = MagicMock()
    service = CashSessionService(db)

    operator_id = uuid4()
    site_id = uuid4()
    register_id = uuid4()

    service.db.query.return_value.filter.return_value.first.side_effect = [
        SimpleNamespace(id=operator_id),
        None,
    ]

    session = service.create_session(
        operator_id=str(operator_id),
        site_id=str(site_id),
        initial_amount=50.0,
        register_id=str(register_id),
    )

    assert session.current_step == CashSessionStep.ENTRY
    assert session.step_start_time is not None
    assert session.last_activity is not None
    db.commit.assert_called_once_with()
    db.refresh.assert_called_once_with(session)


def test_cash_session_create_uses_single_commit_with_default_register():
    db = MagicMock()
    service = CashSessionService(db)

    operator_id = uuid4()
    site_id = uuid4()

    service.db.query.return_value.filter.return_value.first.side_effect = [
        SimpleNamespace(id=operator_id),
        None,
        None,
    ]

    session = service.create_session(
        operator_id=str(operator_id),
        site_id=str(site_id),
        initial_amount=75.0,
        register_id=None,
    )

    assert session.current_step == CashSessionStep.ENTRY
    db.flush.assert_called_once_with()
    db.commit.assert_called_once_with()
