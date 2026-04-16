"""Story 22.7 — batch canonique multi-sous-écritures depuis le snapshot figé 22.6 (hors legacy live)."""

from __future__ import annotations

import json
import re
from typing import Any, TypedDict

from recyclic_api.services.paheko_transaction_payload_builder import build_close_transaction_line_payload

PAHEKO_CLOSE_BATCH_STATE_KEY = "paheko_close_batch_state_v1"
"""Clé JSON dans ``PahekoOutboxItem.payload`` pour l'état batch / sous-écritures."""

# Politique de retry documentée (AC5) : rejouer uniquement les sous-écritures non livrées ;
# les sous-clés d'idempotence stables empêchent les doublons distants pour les sous-écritures déjà acceptées.
RETRY_POLICY_RESUME_FAILED_SUB_WRITES = "resume_failed_sub_writes_v1"

SUB_KIND_SALES_DONATIONS = "sales_donations"
SUB_KIND_REFUNDS_CURRENT = "refunds_current_fiscal"
SUB_KIND_REFUNDS_PRIOR_CLOSED = "refunds_prior_closed_fiscal"


class PlannedSubWrite(TypedDict):
    index: int
    kind: str
    amount: float
    swap_debit_credit: bool
    tx_type: str
    label_token: str
    reference_token: str


def _parse_remote_transaction_id(response_text: str) -> str | None:
    if not (response_text or "").strip():
        return None
    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        m = re.search(r'"id"\s*:\s*"?([0-9a-fA-F-]{8,})"?', response_text)
        return m.group(1) if m else None
    if isinstance(data, dict):
        for k in ("id", "transaction_id", "remote_id"):
            v = data.get(k)
            if v is not None and str(v).strip():
                return str(v).strip()
    return None


def sub_write_idempotency_key(batch_idempotency_key: str, index: int, kind: str) -> str:
    """Sous-clé stable par sous-écriture (AC5) — distincte de la clé batch session."""
    return f"{batch_idempotency_key}:sub:{index}:{kind}"


def amounts_from_frozen_snapshot(snapshot: dict[str, Any]) -> tuple[float, float, float]:
    """
    Décomposition déterministe (architecture cash-accounting-paheko-canonical-chain §4) :
    ventes+dons, remb. exercice courant, remb. exercice antérieur clos.

    - ``sales_donations`` = net journal + magnitudes remboursements (reconstitue l'agrégat encaissements).
    - ``refunds_current`` / ``refunds_prior`` = totaux snapshot (métier journal REFUND_PAYMENT).
    """
    totals = snapshot.get("totals") or {}
    by_pm = totals.get("by_payment_method_signed") or {}
    S = round(sum(float(v) for v in by_pm.values()), 2)
    rc = round(float(totals.get("refunds_current_fiscal_total") or 0.0), 2)
    rp = round(float(totals.get("refunds_prior_closed_fiscal_total") or 0.0), 2)
    sales_don = max(0.0, round(S + rc + rp, 2))
    return sales_don, rc, rp


def build_planned_sub_writes(snapshot: dict[str, Any]) -> list[PlannedSubWrite]:
    """Ordre stable : index 0, 1, 2 — même snapshot → même liste."""
    s, rc, rp = amounts_from_frozen_snapshot(snapshot)
    plan: list[PlannedSubWrite] = [
        {
            "index": 0,
            "kind": SUB_KIND_SALES_DONATIONS,
            "amount": s,
            "swap_debit_credit": False,
            "tx_type": "REVENUE",
            "label_token": "VentesDons",
            "reference_token": "sd",
        },
        {
            "index": 1,
            "kind": SUB_KIND_REFUNDS_CURRENT,
            "amount": rc,
            "swap_debit_credit": True,
            "tx_type": "REVENUE",
            "label_token": "RembCourant",
            "reference_token": "rc",
        },
        {
            "index": 2,
            "kind": SUB_KIND_REFUNDS_PRIOR_CLOSED,
            "amount": rp,
            "swap_debit_credit": True,
            "tx_type": "REVENUE",
            "label_token": "RembN1Clos",
            "reference_token": "rp",
        },
    ]
    return plan


def build_paheko_bodies_for_planned_sub_writes(
    enriched_payload: dict[str, Any],
    plan: list[PlannedSubWrite],
) -> tuple[list[tuple[PlannedSubWrite, dict[str, Any] | None]] | None, str | None, str | None]:
    """
    Construit les corps HTTP pour chaque sous-écriture non nulle.
    Les montants nuls → pas de body (traités comme **skipped_zero** au processor).
    """
    csid = (enriched_payload.get("cash_session_id") or "").strip()
    if not csid:
        return None, "invalid_outbox_payload", "cash_session_id absent."

    out: list[tuple[PlannedSubWrite, dict[str, Any] | None]] = []
    for p in plan:
        if p["amount"] <= 0.0:
            out.append((p, None))
            continue
        label = f"Cloture {p['label_token']} {csid[:8]}"
        reference = f"cash-session-close:{csid}:{p['reference_token']}"
        body, code, msg = build_close_transaction_line_payload(
            enriched_payload,
            amount=float(p["amount"]),
            label=label,
            reference=reference,
            tx_type=p["tx_type"],
            swap_debit_credit=p["swap_debit_credit"],
            extra_note_lines=[f"sub_write_index={p['index']}", f"sub_kind={p['kind']}"],
        )
        if code is not None or body is None:
            return None, code or "invalid_sub_write", msg or "Sous-écriture Paheko invalide."
        out.append((p, body))
    return out, None, None


def build_cash_session_close_batch_from_enriched_payload(
    enriched_payload: dict[str, Any],
    *,
    batch_idempotency_key: str,
) -> tuple[
    list[tuple[PlannedSubWrite, dict[str, Any] | None]] | None,
    str | None,
    str | None,
]:
    """
    Point d'entrée : snapshot figé obligatoire (22.6) ; pas de relecture métier hors JSON ``accounting_close_snapshot_frozen``.
    """
    snap = enriched_payload.get("accounting_close_snapshot_frozen")
    if not isinstance(snap, dict):
        return None, "snapshot_missing", "accounting_close_snapshot_frozen absent — batch 22.7 impossible."
    if snap.get("schema_version") != 1:
        return None, "snapshot_version", "schema_version snapshot non supportée pour le builder 22.7."

    plan = build_planned_sub_writes(snap)
    bodies, code, msg = build_paheko_bodies_for_planned_sub_writes(enriched_payload, plan)
    if code is not None:
        return None, code, msg
    assert bodies is not None
    _ = batch_idempotency_key  # réservé traçabilité / extensions
    return bodies, None, None


def initial_batch_state_v1(
    *,
    batch_idempotency_key: str,
    planned: list[tuple[PlannedSubWrite, dict[str, Any] | None]],
) -> dict[str, Any]:
    sub_writes: list[dict[str, Any]] = []
    for p, body in planned:
        st = "skipped_zero" if body is None else "pending"
        sub_writes.append(
            {
                "index": p["index"],
                "kind": p["kind"],
                "idempotency_sub_key": sub_write_idempotency_key(
                    batch_idempotency_key,
                    p["index"],
                    p["kind"],
                ),
                "status": st,
                "remote_transaction_id": None,
                "last_http_status": None,
                "last_error": None,
            }
        )
    return {
        "schema_version": 1,
        "retry_policy": RETRY_POLICY_RESUME_FAILED_SUB_WRITES,
        "batch_idempotency_key": batch_idempotency_key,
        "sub_writes": sub_writes,
        "partial_success": False,
        "all_delivered": False,
    }


def merge_state_with_planned(
    existing: dict[str, Any] | None,
    *,
    batch_idempotency_key: str,
    planned: list[tuple[PlannedSubWrite, dict[str, Any] | None]],
) -> dict[str, Any]:
    """Conserve livraisons / skip / échecs lors des rééxécutions processor (retry ciblé)."""
    fresh = initial_batch_state_v1(batch_idempotency_key=batch_idempotency_key, planned=planned)
    if not isinstance(existing, dict) or existing.get("schema_version") != 1:
        return fresh
    if existing.get("batch_idempotency_key") != batch_idempotency_key:
        return fresh
    old_by_idx: dict[int, dict[str, Any]] = {}
    for s in existing.get("sub_writes") or []:
        if isinstance(s, dict) and "index" in s:
            old_by_idx[int(s["index"])] = s
    for i, sw in enumerate(fresh["sub_writes"]):
        prev = old_by_idx.get(int(sw["index"]))
        if not prev or prev.get("kind") != sw["kind"]:
            continue
        if prev.get("idempotency_sub_key") != sw["idempotency_sub_key"]:
            continue
        if prev.get("status") in ("delivered", "skipped_zero", "failed"):
            merged = {**sw, **prev}
            merged["idempotency_sub_key"] = sw["idempotency_sub_key"]
            fresh["sub_writes"][i] = merged
    return fresh


def parse_remote_transaction_id(response_text: str) -> str | None:
    return _parse_remote_transaction_id(response_text)


__all__ = [
    "PAHEKO_CLOSE_BATCH_STATE_KEY",
    "RETRY_POLICY_RESUME_FAILED_SUB_WRITES",
    "SUB_KIND_REFUNDS_CURRENT",
    "SUB_KIND_REFUNDS_PRIOR_CLOSED",
    "SUB_KIND_SALES_DONATIONS",
    "PlannedSubWrite",
    "amounts_from_frozen_snapshot",
    "build_cash_session_close_batch_from_enriched_payload",
    "build_paheko_bodies_for_planned_sub_writes",
    "build_planned_sub_writes",
    "initial_batch_state_v1",
    "merge_state_with_planned",
    "parse_remote_transaction_id",
    "sub_write_idempotency_key",
]
