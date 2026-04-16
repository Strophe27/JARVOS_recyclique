"""Story 22.2 — double lecture agrégats brownfield vs journal ``payment_transactions``."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from recyclic_api.core.exceptions import NotFoundError
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.sale import Sale
from recyclic_api.schemas.accounting_dual_read import (
    CanonicalJournalStrict,
    DualReadCompareReport,
    DualReadGapFinding,
    DualReadTaxonomy,
    FrozenSnapshotTotalsDigest,
    JournalDerivedScalar,
    LegacyBrownfieldSessionRollups,
)
from recyclic_api.schemas.cash_session_close_snapshot import CashSessionJournalTotalsV1
from recyclic_api.services.cash_session_journal_snapshot import compute_payment_journal_aggregates


def _load_cutover_criteria_v1() -> Dict[str, Any]:
    path = Path(__file__).resolve().parent.parent / "data" / "epic22_cutover_criteria_v1.json"
    raw = path.read_text(encoding="utf-8")
    return json.loads(raw)


_CUTOVER: Dict[str, Any] | None = None


def _criteria() -> Dict[str, Any]:
    global _CUTOVER
    if _CUTOVER is None:
        _CUTOVER = _load_cutover_criteria_v1()
    return _CUTOVER


def _eps() -> float:
    return float(_criteria()["numeric"]["significant_gap_epsilon"])


def _sale_payment_inflow_sum(db: Session, cash_session_id: UUID) -> float:
    q = (
        db.query(func.coalesce(func.sum(PaymentTransaction.amount), 0.0))
        .join(Sale, Sale.id == PaymentTransaction.sale_id)
        .filter(
            Sale.cash_session_id == cash_session_id,
            PaymentTransaction.nature == PaymentTransactionNature.SALE_PAYMENT,
            PaymentTransaction.direction == PaymentTransactionDirection.INFLOW,
        )
    )
    return float(q.scalar() or 0.0)


def _settlement_inflow_sum(db: Session, cash_session_id: UUID) -> float:
    """Règlement ticket : lignes de vente + don surplus explicite (INFLOW)."""
    q = (
        db.query(func.coalesce(func.sum(PaymentTransaction.amount), 0.0))
        .join(Sale, Sale.id == PaymentTransaction.sale_id)
        .filter(
            Sale.cash_session_id == cash_session_id,
            PaymentTransaction.direction == PaymentTransactionDirection.INFLOW,
            PaymentTransaction.nature.in_(
                (
                    PaymentTransactionNature.SALE_PAYMENT,
                    PaymentTransactionNature.DONATION_SURPLUS,
                )
            ),
        )
    )
    return float(q.scalar() or 0.0)


def _refund_sums(db: Session, cash_session_id: UUID) -> Tuple[float, float]:
    rows = (
        db.query(PaymentTransaction)
        .join(Sale, Sale.id == PaymentTransaction.sale_id)
        .filter(
            Sale.cash_session_id == cash_session_id,
            PaymentTransaction.nature == PaymentTransactionNature.REFUND_PAYMENT,
            PaymentTransaction.direction == PaymentTransactionDirection.OUTFLOW,
        )
        .all()
    )
    cur = 0.0
    prior = 0.0
    for pt in rows:
        a = float(pt.amount)
        if pt.is_prior_year_special_case:
            prior += a
        else:
            cur += a
    return cur, prior


def _sync_correlation_id_str(raw: Any) -> str | None:
    """UUID / str JSON → chaîne stable ; évite un `sync_correlation_id` ambigu côté digest."""
    if raw is None:
        return None
    if isinstance(raw, str):
        s = raw.strip()
        return s if s else None
    s = str(raw).strip()
    return s if s else None


def _digest_frozen_snapshot(session: CashSession) -> FrozenSnapshotTotalsDigest:
    raw = getattr(session, "accounting_close_snapshot", None)
    if not raw or not isinstance(raw, dict):
        return FrozenSnapshotTotalsDigest()
    totals_raw = raw.get("totals")
    cid_s = _sync_correlation_id_str(raw.get("sync_correlation_id"))
    if not isinstance(totals_raw, dict):
        return FrozenSnapshotTotalsDigest(present=True, sync_correlation_id=cid_s)
    try:
        tot = CashSessionJournalTotalsV1.model_validate(totals_raw)
    except Exception:
        return FrozenSnapshotTotalsDigest(present=True, sync_correlation_id=cid_s)
    return FrozenSnapshotTotalsDigest(
        present=True,
        sync_correlation_id=cid_s,
        totals_from_snapshot=tot,
    )


def _build_gap_findings(
    *,
    eps: float,
    legacy: LegacyBrownfieldSessionRollups,
    canon: CashSessionJournalTotalsV1,
    settlement_inflow_sum: float,
    refund_cur: float,
    refund_prior: float,
    frozen: FrozenSnapshotTotalsDigest,
) -> List[DualReadGapFinding]:
    gaps: List[DualReadGapFinding] = []

    def _sig(x: float) -> bool:
        return abs(x) > eps

    # Session dénormalisée vs somme ventes
    d_denorm = float(legacy.cash_session_total_sales_field) - float(legacy.sum_sales_total_amount)
    if _sig(d_denorm):
        gaps.append(
            DualReadGapFinding(
                metric_key="session_total_sales_vs_sum_sale_total_amount",
                legacy_value=float(legacy.cash_session_total_sales_field),
                canonical_value=float(legacy.sum_sales_total_amount),
                delta=d_denorm,
                taxonomy=DualReadTaxonomy.HISTORICAL_DATA,
                blocks_cutover=True,
                notes="Dérive possible entre total_sales de session et somme des tickets — revue migration / cohérence métier.",
            )
        )

    # Alignement total ticket vs règlement journal (paiements + don surplus encaissés)
    d_pay = float(legacy.sum_sales_total_amount) - float(settlement_inflow_sum)
    if _sig(d_pay):
        gaps.append(
            DualReadGapFinding(
                metric_key="sum_sale_total_amount_vs_journal_settlement_inflow",
                legacy_value=float(legacy.sum_sales_total_amount),
                canonical_value=float(settlement_inflow_sum),
                delta=d_pay,
                taxonomy=DualReadTaxonomy.BUG,
                blocks_cutover=True,
                notes="Incohérence entre `sales.total_amount` et la somme des lignes journal de règlement (sale_payment + donation_surplus).",
            )
        )

    # Champ donation legacy vs journal don surplus — concepts distincts phase B (MODEL, non bloquant si documenté)
    d_don = float(legacy.sum_sales_donation_field) - float(canon.donation_surplus_total)
    if _sig(d_don):
        gaps.append(
            DualReadGapFinding(
                metric_key="legacy_sale_donation_field_vs_journal_donation_surplus",
                legacy_value=float(legacy.sum_sales_donation_field),
                canonical_value=float(canon.donation_surplus_total),
                delta=d_don,
                taxonomy=DualReadTaxonomy.MODEL,
                blocks_cutover=False,
                notes="Le champ `sales.donation` n'est pas équivalent au flux `donation_surplus` du journal — comparer en connaissance de cause.",
            )
        )

    # Remboursements : le brownfield ne porte pas les mêmes agrégats — signal MISSING_CONTRACT / OUT_OF_SCOPE
    if _sig(float(canon.refunds_current_fiscal_total) - float(refund_cur)):
        gaps.append(
            DualReadGapFinding(
                metric_key="refund_current_journal_vs_derived_rows",
                legacy_value=float(refund_cur),
                canonical_value=float(canon.refunds_current_fiscal_total),
                delta=float(canon.refunds_current_fiscal_total) - float(refund_cur),
                taxonomy=DualReadTaxonomy.BUG,
                blocks_cutover=True,
                notes="Somme REFUND_PAYMENT (hors N−1) vs agrégat canonique — doit coller.",
            )
        )
    if _sig(float(canon.refunds_prior_closed_fiscal_total) - float(refund_prior)):
        gaps.append(
            DualReadGapFinding(
                metric_key="refund_prior_journal_vs_derived_rows",
                legacy_value=float(refund_prior),
                canonical_value=float(canon.refunds_prior_closed_fiscal_total),
                delta=float(canon.refunds_prior_closed_fiscal_total) - float(refund_prior),
                taxonomy=DualReadTaxonomy.BUG,
                blocks_cutover=True,
                notes="Somme remboursements N−1 (drapeau) vs agrégat canonique.",
            )
        )

    # Journal vide : soit gratuité / ticket 0 € (hors périmètre flux), soit dette backfill
    if legacy.sale_row_count > 0 and canon.payment_transaction_line_count == 0:
        if legacy.sum_sales_total_amount <= eps:
            gaps.append(
                DualReadGapFinding(
                    metric_key="no_payment_journal_lines_zero_financial_total",
                    legacy_value=float(legacy.sale_row_count),
                    canonical_value=0.0,
                    delta=float(legacy.sale_row_count),
                    taxonomy=DualReadTaxonomy.OUT_OF_SCOPE,
                    blocks_cutover=False,
                    notes="Aucune ligne `payment_transactions` alors que des tickets existent — normal si total financier 0 € (gratuité).",
                )
            )
        else:
            gaps.append(
                DualReadGapFinding(
                    metric_key="journal_empty_while_sales_exist",
                    legacy_value=float(legacy.sale_row_count),
                    canonical_value=0.0,
                    delta=float(legacy.sale_row_count),
                    taxonomy=DualReadTaxonomy.HISTORICAL_DATA,
                    blocks_cutover=True,
                    notes="Sessions antérieures à 22.1 / backfill incomplet — pas de comparaison canonique fiable.",
                )
            )

    if canon.preview_fallback_legacy_totals and legacy.sale_row_count > 0:
        gaps.append(
            DualReadGapFinding(
                metric_key="preview_fallback_flag_with_sales_context",
                legacy_value=1.0,
                canonical_value=0.0,
                delta=1.0,
                taxonomy=DualReadTaxonomy.HISTORICAL_DATA,
                blocks_cutover=True,
                notes="Repli legacy activé pour prévision — incompatible avec une validation cutover stricte sur le journal.",
            )
        )

    # Snapshot figé présent mais totaux absents ou non désérialisables — intégrité 22.6 non vérifiable automatiquement
    if frozen.present and frozen.totals_from_snapshot is None:
        gaps.append(
            DualReadGapFinding(
                metric_key="frozen_snapshot_present_but_totals_unreadable",
                legacy_value=1.0,
                canonical_value=0.0,
                delta=1.0,
                taxonomy=DualReadTaxonomy.BUG,
                blocks_cutover=True,
                notes=(
                    "Snapshot de clôture présent mais `totals` absent, invalide ou non désérialisable — "
                    "contrôles figé/live impossibles ; revue intégrité snapshot 22.6."
                ),
            )
        )

    # Snapshot figé vs journal recalculé (session clôturée) — lignes vs cash séparés (évite delta cash=0 trompeur)
    if frozen.present and frozen.totals_from_snapshot is not None:
        snap = frozen.totals_from_snapshot
        d_lines = float(snap.payment_transaction_line_count) - float(canon.payment_transaction_line_count)
        d_cash = float(snap.cash_signed_net_from_journal) - float(canon.cash_signed_net_from_journal)
        if _sig(d_lines):
            gaps.append(
                DualReadGapFinding(
                    metric_key="frozen_snapshot_line_count_vs_live_journal",
                    legacy_value=float(snap.payment_transaction_line_count),
                    canonical_value=float(canon.payment_transaction_line_count),
                    delta=float(canon.payment_transaction_line_count) - float(snap.payment_transaction_line_count),
                    taxonomy=DualReadTaxonomy.BUG,
                    blocks_cutover=True,
                    notes=(
                        "Écart nombre de lignes journal : snapshot figé vs recompute live — intégrité snapshot 22.6 ; "
                        "ne pas confondre avec le solde espèces (cf. métrique dédiée si présente)."
                    ),
                )
            )
        if _sig(d_cash):
            gaps.append(
                DualReadGapFinding(
                    metric_key="frozen_snapshot_cash_signed_net_vs_live_journal",
                    legacy_value=float(snap.cash_signed_net_from_journal),
                    canonical_value=float(canon.cash_signed_net_from_journal),
                    delta=float(canon.cash_signed_net_from_journal) - float(snap.cash_signed_net_from_journal),
                    taxonomy=DualReadTaxonomy.BUG,
                    blocks_cutover=True,
                    notes="Écart solde espèces (journal) : snapshot figé vs recompute live — intégrité snapshot 22.6.",
                )
            )

    return gaps


def build_dual_read_compare_report(db: Session, cash_session_id: UUID) -> DualReadCompareReport:
    """Compare les colonnes legacy (ventes/session) et canonique (journal strict + extraits)."""
    crit = _criteria()
    eps = _eps()

    cs = db.query(CashSession).filter(CashSession.id == cash_session_id).one_or_none()
    if cs is None:
        raise NotFoundError("Session de caisse introuvable.")

    row = (
        db.query(
            func.coalesce(func.sum(Sale.total_amount), 0.0),
            func.coalesce(func.sum(Sale.donation), 0.0),
            func.count(Sale.id),
        )
        .filter(Sale.cash_session_id == cash_session_id)
        .one()
    )
    sum_total = float(row[0] or 0.0)
    sum_don = float(row[1] or 0.0)
    n_sales = int(row[2] or 0)

    legacy = LegacyBrownfieldSessionRollups(
        cash_session_total_sales_field=float(cs.total_sales or 0.0),
        sum_sales_total_amount=sum_total,
        sum_sales_donation_field=sum_don,
        sale_row_count=n_sales,
    )

    canon = compute_payment_journal_aggregates(
        db,
        cash_session_id=cash_session_id,
        use_legacy_preview_if_no_journal=False,
    )

    inflow = _sale_payment_inflow_sum(db, cash_session_id)
    settle = _settlement_inflow_sum(db, cash_session_id)
    r_cur, r_prior = _refund_sums(db, cash_session_id)
    derived = JournalDerivedScalar(
        sale_payment_inflow_sum=inflow,
        settlement_inflow_sum=settle,
        refund_outflow_sum_current=r_cur,
        refund_outflow_sum_prior_closed=r_prior,
    )

    frozen = _digest_frozen_snapshot(cs)

    gaps = _build_gap_findings(
        eps=eps,
        legacy=legacy,
        canon=canon,
        settlement_inflow_sum=settle,
        refund_cur=r_cur,
        refund_prior=r_prior,
        frozen=frozen,
    )

    blocking = any(g.blocks_cutover for g in gaps)
    unclassified_block = any(g.taxonomy == DualReadTaxonomy.UNCLASSIFIED for g in gaps)

    cutover_ok = not blocking and not unclassified_block

    return DualReadCompareReport(
        cash_session_id=str(cash_session_id),
        legacy_brownfield=legacy,
        canonical_journal=CanonicalJournalStrict(totals=canon),
        journal_derived=derived,
        frozen_snapshot=frozen,
        gap_findings=gaps,
        cutover_indicator_ok=cutover_ok,
        cutover_criteria_version=int(crit.get("version", 1)),
        cutover_criteria={
            "numeric": crit.get("numeric"),
            "exit_criteria": crit.get("exit_criteria"),
            "validation_package": crit.get("validation_package"),
        },
    )


def format_dual_read_report_dict(report: DualReadCompareReport) -> Dict[str, Any]:
    """Dump JSON-friendly (OpenAPI / tests)."""
    return report.model_dump(mode="json")
