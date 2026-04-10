from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import MagicMock, patch

from recyclic_api.services.cash_session_service import CashSessionService


def test_get_closing_preview_uses_single_formula():
    db = MagicMock()
    service = CashSessionService(db)

    session = SimpleNamespace(
        id=uuid4(),
        initial_amount=50.0,
        total_sales=25.0,
    )

    scalar_query = db.query.return_value.filter.return_value
    scalar_query.scalar.return_value = 5.0

    preview = service.get_closing_preview(session, actual_amount=90.0)

    assert preview == {
        "total_donations": 5.0,
        "theoretical_amount": 80.0,
        "variance": 10.0,
    }


@patch("recyclic_api.services.paheko_sync_final_action_policy.assert_a1_allowed_for_cash_session_close")
def test_close_session_with_amounts_reuses_preview_formula(mock_a1):
    db = MagicMock()
    service = CashSessionService(db)

    session = SimpleNamespace(
        id=uuid4(),
        status="open",
        initial_amount=50.0,
        total_sales=25.0,
        close_with_amounts=MagicMock(),
    )

    service.get_session_by_id = MagicMock(return_value=session)
    service.is_session_empty = MagicMock(return_value=False)
    service.get_closing_preview = MagicMock(
        return_value={
            "total_donations": 5.0,
            "theoretical_amount": 80.0,
            "variance": 10.0,
        }
    )

    result = service.close_session_with_amounts(str(session.id), 90.0, "ecart")

    assert result is session
    service.get_closing_preview.assert_called_once_with(session, 90.0)
    session.close_with_amounts.assert_called_once_with(90.0, "ecart", 80.0)
    db.commit.assert_called_once_with()
    db.refresh.assert_called_once_with(session)
