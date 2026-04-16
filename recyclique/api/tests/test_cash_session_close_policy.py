from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from recyclic_api.schemas.cash_session_close_snapshot import CashSessionJournalTotalsV1
from recyclic_api.services.cash_session_service import CashSessionService


@patch("recyclic_api.services.cash_session_service.compute_payment_journal_aggregates")
def test_get_closing_preview_uses_single_formula(mock_journal):
    db = MagicMock()
    service = CashSessionService(db)

    session = SimpleNamespace(
        id=uuid4(),
        initial_amount=50.0,
        total_sales=25.0,
    )
    mock_journal.return_value = CashSessionJournalTotalsV1(
        by_payment_method_signed={},
        donation_surplus_total=0.0,
        refunds_current_fiscal_total=0.0,
        refunds_prior_closed_fiscal_total=0.0,
        cash_signed_net_from_journal=0.0,
        payment_transaction_line_count=0,
        preview_fallback_legacy_totals=True,
    )

    scalar_query = db.query.return_value.filter.return_value
    scalar_query.scalar.return_value = 5.0

    preview = service.get_closing_preview(session, actual_amount=90.0)

    assert preview == {
        "total_donations": 5.0,
        "theoretical_amount": 80.0,
        "variance": 10.0,
    }


@patch("recyclic_api.services.cash_session_service.build_accounting_close_snapshot_v1")
@patch("recyclic_api.services.cash_session_service.compute_payment_journal_aggregates")
@patch("recyclic_api.services.paheko_sync_final_action_policy.assert_a1_allowed_for_cash_session_close")
def test_close_session_with_amounts_reuses_preview_formula(mock_a1, mock_journal, mock_snap):
    db = MagicMock()
    service = CashSessionService(db)

    session = SimpleNamespace(
        id=uuid4(),
        status="open",
        site_id=uuid4(),
        register_id=None,
        accounting_config_revision_id=None,
        accounting_close_snapshot=None,
        closed_at=None,
        initial_amount=50.0,
        total_sales=25.0,
        close_with_amounts=MagicMock(),
    )

    mock_journal.return_value = CashSessionJournalTotalsV1(
        by_payment_method_signed={},
        donation_surplus_total=0.0,
        refunds_current_fiscal_total=0.0,
        refunds_prior_closed_fiscal_total=0.0,
        cash_signed_net_from_journal=0.0,
        payment_transaction_line_count=0,
        preview_fallback_legacy_totals=True,
    )
    snap = MagicMock()
    snap.model_dump_for_storage.return_value = {"schema_version": 1, "correction_policy": "append_only_v1"}
    mock_snap.return_value = snap

    service.get_session_by_id = MagicMock(return_value=session)
    service.is_session_empty = MagicMock(return_value=False)
    service.get_closing_preview = MagicMock(
        return_value={
            "total_donations": 5.0,
            "theoretical_amount": 80.0,
            "variance": 10.0,
        }
    )

    with patch("recyclic_api.services.paheko_outbox_service.enqueue_cash_session_close_outbox") as mock_enq:
        result = service.close_session_with_amounts(str(session.id), 90.0, "ecart")

    assert result is session
    service.get_closing_preview.assert_called_once_with(session, 90.0)
    session.close_with_amounts.assert_called_once_with(90.0, "ecart", 80.0)
    assert session.accounting_close_snapshot == snap.model_dump_for_storage.return_value
    mock_enq.assert_called_once()
    db.commit.assert_called_once_with()
    db.refresh.assert_called_once_with(session)
