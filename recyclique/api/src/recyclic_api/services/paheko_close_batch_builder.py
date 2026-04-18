"""Story 22.7 — batch canonique multi-sous-écritures depuis le snapshot figé 22.6 (hors legacy live)."""

from __future__ import annotations

import json
import re
from typing import TYPE_CHECKING, Any, TypedDict

from recyclic_api.services.paheko_transaction_payload_builder import (
    build_close_transaction_advanced_payload,
    build_close_transaction_line_payload,
    paheko_close_document_reference_base,
    session_date_iso_for_paheko,
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
# Remboursements mono-ligne REVENUE (compat snapshots schema_version 1 sans ventilation par moyen).
SUB_KIND_REFUNDS_CURRENT = "refunds_current_fiscal"
SUB_KIND_REFUNDS_PRIOR_CLOSED = "refunds_prior_closed_fiscal"
# P2 — ventilation ADVANCED par moyen (index 1 / 2 inchangés, **kind** distinct → idempotence sous-écriture).
SUB_KIND_REFUNDS_CURRENT_PER_PM_V1 = "refunds_current_fiscal_per_pm_v1"
SUB_KIND_REFUNDS_PRIOR_CLOSED_PER_PM_V1 = "refunds_prior_closed_fiscal_per_pm_v1"

# Story 23.4 — seul mode supporté : ventilation détaillée (valeur d'observabilité `builder_policy`).
POLICY_DETAILED = "detailed"

_PM_ENC_FR: dict[str, str] = {
    "cash": "Encaissement espèces",
    "check": "Encaissement chèque",
    "cheque": "Encaissement chèque",
    "card": "Encaissement carte",
    "transfer": "Encaissement virement",
    "bank": "Encaissement virement",
}
_PM_DEC_FR: dict[str, str] = {
    "cash": "Décaissement espèces",
    "check": "Décaissement chèque",
    "cheque": "Décaissement chèque",
    "card": "Décaissement carte",
    "transfer": "Décaissement virement",
    "bank": "Décaissement virement",
}


def _paheko_pm_encaissement_label_fr(code: str) -> str:
    c = (code or "").strip().lower()
    return _PM_ENC_FR.get(c, f"Encaissement {c}")


def _paheko_pm_decaissement_label_fr(code: str) -> str:
    c = (code or "").strip().lower()
    return _PM_DEC_FR.get(c, f"Décaissement {c}")


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
) -> tuple[dict[str, str], dict[str, str], str, str, str | None] | None:
    """Retourne (débit encaissement par code, crédit remboursement par code, ventes, dons, compte N-1 remb.)."""
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
    prior_refund = str(ga.get("prior_year_refund_account") or "").strip() or None
    if not sales or not dont:
        return None
    debit_by_code: dict[str, str] = {}
    refund_credit_by_code: dict[str, str] = {}
    for m in snap.get("payment_methods") or []:
        if not isinstance(m, dict):
            continue
        code = str(m.get("code") or "").strip().lower()
        acc = str(m.get("paheko_debit_account") or "").strip()
        ref_acc = str(m.get("paheko_refund_credit_account") or "").strip()
        if code and acc:
            debit_by_code[code] = acc
        if code and ref_acc:
            refund_credit_by_code[code] = ref_acc
    return debit_by_code, refund_credit_by_code, sales, dont, prior_refund


def _snapshot_uses_refund_per_pm_paheko(snapshot: dict[str, Any]) -> bool:
    """
    True → sous-écritures 1/2 en ADVANCED par moyen (kinds ``*_per_pm_v1``), pas en REVENUE mono-montant.

    Toute valeur de ``schema_version`` : ventilation si au moins un bucket a un scalaire > 0 **et** un dict
    dont la somme ≈ le scalaire ; sinon repli mono-ligne REVENUE (données partielles / migration).
    """
    totals = snapshot.get("totals") or {}
    rc_m_raw = totals.get("refunds_current_fiscal_by_payment_method") or {}
    rp_m_raw = totals.get("refunds_prior_closed_fiscal_by_payment_method") or {}
    rc_m: dict[str, Any] = rc_m_raw if isinstance(rc_m_raw, dict) else {}
    rp_m: dict[str, Any] = rp_m_raw if isinstance(rp_m_raw, dict) else {}
    rc_tot = _r2(float(totals.get("refunds_current_fiscal_total") or 0.0))
    rp_tot = _r2(float(totals.get("refunds_prior_closed_fiscal_total") or 0.0))

    def _dict_covers_scalar(amount: float, m: dict[str, Any]) -> bool:
        if amount <= 0.005:
            return False
        if not m:
            return False
        s = _r2(sum(_r2(float(v)) for v in m.values()))
        return abs(s - amount) <= 0.02

    return _dict_covers_scalar(rc_tot, rc_m) or _dict_covers_scalar(rp_tot, rp_m)


def _fr_refund_pm_line_label(code: str, *, prior_closed: bool) -> str:
    c = (code or "").strip().lower() or "inconnu"
    if prior_closed:
        return f"Remboursement {c} (N-1 clos)"
    return f"Remboursement {c} (exercice courant)"


def _build_refund_bucket_per_pm_planned_write(
    snapshot: dict[str, Any],
    enriched_payload: dict[str, Any],
    *,
    db: Session,
    index: int,
    kind: str,
    prior_closed: bool,
    by_pm_raw: dict[str, Any],
    total_scalar: float,
    label_token: str,
    reference_token: str,
) -> tuple[PlannedSubWrite | None, str | None, str | None]:
    """Une sous-écriture ADVANCED : crédits ``paheko_refund_credit_account`` par code, débit compte de contrepartie."""
    ts = _r2(float(total_scalar))
    if ts <= 0.005:
        row_zero: PlannedSubWrite = {
            "index": index,
            "kind": kind,
            "amount": 0.0,
            "swap_debit_credit": False,
            "tx_type": "ADVANCED",
            "label_token": label_token,
            "reference_token": reference_token,
            "observability": {
                "builder_policy": POLICY_DETAILED,
                "body_format": "skipped_zero",
                "bucket": "prior_closed" if prior_closed else "current_fiscal",
            },
        }
        return row_zero, None, None

    if not isinstance(by_pm_raw, dict):
        return None, "invalid_snapshot", "Ventilation remboursements : dict par moyen invalide."

    entries: list[tuple[str, float]] = []
    for code in sorted(by_pm_raw.keys()):
        raw_amt = float(by_pm_raw[code])
        amt = _r2(raw_amt)
        if amt <= 0.005:
            continue
        entries.append((str(code).strip().lower(), amt))

    sum_lines = _r2(sum(a for _, a in entries))
    if not entries or abs(sum_lines - ts) > 0.02:
        return (
            None,
            "refund_per_pm_breakdown_mismatch",
            f"Remboursements {'N-1 clos' if prior_closed else 'courant'} : total {ts} vs ventilation {sum_lines}.",
        )

    rev_id = snapshot.get("accounting_config_revision_id")
    if not rev_id or not str(rev_id).strip():
        return None, "snapshot_missing_revision", "accounting_config_revision_id absent — ventilation remboursements impossible."
    resolved = _load_revision_payment_accounts(db, str(rev_id))
    if resolved is None:
        return None, "revision_not_found", "Révision comptable introuvable ou snapshot JSON invalide."
    _deb, refund_by_code, sales_acc, _dont, prior_refund_acc = resolved

    contra = prior_refund_acc if prior_closed else sales_acc
    if prior_closed and not (prior_refund_acc or "").strip():
        return (
            None,
            "prior_refund_account_missing",
            "global_accounts.prior_year_refund_account absent — remboursements N-1 clos impossibles.",
        )

    csid = str(enriched_payload.get("cash_session_id") or "").strip()
    ref_doc = paheko_close_document_reference_base(enriched_payload)
    if not ref_doc:
        return None, "invalid_outbox_payload", "cash_session_id absent pour références Paheko."

    lines: list[dict[str, Any]] = []
    obs_lines: list[dict[str, Any]] = []
    for code, amt in entries:
        r_acc = refund_by_code.get(code)
        if not r_acc:
            return None, "unknown_payment_method_code", f"Code moyen « {code} » sans paheko_refund_credit_account en révision {rev_id}."
        lines.append(
            {
                "account": r_acc,
                "credit": amt,
                "label": _fr_refund_pm_line_label(code, prior_closed=prior_closed),
                "reference": f"{ref_doc}:{reference_token}:{code}:credit",
            }
        )
        obs_lines.append(
            {
                "line_index": len(obs_lines),
                "payment_method_code": code,
                "amount": amt,
                "account": r_acc,
                "direction": "credit",
                "bucket": "prior_closed" if prior_closed else "current_fiscal",
            }
        )

    lines.append(
        {
            "account": contra,
            "debit": ts,
            "label": "Ventilation remboursements — N-1 clos"
            if prior_closed
            else "Ventilation remboursements — exercice courant",
            "reference": f"{ref_doc}:{reference_token}:debit",
        }
    )
    obs_lines.append(
        {
            "line_index": len(obs_lines),
            "payment_method_code": None,
            "amount": ts,
            "account": contra,
            "direction": "debit",
            "role": "contra_refund_bucket",
        }
    )

    td = sum(float(x.get("debit") or 0) for x in lines)
    tc = sum(float(x.get("credit") or 0) for x in lines)
    drift = _r2(td - tc)
    if abs(drift) > 0.01:
        return None, "unbalanced_advanced", f"Remboursements ADVANCED non équilibrés ({td} / {tc})."

    prefix = str(enriched_payload.get("label_prefix") or "").strip() or "Clôture caisse"
    session_date = session_date_iso_for_paheko(enriched_payload)
    label = (
        f"{prefix} — {session_date}"
        if session_date
        else f"{prefix} — {csid[:8]}"
    )
    reference = f"{ref_doc}:{reference_token}"
    adv_body, adv_err, adv_msg = build_close_transaction_advanced_payload(
        enriched_payload,
        lines=lines,
        label=label,
        reference=reference,
        extra_note_lines=None,
    )
    if adv_err is not None or adv_body is None:
        return None, adv_err or "invalid_sub_write", adv_msg or "Construction ADVANCED remboursements impossible."

    obs = {
        "builder_policy": POLICY_DETAILED,
        "accounting_config_revision_id": str(rev_id),
        "body_format": "ADVANCED",
        "bucket": "prior_closed" if prior_closed else "current_fiscal",
        "lines": obs_lines,
        "totals": {"bucket_total": ts, "scalar_total_check": ts},
    }
    row: PlannedSubWrite = {
        "index": index,
        "kind": kind,
        "amount": ts,
        "swap_debit_credit": False,
        "tx_type": "ADVANCED",
        "label_token": label_token,
        "reference_token": reference_token,
        "http_body": adv_body,
        "observability": obs,
    }
    return row, None, None


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
    accounts_by_code, _refund_credit_by_pm, sales_acc, dont_acc, _prior_ref = resolved

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
    ref_doc = paheko_close_document_reference_base(enriched_payload)
    if not ref_doc:
        return None, "invalid_outbox_payload", "cash_session_id absent pour références Paheko."

    # Story 24.7 — libellés crédit par sous-type décaissement (évite un seul « divers » masquant le métier).
    disb_raw = totals.get("cash_disbursement_lines")
    disb_by_pm: dict[str, list[tuple[float, str]]] = {}
    if isinstance(disb_raw, list):
        for row in disb_raw:
            if not isinstance(row, dict):
                continue
            pm_c = str(row.get("payment_method_code") or "").strip().lower()
            a = _r2(float(row.get("amount") or 0.0))
            lab = str(row.get("label_fr") or "").strip()
            if not pm_c or a <= 0.005:
                continue
            if not lab:
                lab = _paheko_pm_decaissement_label_fr(pm_c)
            disb_by_pm.setdefault(pm_c, []).append((a, lab))

    for code, amt in entries:
        acc = accounts_by_code.get(code)
        if not acc:
            return None, "unknown_payment_method_code", f"Code moyen « {code} » absent de la révision {rev_id}."
        if amt > 0:
            lines.append(
                {
                    "account": acc,
                    "debit": amt,
                    "label": _paheko_pm_encaissement_label_fr(code),
                    "reference": f"{ref_doc}:{code}:in",
                }
            )
            obs_lines.append(
                {
                    "line_index": len(obs_lines),
                    "payment_method_code": code,
                    "amount": amt,
                    "account": acc,
                    "direction": "debit",
                }
            )
            continue

        cred = _r2(-amt)
        remaining = cred
        dq = list(disb_by_pm.get(code, []))
        for idx, (d_amt, d_lab) in enumerate(dq):
            if remaining <= 0.005:
                break
            d_amt = _r2(d_amt)
            take = _r2(min(remaining, d_amt))
            if take <= 0.005:
                continue
            lines.append(
                {
                    "account": acc,
                    "credit": take,
                    "label": d_lab,
                    "reference": f"{ref_doc}:{code}:out:disb:{idx}",
                }
            )
            obs_lines.append(
                {
                    "line_index": len(obs_lines),
                    "payment_method_code": code,
                    "amount": -take,
                    "account": acc,
                    "direction": "credit",
                    "role": "disbursement_typed",
                }
            )
            remaining = _r2(remaining - take)
        if remaining > 0.005:
            lines.append(
                {
                    "account": acc,
                    "credit": remaining,
                    "label": _paheko_pm_decaissement_label_fr(code),
                    "reference": f"{ref_doc}:{code}:out",
                }
            )
            obs_lines.append(
                {
                    "line_index": len(obs_lines),
                    "payment_method_code": code,
                    "amount": -remaining,
                    "account": acc,
                    "direction": "credit",
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
                "label": "Ventes de la session",
                "reference": f"{ref_doc}:credit:sales",
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
                "label": "Dons de la session",
                "reference": f"{ref_doc}:credit:donation",
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

    prefix = str(enriched_payload.get("label_prefix") or "").strip() or "Clôture caisse"
    session_date = session_date_iso_for_paheko(enriched_payload)
    label = (
        f"{prefix} — {session_date}"
        if session_date
        else f"{prefix} — {csid[:8]}"
    )
    reference = ref_doc
    adv_body, code, msg = build_close_transaction_advanced_payload(
        enriched_payload,
        lines=lines,
        label=label,
        reference=reference,
        extra_note_lines=None,
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

    Story 23.4 : sous-écriture 0 = ventilation encaissements/dons par moyen (ADVANCED).
    P2 : remboursements 1/2 = ADVANCED par moyen si ``schema_version`` 2 ou dicts non vides ;
    sinon mono-ligne REVENUE (compat snapshots v1 historiques).
    """
    if db is None:
        return [], "revision_resolution_requires_db", "Ventilation par moyen : session SQLAlchemy requise (révision publiée)."
    if enriched_payload is None or not isinstance(enriched_payload, dict):
        return [], "invalid_outbox_payload", "enriched_payload requis pour le builder Paheko clôture."

    _, rc, rp = amounts_from_frozen_snapshot(snapshot)
    use_refund_per_pm = _snapshot_uses_refund_per_pm_paheko(snapshot)
    refunds_rows: list[PlannedSubWrite]
    if use_refund_per_pm:
        totals = snapshot.get("totals") or {}
        rc_map = totals.get("refunds_current_fiscal_by_payment_method") or {}
        rp_map = totals.get("refunds_prior_closed_fiscal_by_payment_method") or {}
        if not isinstance(rc_map, dict):
            rc_map = {}
        if not isinstance(rp_map, dict):
            rp_map = {}
        r_cur, e_cur, m_cur = _build_refund_bucket_per_pm_planned_write(
            snapshot,
            enriched_payload,
            db=db,
            index=1,
            kind=SUB_KIND_REFUNDS_CURRENT_PER_PM_V1,
            prior_closed=False,
            by_pm_raw=rc_map,
            total_scalar=rc,
            label_token="RembCourantPm",
            reference_token="rc_pm",
        )
        if e_cur is not None:
            return [], e_cur, m_cur or e_cur
        assert r_cur is not None
        r_pri, e_pri, m_pri = _build_refund_bucket_per_pm_planned_write(
            snapshot,
            enriched_payload,
            db=db,
            index=2,
            kind=SUB_KIND_REFUNDS_PRIOR_CLOSED_PER_PM_V1,
            prior_closed=True,
            by_pm_raw=rp_map,
            total_scalar=rp,
            label_token="RembN1ClosPm",
            reference_token="rp_pm",
        )
        if e_pri is not None:
            return [], e_pri, m_pri or e_pri
        assert r_pri is not None
        refunds_rows = [r_cur, r_pri]
    else:
        refunds_rows = [
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

    ref_base = paheko_close_document_reference_base(enriched_payload)
    if not ref_base:
        return None, "invalid_outbox_payload", "Référence pièce Paheko impossible (session)."

    out: list[tuple[PlannedSubWrite, dict[str, Any] | None]] = []
    for p in plan:
        if p.get("http_body") is not None:
            out.append((p, p["http_body"]))
            continue
        if p["amount"] <= 0.0:
            out.append((p, None))
            continue
        # Aligner sur l'ancien POST mono-ligne (8.3) : préfixe expert issu du mapping, pas le token interne.
        lp = str(enriched_payload.get("label_prefix") or "").strip() or "Clôture caisse"
        session_date = session_date_iso_for_paheko(enriched_payload)
        label = (
            f"{lp} — {session_date}"
            if session_date
            else f"{lp} — {csid[:8]}"
        )
        reference = f"{ref_base}:{p['reference_token']}"
        body, code, msg = build_close_transaction_line_payload(
            enriched_payload,
            amount=float(p["amount"]),
            label=label,
            reference=reference,
            tx_type=p["tx_type"],
            swap_debit_credit=p["swap_debit_credit"],
            extra_note_lines=None,
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
    if snap.get("schema_version") not in (1, 2):
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
    "SUB_KIND_REFUNDS_CURRENT_PER_PM_V1",
    "SUB_KIND_REFUNDS_PRIOR_CLOSED",
    "SUB_KIND_REFUNDS_PRIOR_CLOSED_PER_PM_V1",
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
