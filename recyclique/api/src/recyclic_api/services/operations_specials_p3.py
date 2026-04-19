"""Story 24.10 (P3) — activation caisse, preuves D8 et seuils opérations spéciales."""

from __future__ import annotations

from typing import Any, Mapping, Optional

from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.sale_reversal import RefundReasonCode

# Clé sous ``cash_registers.workflow_options["features"]`` (transition P2 → P3 documentée story 24.10).
WORKFLOW_FEATURE_OPERATIONS_SPECIALS_P3 = "operations_specials_p3"

# Seuil métier (EUR) : au-delà, combinaison motif ERREUR_SAISIE refusée si P3 actif (NEEDS_HITL léger possible au-delà du socle).
EXCEPTIONAL_REFUND_STRICT_AMOUNT_THRESHOLD_EUR = 150.0


def register_operations_specials_p3_enabled(register: Optional[CashRegister]) -> bool:
    """P3 : préférences JSON registre — évite un second rail Paheko (métadonnées hors outbox)."""
    if register is None:
        return False
    wo: Mapping[str, Any] = register.workflow_options or {}
    features: Mapping[str, Any] = wo.get("features") or {}
    block: Mapping[str, Any] = features.get(WORKFLOW_FEATURE_OPERATIONS_SPECIALS_P3) or {}
    return bool(block.get("enabled"))


def validate_exceptional_refund_p3_rules(
    *,
    p3_enabled: bool,
    amount: float,
    reason_code: str,
    approval_evidence_ref: Optional[str],
) -> None:
    """
    ADR D8 : référence structurée obligatoire pour chemins N3 lorsque P3 actif.
    Seuil + motif : règle serveur explicite (AC3) — 422 via ValidationError côté route.
    """
    from recyclic_api.core.exceptions import ValidationError

    if not p3_enabled:
        return

    ref = (approval_evidence_ref or "").strip()
    if len(ref) < 3:
        raise ValidationError(
            "P3 actif sur le poste de caisse : une référence de preuve structurée "
            "(champ approval_evidence_ref, min. 3 caractères) est obligatoire — ADR D8."
        )

    if amount >= EXCEPTIONAL_REFUND_STRICT_AMOUNT_THRESHOLD_EUR and reason_code == RefundReasonCode.ERREUR_SAISIE.value:
        raise ValidationError(
            f"P3 actif : pour un remboursement exceptionnel d'au moins "
            f"{EXCEPTIONAL_REFUND_STRICT_AMOUNT_THRESHOLD_EUR:g} €, le motif ERREUR_SAISIE "
            "n'est pas accepté (seuil métier ; choisir un autre motif ou une procédure dérogatoire)."
        )
