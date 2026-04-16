"""Story 22.7 — batch canonique multi-sous-écritures depuis le snapshot figé 22.6 (hors legacy live)."""

from __future__ import annotations

import json
import re
from typing import TYPE_CHECKING, Any, NotRequired, TypedDict

from recyclic_api.services.paheko_transaction_payload_builder import (
    build_close_transaction_advanced_payload,
    build_close_transaction_line_payload,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

PAHEKO_CLOSE_BATCH_STATE_KEY = "paheko_close_batch_state_v1"
"""Clé JSON dans ``PahekoOutboxItem.payload`` pour l'état batch / sous-écritures."""

# Politique de retry documentée (AC5) : rejouer uniquement les sous-écritures non livrées ;
# les sous-clés d'idempotence stables empêchent les doublons distants pour les sous-écritures déjà acceptées.
RETRY_POLICY_RESUME_FAILED_SUB_WRITES = "resume_failed_sub_writes_v1"

SUB_KIND_SALES_DONATIONS = "sales_donations"
SUB_KIND_SALES_DONATIONS_PER_PM = "sales_donations_per_pm_v1"
SUB_KIND_REFUNDS_CURRENT = "refunds_current_fiscal"
SUB_KIND_REFUNDS_PRIOR_CLOSED = "refunds_prior_closed_fiscal"

# Story 23.4 — seul mode supporté : ventilation détaillée (valeur d'observabilité `builder_policy`).
POLICY_DETAILED = "detailed"


class PlannedSubWrite(TypedDict, total=False):
    index: int
    kind: str
    amount: float
    swap_debit_credit: bool
    tx_type: str
    label_token: str
    reference_token: str
    http_body: dict[str, Any]
    observability: dict[str, Any]


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


def _r2(x: float) -> float:
    return round(float(x), 2)


def amounts_from_frozen_snapshot(snapshot: dict[str, Any]) -> tuple[float, float, float]:
    """
    Décomposition déterministe (architecture cash-accounting-paheko-canonical-chain §4) :
    ventes+dons, remb. exercice courant, remb. exercice antérieur clos.

    - ``sales_donations`` = net journal + magnitudes remboursements (reconstitue l'agrégat encaissements).
    - ``refunds_current`` / ``refunds_prior`` = totaux snapshot (métier journal REFUND_PAYMENT).
    """
    totals = snapshot.get("totals") or {}
    by_pm = totals.get("by_payment_method_signed") or {}
    s = round(sum(float(v) for v in by_pm.values()), 2)
    rc = round(float(totals.get("refunds_current_fiscal_total") or 0.0), 2)
    rp = round(float(totals.get("refunds_prior_closed_fiscal_total") or 0.0), 2)
    sales_don = max(0.0, round(s + rc + rp, 2))
    return sales_don, rc, rp


def _sum_by_payment_methods(snapshot: dict[str, Any]) -> float:
    totals = snapshot.get("totals") or {}
    by_pm = totals.get("by_payment_method_signed") or {}
    return _r2(sum(float(v) for v in by_pm.values()))


def _load_revision_payment_accounts(
    db: Session,
    revision_id: str,
) -> tuple[dict[str, str], str, str] | None:
    from uuid import UUID

    from recyclic_api.models.accounting_config import AccountingConfigRevision

    try:
        rid = UUID(str(revision_id).strip())
    except (ValueError, TypeError):
        return None
    rev = db.get(AccountingConfigRevision, rid)
    if rev is None or not (rev.snapshot_json or "").strip():
        return None
    try:
        snap = json.loads(rev.snapshot_json)
    except json.JSONDecodeError:
        return None
    if not isinstance(snap, dict):
        return None
    ga = snap.get("global_accounts") or {}
    sales = str(ga.get("default_sales_account") or "").strip()
    dont = str(ga.get("default_donation_account") or "").strip()
    if not sales or not dont:
        return None
    by_code: dict[str, str] = {}
    for m in snap.get("payment_methods") or []:
        if not isinstance(m, dict):
            continue
        code = str(m.get("code") or "").strip().lower()
        acc = str(m.get("paheko_debit_account") or "").strip()
        if code and acc:
            by_code[code] = acc
    return by_code, sales, dont


def _build_sales_donations_planned_row_per_pm(
    snapshot: dict[str, Any],
    enriched_payload: dict[str, Any],
    *,
    db: Session,
) -> tuple[PlannedSubWrite | None, str | None, str | None]:
    totals = snapshot.get("totals") or {}
    by_pm_raw = totals.get("by_payment_method_signed") or {}
    if not isinstance(by_pm_raw, dict):
        return None, "invalid_snapshot", "by_payment_method_signed invalide dans le snapshot."
    donation = _r2(float(totals.get("donation_surplus_total") or 0.0))
    t_raw = _sum_by_payment_methods(snapshot)
    rev_id = snapshot.get("accounting_config_revision_id")
    if not rev_id or not str(rev_id).strip():
        return None, "snapshot_missing_revision", "accounting_config_revision_id absent — ventilation par moyen impossible."
    resolved = _load_revision_payment_accounts(db, str(rev_id))
    if resolved is None:
        return None, "revision_not_found", "Révision comptable introuvable ou snapshot JSON invalide."
    accounts_by_code, sales_acc, dont_acc = resolved

    entries: list[tuple[str, float]] = []
    for code in sorted(by_pm_raw.keys()):
        raw_amt = float(by_pm_raw[code])
        amt = _r2(raw_amt)
        if abs(amt) < 0.005:
            continue
        entries.append((str(code).strip().lower(), amt))
    t_net = _r2(sum(amt for _, amt in entries))

    if donation > 0.004 and not entries:
        return None, "incoherent_donation", "donation_surplus_total > 0 sans lignes d'encaissement non nulles."

    lines: list[dict[str, Any]] = []
    obs_lines: list[dict[str, Any]] = []
    csid = str(enriched_payload.get("cash_session_id") or "").strip()
    ref_base = f"cash-session-close-pm:{csid}"

    for code, amt in entries:
        acc = accounts_by_code.get(code)
        if not acc:
            return None, "unknown_payment_method_code", f"Code moyen « {code} » absent de la révision {rev_id}."
        if amt > 0:
            lines.append(
                {
                    "account": acc,
                    "debit": amt,
                    "label": f"Encaissement {code}",
                    "reference": f"{ref_base}:{code}:in",
                }
            )
        else:
            cred = _r2(-amt)
            lines.append(
                {
                    "account": acc,
                    "credit": cred,
                    "label": f"Décaissement {code}",
                    "reference": f"{ref_base}:{code}:out",
                }
            )
        obs_lines.append(
            {
                "line_index": len(obs_lines),
                "payment_method_code": code,
                "amount": amt,
                "account": acc,
                "direction": "debit" if amt > 0 else "credit",
            }
        )

    sales_credit = _r2(t_net - donation)
    if sales_credit < -0.01:
        return None, "incoherent_sales_credit", "Crédit ventes négatif : incohérence snapshot / dons."

    if sales_credit > 0.004:
        lines.append(
            {
                "account": sales_acc,
                "credit": sales_credit,
                "label": "Ventes (compte global révision)",
                "reference": f"{ref_base}:credit:sales",
            }
        )
        obs_lines.append(
            {
                "line_index": len(obs_lines),
                "payment_method_code": None,
                "amount": sales_credit,
                "account": sales_acc,
                "role": "sales_credit",
            }
        )
    elif sales_credit < -0.004:
        return None, "incoherent_sales_credit", "Crédit ventes négatif après arrondi."

    if donation > 0.004:
        lines.append(
            {
                "account": dont_acc,
                "credit": donation,
                "label": "Dons surplus (compte global révision)",
                "reference": f"{ref_base}:credit:donation",
            }
        )
        obs_lines.append(
            {
                "line_index": len(obs_lines),
                "payment_method_code": None,
                "amount": donation,
                "account": dont_acc,
                "role": "donation_credit",
            }
        )

    if not lines:
        row: PlannedSubWrite = {
            "index": 0,
            "kind": SUB_KIND_SALES_DONATIONS_PER_PM,
            "amount": 0.0,
            "swap_debit_credit": False,
            "tx_type": "ADVANCED",
            "label_token": "VentesDonsPm",
            "reference_token": "sd_pm",
            "observability": {
                "builder_policy": POLICY_DETAILED,
                "accounting_config_revision_id": str(rev_id),
                "lines": [],
                "body_format": "skipped_zero",
            },
        }
        return row, None, None

    td = sum(float(x.get("debit") or 0) for x in lines)
    tc = sum(float(x.get("credit") or 0) for x in lines)
    drift = _r2(td - tc)
    if abs(drift) > 0.01:
        for i in range(len(lines) - 1, -1, -1):
            cside = lines[i].get("credit")
            if cside is not None:
                lines[i]["credit"] = _r2(float(cside) + drift)
                if i < len(obs_lines):
                    obs_lines[i]["amount"] = lines[i]["credit"]
                break
        td = sum(float(x.get("debit") or 0) for x in lines)
        tc = sum(float(x.get("credit") or 0) for x in lines)
        if abs(_r2(td - tc)) > 0.01:
            return None, "unbalanced_advanced", f"Écriture ADVANCED non équilibrée après reprise d'arrondi ({td} / {tc})."

    label = f"Cloture VentesDonsPm {csid[:8]}"
    reference = f"{ref_base}:sd_pm"
    adv_body, code, msg = build_close_transaction_advanced_payload(
        enriched_payload,
        lines=lines,
        label=label,
        reference=reference,
        extra_note_lines=[
            "sub_write_index=0",
            f"sub_kind={SUB_KIND_SALES_DONATIONS_PER_PM}",
            f"accounting_config_revision_id={rev_id}",
        ],
    )
    if code is not None or adv_body is None:
        return None, code or "invalid_sub_write", msg or "Construction ADVANCED impossible."

    obs = {
        "builder_policy": POLICY_DETAILED,
        "accounting_config_revision_id": str(rev_id),
        "body_format": "ADVANCED",
        "lines": obs_lines,
        "totals": {
            "journal_signed_S_raw": t_raw,
            "journal_signed_S_lines": t_net,
            "donation_surplus_total": donation,
            "sales_credit": sales_credit,
        },
    }
    row_pm: PlannedSubWrite = {
        "index": 0,
        "kind": SUB_KIND_SALES_DONATIONS_PER_PM,
        "amount": max(0.0, t_net),
        "swap_debit_credit": False,
        "tx_type": "ADVANCED",
        "label_token": "VentesDonsPm",
        "reference_token": "sd_pm",
        "http_body": adv_body,
        "observability": obs,
    }
    return row_pm, None, None


def build_planned_sub_writes(
    snapshot: dict[str, Any],
    *,
    db: Session | None = None,
    enriched_payload: dict[str, Any] | None = None,
) -> tuple[list[PlannedSubWrite], str | None, str | None]:
    """
    Ordre stable : index 0, 1, 2 — même snapshot → même liste (sauf erreur métier explicite).

    Story 23.4 : une seule politique — sous-écriture 0 = ventilation détaillée par moyen de paiement (ADVANCED).
    """
    _, rc, rp = amounts_from_frozen_snapshot(snapshot)
    refunds_rows: list[PlannedSubWrite] = [
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

    if db is None:
        return [], "revision_resolution_requires_db", "Ventilation par moyen : session SQLAlchemy requise (révision publiée)."
    if enriched_payload is None or not isinstance(enriched_payload, dict):
        return [], "invalid_outbox_payload", "enriched_payload requis pour le builder Paheko clôture."
    pm_row, err, msg = _build_sales_donations_planned_row_per_pm(snapshot, enriched_payload, db=db)
    if err is not None:
        return [], err, msg or err
    assert pm_row is not None
    return [pm_row, *refunds_rows], None, None


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
        if p.get("http_body") is not None:
            out.append((p, p["http_body"]))
            continue
        if p["amount"] <= 0.0:
            out.append((p, None))
            continue
        # Aligner sur l'ancien POST mono-ligne (8.3) : préfixe expert issu du mapping, pas le token interne.
        lp = str(enriched_payload.get("label_prefix") or "").strip() or "Cloture caisse"
        label = f"{lp} {csid[:8]}"
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
    db: Session | None = None,
) -> tuple[
    list[tuple[PlannedSubWrite, dict[str, Any] | None]] | None,
    str | None,
    str | None,
]:
    """
    Point d'entrée : snapshot figé obligatoire (22.6) ; pas de relecture métier hors JSON ``accounting_close_snapshot_frozen``.

    Story 23.4 : ``db`` obligatoire pour résoudre la révision et ventiler l'index 0 par moyen de paiement.
    """
    snap = enriched_payload.get("accounting_close_snapshot_frozen")
    if not isinstance(snap, dict):
        return None, "snapshot_missing", "accounting_close_snapshot_frozen absent — batch 22.7 impossible."
    if snap.get("schema_version") != 1:
        return None, "snapshot_version", "schema_version snapshot non supportée pour le builder 22.7."

    plan, perr, pmsg = build_planned_sub_writes(
        snap,
        db=db,
        enriched_payload=enriched_payload,
    )
    if perr is not None:
        return None, perr, pmsg or perr
    bodies, code, msg = build_paheko_bodies_for_planned_sub_writes(enriched_payload, plan)
    if code is not None:
        return None, code, msg
    assert bodies is not None
    _ = batch_idempotency_key
    return bodies, None, None


def initial_batch_state_v1(
    *,
    batch_idempotency_key: str,
    planned: list[tuple[PlannedSubWrite, dict[str, Any] | None]],
) -> dict[str, Any]:
    sub_writes: list[dict[str, Any]] = []
    for p, body in planned:
        st = "skipped_zero" if body is None else "pending"
        entry: dict[str, Any] = {
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
        if "observability" in p:
            entry["observability"] = p["observability"]
        sub_writes.append(entry)
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
            if merged.get("observability") is None and sw.get("observability"):
                merged["observability"] = sw["observability"]
            fresh["sub_writes"][i] = merged
    return fresh


def parse_remote_transaction_id(response_text: str) -> str | None:
    return _parse_remote_transaction_id(response_text)


__all__ = [
    "PAHEKO_CLOSE_BATCH_STATE_KEY",
    "POLICY_DETAILED",
    "RETRY_POLICY_RESUME_FAILED_SUB_WRITES",
    "SUB_KIND_REFUNDS_CURRENT",
    "SUB_KIND_REFUNDS_PRIOR_CLOSED",
    "SUB_KIND_SALES_DONATIONS",
    "SUB_KIND_SALES_DONATIONS_PER_PM",
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
