"""Story 22.6 — agrégation journal ``payment_transactions`` pour snapshot de clôture."""

from __future__ import annotations

from collections import defaultdict
from typing import Dict, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.sale import PaymentMethod, Sale
from recyclic_api.schemas.cash_session_close_snapshot import (
    CashSessionAccountingCloseSnapshotV1,
    CashSessionCloseSnapshotClosingV1,
    CashSessionJournalTotalsV1,
)


def _signed_amount(pt: PaymentTransaction) -> float:
    amt = float(pt.amount)
    if pt.direction == PaymentTransactionDirection.OUTFLOW:
        return -amt
    # INFLOW ou legacy NULL : encaissement positif
    return amt


def compute_payment_journal_aggregates(
    db: Session,
    *,
    cash_session_id: UUID,
    use_legacy_preview_if_no_journal: bool,
) -> CashSessionJournalTotalsV1:
    """Calcule les totaux à partir des lignes ``payment_transactions`` des ventes de la session."""
    sid = cash_session_id
    pts = (
        db.query(PaymentTransaction)
        .join(Sale, Sale.id == PaymentTransaction.sale_id)
        .filter(Sale.cash_session_id == sid)
        .all()
    )

    by_pm: Dict[str, float] = defaultdict(float)
    donation_surplus = 0.0
    refunds_current = 0.0
    refunds_prior = 0.0
    cash_net = 0.0

    for pt in pts:
        pm = pt.payment_method
        pm_key = pm.value if hasattr(pm, "value") else str(pm)
        signed = _signed_amount(pt)
        by_pm[pm_key] += signed

        nat = pt.nature
        if nat == PaymentTransactionNature.DONATION_SURPLUS:
            donation_surplus += signed
        elif nat == PaymentTransactionNature.REFUND_PAYMENT:
            amt_abs = float(pt.amount)
            if pt.is_prior_year_special_case:
                refunds_prior += amt_abs
            else:
                refunds_current += amt_abs

        if pm_key == PaymentMethod.CASH.value:
            cash_net += signed

    line_count = len(pts)
    fallback = bool(
        use_legacy_preview_if_no_journal and line_count == 0
    )

    return CashSessionJournalTotalsV1(
        by_payment_method_signed=dict(by_pm),
        donation_surplus_total=float(donation_surplus),
        refunds_current_fiscal_total=float(refunds_current),
        refunds_prior_closed_fiscal_total=float(refunds_prior),
        cash_signed_net_from_journal=float(cash_net),
        payment_transaction_line_count=line_count,
        preview_fallback_legacy_totals=fallback,
    )


def build_accounting_close_snapshot_v1(
    *,
    session_id: UUID,
    site_id: UUID,
    register_id: Optional[UUID],
    accounting_config_revision_id: Optional[UUID],
    closed_at_iso: Optional[str],
    sync_correlation_id: str,
    totals: CashSessionJournalTotalsV1,
    theoretical_cash_amount: float,
    actual_cash_amount: float,
    cash_variance: float,
) -> CashSessionAccountingCloseSnapshotV1:
    return CashSessionAccountingCloseSnapshotV1(
        session_id=str(session_id),
        site_id=str(site_id),
        register_id=str(register_id) if register_id else None,
        accounting_config_revision_id=str(accounting_config_revision_id)
        if accounting_config_revision_id
        else None,
        sync_correlation_id=sync_correlation_id,
        closed_at_utc=closed_at_iso,
        totals=totals,
        closing=CashSessionCloseSnapshotClosingV1(
            theoretical_cash_amount=float(theoretical_cash_amount),
            actual_cash_amount=float(actual_cash_amount),
            cash_variance=float(cash_variance),
        ),
    )
