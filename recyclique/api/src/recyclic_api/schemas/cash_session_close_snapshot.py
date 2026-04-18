"""Story 22.6 — snapshot comptable figé produit à la clôture (contrat versionné JSON)."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

CorrectionPolicyV1 = Literal["append_only_v1"]
"""Politique unique retenue (story 22.6) : corrections post-clôture = lignes d'ajustement append-only ; pas d'UPDATE du snapshot figé."""


class CashSessionDisbursementLineV1(BaseModel):
    """Story 24.7 — ligne de décaissement pour libellés Paheko traçables (hors remboursement client)."""

    payment_method_code: str
    amount: float = Field(..., description="Montant décaissé (positif).")
    subtype: str
    label_fr: str


class CashSessionJournalTotalsV1(BaseModel):
    """Agrégats dérivés exclusivement du journal ``payment_transactions`` pour la session."""

    by_payment_method_signed: Dict[str, float] = Field(
        ...,
        description="Somme signée par code de moyen de paiement (encaissements − décaissements).",
    )
    refunds_current_fiscal_by_payment_method: Dict[str, float] = Field(
        default_factory=dict,
        description="Remboursements exercice courant (REFUND_PAYMENT, hors N−1) par code expert / clé agrégée.",
    )
    refunds_prior_closed_fiscal_by_payment_method: Dict[str, float] = Field(
        default_factory=dict,
        description="Remboursements N−1 clos (REFUND_PAYMENT + is_prior_year_special_case) par code.",
    )
    donation_surplus_total: float = Field(
        0.0,
        description="Total dons en surplus (nature donation_surplus, flux entrants).",
    )
    refunds_current_fiscal_total: float = Field(
        0.0,
        description="Montants remboursés — exercice courant (hors cas N−1 expert).",
    )
    refunds_prior_closed_fiscal_total: float = Field(
        0.0,
        description="Montants remboursés — cas exercice antérieur clos (drapeau is_prior_year_special_case).",
    )
    cash_signed_net_from_journal: float = Field(
        ...,
        description="Solde net espèces issu du journal (hors fond initial de caisse).",
    )
    payment_transaction_line_count: int = Field(
        ...,
        description="Nombre de lignes du journal rattachées à la session.",
    )
    preview_fallback_legacy_totals: bool = Field(
        False,
        description="True si aucune ligne journal pour la session : le préavis clôture a utilisé totaux legacy.",
    )
    cash_disbursement_lines: List[CashSessionDisbursementLineV1] = Field(
        default_factory=list,
        description="Story 24.7 — détails décaissements pour libellés d'export (distinct remboursement / 24.8).",
    )


class CashSessionCloseSnapshotClosingV1(BaseModel):
    """Montants de clôture terrain (caisse réelle vs attendue) au moment du figement."""

    theoretical_cash_amount: float
    actual_cash_amount: float
    cash_variance: float


class CashSessionAccountingCloseSnapshotV1(BaseModel):
    """Snapshot immutable persisté — les consommateurs aval (ex. 22.7 Paheko) ne relisent pas le live."""

    # 1 = historique (remboursements scalaires seuls côté Paheko mono-ligne si dicts vides).
    # 2 = courant : ventilation remboursements par moyen + dicts journal (P2 Paheko).
    schema_version: Literal[1, 2] = 2
    correction_policy: CorrectionPolicyV1 = "append_only_v1"

    session_id: str
    site_id: str
    register_id: Optional[str] = None
    accounting_config_revision_id: Optional[str] = None

    sync_correlation_id: str
    local_prep_state: Literal["snapshot_persisted_outbox_enqueued_v1"] = "snapshot_persisted_outbox_enqueued_v1"

    closed_at_utc: Optional[str] = None
    totals: CashSessionJournalTotalsV1
    closing: CashSessionCloseSnapshotClosingV1

    def model_dump_for_storage(self) -> Dict[str, Any]:
        """Dump JSON-compatible (pour colonne JSON / outbox)."""
        return self.model_dump(mode="json")
