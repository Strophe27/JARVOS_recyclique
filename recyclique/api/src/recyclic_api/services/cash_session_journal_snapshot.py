"""Story 22.6 — agrégation journal ``payment_transactions`` pour snapshot de clôture."""

from __future__ import annotations

from collections import defaultdict
from typing import Dict, Optional
from uuid import UUID

from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import Session

from recyclic_api.models.payment_method import PaymentMethodDefinition, PaymentMethodKind
from recyclic_api.models.payment_transaction import PaymentTransaction, PaymentTransactionNature
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus, _normalize_payment_method_token
from recyclic_api.models.cash_disbursement import CashDisbursement
from recyclic_api.schemas.cash_session_close_snapshot import (
    CashSessionAccountingCloseSnapshotV1,
    CashSessionCloseSnapshotClosingV1,
    CashSessionDisbursementLineV1,
    CashSessionJournalTotalsV1,
)


def _signed_amount_raw(amount: float, direction: Optional[str]) -> float:
    amt = float(amount)
    d = (direction or "").strip().lower()
    if d == "outflow":
        return -amt
    return amt


_PM_DEC_FR: dict[str, str] = {
    "cash": "Décaissement espèces",
    "check": "Décaissement chèque",
    "cheque": "Décaissement chèque",
    "card": "Décaissement carte",
    "transfer": "Décaissement virement",
    "bank": "Décaissement virement",
}


def _pm_decaissement_label_fr(code: str) -> str:
    c = (code or "").strip().lower()
    return _PM_DEC_FR.get(c, f"Décaissement {c}")


def _disbursement_subtype_caption_fr(subtype: str) -> str:
    return {
        "volunteer_expense_reimbursement": "remboursement frais bénévole",
        "small_operating_expense": "petite dépense de fonctionnement",
        "validated_exceptional_outflow": "sortie exceptionnelle validée",
        "other_admin_coded": "autre (codifié administrativement)",
    }.get(subtype, subtype)


def _legacy_journal_agg_key(raw: Optional[str]) -> str:
    """Clé agrégée brownfield à partir de la colonne VARCHAR legacy (FK absente)."""
    token = _normalize_payment_method_token(raw or "")
    if token is not None:
        return token
    s = (raw or "").strip().lower()
    return s if s else "unknown"


def compute_payment_journal_aggregates(
    db: Session,
    *,
    cash_session_id: UUID,
    use_legacy_preview_if_no_journal: bool,
) -> CashSessionJournalTotalsV1:
    """Calcule les totaux à partir des lignes ``payment_transactions`` des ventes de la session."""
    sid = cash_session_id
    # CAST en VARCHAR côté SQL + pas d'hydratation Enum Python : tolère le brownfield
    # (`CASH`, …) tout en conservant un bind UUID correct (SQLite / PostgreSQL).
    legacy_pm_txt = cast(PaymentTransaction.payment_method, String)
    nat_txt = cast(PaymentTransaction.nature, String)
    dir_txt = cast(PaymentTransaction.direction, String)
    expert_code_txt = cast(PaymentMethodDefinition.code, String)
    pm_kind_txt = cast(PaymentMethodDefinition.kind, String)
    stmt = (
        select(
            PaymentTransaction.amount.label("amount"),
            PaymentTransaction.payment_method_id.label("payment_method_id"),
            func.lower(func.trim(legacy_pm_txt)).label("legacy_pm_raw"),
            func.lower(func.trim(expert_code_txt)).label("expert_code"),
            func.lower(func.trim(pm_kind_txt)).label("pm_kind"),
            func.lower(func.trim(nat_txt)).label("nature"),
            func.lower(func.trim(dir_txt)).label("direction"),
            PaymentTransaction.is_prior_year_special_case.label("prior_flag"),
        )
        .select_from(PaymentTransaction)
        .join(Sale, Sale.id == PaymentTransaction.sale_id)
        .outerjoin(
            PaymentMethodDefinition,
            PaymentMethodDefinition.id == PaymentTransaction.payment_method_id,
        )
        .where(Sale.cash_session_id == sid)
    )
    rows = db.execute(stmt).mappings().all()

    by_pm: Dict[str, float] = defaultdict(float)
    donation_surplus = 0.0
    refunds_current_by_pm: Dict[str, float] = defaultdict(float)
    refunds_prior_by_pm: Dict[str, float] = defaultdict(float)
    cash_net = 0.0

    nat_donation = PaymentTransactionNature.DONATION_SURPLUS.value
    nat_refund = PaymentTransactionNature.REFUND_PAYMENT.value

    cash_kind = PaymentMethodKind.CASH.value

    for row in rows:
        amount = float(row["amount"])
        pm_fk = row["payment_method_id"]
        if pm_fk is not None:
            expert = (row["expert_code"] or "").strip().lower()
            pm_key = expert if expert else "unknown"
        else:
            pm_key = _legacy_journal_agg_key(row["legacy_pm_raw"])

        direction = row["direction"]
        signed = _signed_amount_raw(amount, direction)
        by_pm[pm_key] += signed

        nature = (row["nature"] or "").strip().lower()
        if nature == nat_donation:
            donation_surplus += signed
        elif nature == nat_refund:
            amt_abs = float(row["amount"])
            prior = bool(row["prior_flag"])
            if prior:
                refunds_prior_by_pm[pm_key] += amt_abs
            else:
                refunds_current_by_pm[pm_key] += amt_abs

        if pm_fk is not None:
            if (row["pm_kind"] or "").strip().lower() == cash_kind:
                cash_net += signed
        elif pm_key == PaymentMethod.CASH.value:
            cash_net += signed

    line_count = len(rows)
    fallback = bool(
        use_legacy_preview_if_no_journal and line_count == 0
    )

    # Dons portés sur `sale.donation` sans lignes `DONATION_SURPLUS` (données historiques ou chemins incomplets) :
    # aligner le total dons Paheko sur la somme des tickets complétés pour ne pas tout créditer en 707.
    sale_donation_sum = float(
        db.execute(
            select(func.coalesce(func.sum(Sale.donation), 0.0)).where(
                Sale.cash_session_id == sid,
                Sale.lifecycle_status == SaleLifecycleStatus.COMPLETED,
            )
        ).scalar_one()
        or 0.0
    )
    t_net_signed = round(sum(float(v) for v in by_pm.values()), 2)
    donation_surplus = round(max(float(donation_surplus), sale_donation_sum), 2)
    if donation_surplus > t_net_signed + 0.01:
        donation_surplus = round(max(0.0, t_net_signed), 2)

    rc_by_pm = {k: round(float(v), 2) for k, v in refunds_current_by_pm.items() if abs(float(v)) > 1e-9}
    rp_by_pm = {k: round(float(v), 2) for k, v in refunds_prior_by_pm.items() if abs(float(v)) > 1e-9}
    refunds_current = round(sum(rc_by_pm.values()), 2)
    refunds_prior = round(sum(rp_by_pm.values()), 2)

    disbursement_rows = (
        db.query(CashDisbursement)
        .filter(CashDisbursement.cash_session_id == sid)
        .order_by(CashDisbursement.created_at.asc())
        .all()
    )
    cash_disbursement_lines: list[CashSessionDisbursementLineV1] = []
    for dr in disbursement_rows:
        pm_key = (dr.payment_method or "").strip().lower() or "unknown"
        cap = _disbursement_subtype_caption_fr((dr.subtype or "").strip())
        cash_disbursement_lines.append(
            CashSessionDisbursementLineV1(
                payment_method_code=pm_key,
                amount=round(float(dr.amount), 2),
                subtype=str(dr.subtype),
                label_fr=f"{_pm_decaissement_label_fr(pm_key)} — {cap}",
            )
        )

    return CashSessionJournalTotalsV1(
        by_payment_method_signed=dict(by_pm),
        refunds_current_fiscal_by_payment_method=rc_by_pm,
        refunds_prior_closed_fiscal_by_payment_method=rp_by_pm,
        donation_surplus_total=float(donation_surplus),
        refunds_current_fiscal_total=float(refunds_current),
        refunds_prior_closed_fiscal_total=float(refunds_prior),
        cash_signed_net_from_journal=float(cash_net),
        payment_transaction_line_count=line_count,
        preview_fallback_legacy_totals=fallback,
        cash_disbursement_lines=cash_disbursement_lines,
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
