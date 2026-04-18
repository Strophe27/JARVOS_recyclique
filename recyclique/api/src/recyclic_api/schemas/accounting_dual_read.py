"""Story 22.2 — schémas rapport double lecture legacy vs journal canonique."""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from recyclic_api.schemas.cash_session_close_snapshot import CashSessionJournalTotalsV1


class DualReadTaxonomy(str, Enum):
    MODEL = "MODEL"
    HISTORICAL_DATA = "HISTORICAL_DATA"
    ROUNDING = "ROUNDING"
    BUG = "BUG"
    MISSING_CONTRACT = "MISSING_CONTRACT"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"
    UNCLASSIFIED = "UNCLASSIFIED"


class LegacyBrownfieldSessionRollups(BaseModel):
    """Référentiel brownfield encore exposé (session + agrégats ventes)."""

    cash_session_total_sales_field: float = Field(
        ...,
        description="Champ dénormalisé `cash_sessions.total_sales`.",
    )
    sum_sales_total_amount: float = Field(
        ...,
        description="Somme des `sales.total_amount` pour la session (encaissement brut par ticket).",
    )
    sum_sales_net_amount: float = Field(
        ...,
        description="Somme ``sales.total_amount - coalesce(sales.donation,0)`` (partie « ventes » hors ventilation don sur ticket).",
    )
    sum_sales_donation_field: float = Field(
        ...,
        description="Somme des `sales.donation` (champ historique, non équivalent au journal don surplus).",
    )
    sale_row_count: int = Field(..., description="Nombre de tickets dans la session.")


class CanonicalJournalStrict(BaseModel):
    """Agrégats canoniques sans repli preview (journal seul ; flag fallback explicite)."""

    totals: CashSessionJournalTotalsV1


class JournalDerivedScalar(BaseModel):
    """Montants dérivés du journal pour comparaison contrôlée."""

    sale_payment_inflow_sum: float = Field(
        ...,
        description="Somme des montants des lignes SALE_PAYMENT en INFLOW (hors don surplus).",
    )
    settlement_inflow_sum: float = Field(
        ...,
        description="Somme des encaissements liés au ticket : SALE_PAYMENT + DONATION_SURPLUS en INFLOW.",
    )
    refund_outflow_sum_current: float = Field(
        0.0,
        description="Somme des remboursements hors cas N−1 (montants positifs stockés).",
    )
    refund_outflow_sum_prior_closed: float = Field(
        0.0,
        description="Somme des remboursements cas exercice antérieur clos.",
    )


class DualReadGapFinding(BaseModel):
    """Un écart chiffré entre deux colonnes, avec classification unique."""

    metric_key: str
    legacy_value: Optional[float] = None
    canonical_value: Optional[float] = None
    delta: Optional[float] = None
    taxonomy: DualReadTaxonomy
    blocks_cutover: bool = Field(
        ...,
        description="Si True, l'écart interdit un signal global « prêt » tant qu'il n'est pas résolu ou réétiqueté.",
    )
    notes: str = ""


class FrozenSnapshotTotalsDigest(BaseModel):
    """Si session clôturée, extrait du snapshot 22.6 pour contrôle fin de chaîne."""

    present: bool = False
    sync_correlation_id: Optional[str] = None
    totals_from_snapshot: Optional[CashSessionJournalTotalsV1] = None


class DualReadCompareReport(BaseModel):
    """Rapport JSON structuré pour opérateurs / pytest (story 22.2)."""

    cash_session_id: str
    schema_version: int = 1
    legacy_brownfield: LegacyBrownfieldSessionRollups
    canonical_journal: CanonicalJournalStrict
    journal_derived: JournalDerivedScalar
    frozen_snapshot: FrozenSnapshotTotalsDigest = Field(default_factory=FrozenSnapshotTotalsDigest)
    gap_findings: List[DualReadGapFinding] = Field(default_factory=list)
    # Jamais « prêt » si écarts bloquants ou non classés significatifs (DoD 22.2).
    cutover_indicator_ok: bool = Field(
        False,
        description="False si tout écart significatif doit encore être revu (pas de faux vert).",
    )
    cutover_criteria_version: int = Field(1, description="Version du YAML critères cutover embarqué.")
    cutover_criteria: Dict[str, Any] = Field(
        default_factory=dict,
        description="Extrait des critères (seuils) pour traçabilité dans l'artefact.",
    )
