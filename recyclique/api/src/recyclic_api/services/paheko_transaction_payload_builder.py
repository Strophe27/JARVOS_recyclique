"""Construit le payload officiel Paheko pour la clôture caisse."""

from __future__ import annotations

from datetime import datetime
from typing import Any


def _as_non_empty_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def session_date_iso_for_paheko(enriched_payload: dict[str, Any]) -> str:
    """Date comptable ``YYYY-MM-DD`` : ``session_date`` explicite sinon dérivée de ``closed_at``."""
    raw = _as_non_empty_str(enriched_payload.get("session_date"))
    if raw and len(raw) >= 10:
        return raw[:10]
    closed = _as_non_empty_str(enriched_payload.get("closed_at"))
    if not closed:
        return ""
    try:
        return datetime.fromisoformat(closed.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return ""


def paheko_close_document_reference_base(enriched_payload: dict[str, Any]) -> str | None:
    """
    Numéro de pièce lisible : ``CAISSE-YYYYMMDD-{8 premiers car. session}``.
    """
    csid = _as_non_empty_str(enriched_payload.get("cash_session_id"))
    if not csid:
        return None
    date_iso = session_date_iso_for_paheko(enriched_payload)
    compact = date_iso.replace("-", "") if date_iso else ""
    suffix = csid[:8]
    if compact:
        return f"CAISSE-{compact}-{suffix}"
    return f"CAISSE-{suffix}"


def _format_euro_fr(amount: float) -> str:
    return f"{amount:.2f}".replace(".", ",") + " €"


def build_paheko_cash_session_close_note_lines(
    enriched_payload: dict[str, Any],
    *,
    extra_note_lines: list[str] | None = None,
) -> list[str]:
    """
    Remarques Paheko lisibles (plus d'UUID site/opérateur ni dump ``cash_session_id``).
    ``accounting_config_revision_id`` : extrait du snapshot figé si présent.
    """
    site_label = _as_non_empty_str(enriched_payload.get("site_display_name")) or "—"
    op_label = _as_non_empty_str(enriched_payload.get("operator_display_name")) or "—"
    note_lines = [
        f"Site : {site_label}",
        f"Opérateur : {op_label}",
    ]
    init = _as_float(enriched_payload.get("session_initial_amount"))
    ts_net = _as_float(enriched_payload.get("session_total_sales_rollups"))
    theoretical_amount = _as_float(enriched_payload.get("theoretical_amount"))
    variance = _as_float(enriched_payload.get("variance"))
    if init is not None and ts_net is not None:
        note_lines.append(f"Fond de caisse : {_format_euro_fr(init)}")
        note_lines.append(f"Ventes encaissées (net) : {_format_euro_fr(ts_net)}")
    elif theoretical_amount is not None:
        note_lines.append(f"Total théorique en caisse : {_format_euro_fr(theoretical_amount)}")
    if variance is not None:
        note_lines.append(f"Écart de caisse : {_format_euro_fr(variance)}")
    rev_short: str | None = None
    snap = enriched_payload.get("accounting_close_snapshot_frozen")
    if isinstance(snap, dict):
        rid = snap.get("accounting_config_revision_id")
        if rid is not None:
            rs = str(rid).strip()
            if rs:
                rev_short = rs[:8]
    if rev_short:
        note_lines.append(f"Révision config : {rev_short}")
    extra_notes = _as_non_empty_str(enriched_payload.get("notes"))
    if extra_notes:
        note_lines.append(extra_notes)
    if extra_note_lines:
        note_lines.extend(extra_note_lines)
    return note_lines


def validate_destination_params_for_transaction(destination_params: Any) -> bool:
    if not isinstance(destination_params, dict) or not destination_params:
        return False
    id_year = _as_int(destination_params.get("id_year"))
    debit = _as_non_empty_str(destination_params.get("debit"))
    credit = _as_non_empty_str(destination_params.get("credit"))
    return id_year is not None and bool(debit) and bool(credit)


def build_close_transaction_line_payload(
    enriched_payload: dict[str, Any],
    *,
    amount: float,
    label: str,
    reference: str,
    tx_type: str,
    swap_debit_credit: bool,
    extra_note_lines: list[str] | None = None,
) -> tuple[dict[str, Any] | None, str | None, str | None]:
    """
    Une ligne d'écriture Paheko pour la clôture (Story 22.7 — sous-écritures du batch).

    ``swap_debit_credit`` : intervertit les comptes débit/crédit (ex. sens remboursement vs encaissement).
    """
    id_year = _as_int(enriched_payload.get("id_year"))
    debit = _as_non_empty_str(enriched_payload.get("debit"))
    credit = _as_non_empty_str(enriched_payload.get("credit"))
    if id_year is None or not debit or not credit:
        return (
            None,
            "invalid_destination_params",
            "destination_params doit contenir au minimum id_year, debit et credit pour l'API transaction Paheko.",
        )

    if amount < 0:
        return None, "invalid_outbox_payload", "Montant négatif non supporté pour une sous-écriture Paheko."

    closed_at_raw = _as_non_empty_str(enriched_payload.get("closed_at"))
    if not closed_at_raw:
        return None, "invalid_outbox_payload", "Date de clôture absente pour construire l'écriture Paheko."
    try:
        date_value = datetime.fromisoformat(closed_at_raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return None, "invalid_outbox_payload", "Date de clôture invalide pour construire l'écriture Paheko."

    cash_session_id = _as_non_empty_str(enriched_payload.get("cash_session_id"))
    if not cash_session_id:
        return None, "invalid_outbox_payload", "cash_session_id absent du payload outbox."

    d_acc, c_acc = (credit, debit) if swap_debit_credit else (debit, credit)

    note_lines = build_paheko_cash_session_close_note_lines(
        enriched_payload,
        extra_note_lines=extra_note_lines,
    )

    t_type = (tx_type or "REVENUE").upper()
    body: dict[str, Any] = {
        "id_year": id_year,
        "label": label,
        "date": date_value,
        "type": t_type,
        "amount": round(amount, 2),
        "debit": d_acc,
        "credit": c_acc,
    }
    if reference:
        body["reference"] = reference
    notes = "\n".join(note_lines)
    if notes:
        body["notes"] = notes
    return body, None, None


def build_close_transaction_advanced_payload(
    enriched_payload: dict[str, Any],
    *,
    lines: list[dict[str, Any]],
    label: str,
    reference: str,
    extra_note_lines: list[str] | None = None,
) -> tuple[dict[str, Any] | None, str | None, str | None]:
    """
    Story 23.1 — écriture Paheko **ADVANCED** multi-lignes (un POST, tableau ``lines``).

    Chaque ligne attend au minimum ``account`` (code Paheko) et **exactement** un montant
    parmi ``debit`` / ``credit`` (nombre > 0), aligné doc interne / recherche projet.
    """
    id_year = _as_int(enriched_payload.get("id_year"))
    if id_year is None:
        return (
            None,
            "invalid_destination_params",
            "id_year requis pour une écriture Paheko ADVANCED.",
        )
    if not lines:
        return None, "invalid_sub_write", "ADVANCED : au moins une ligne est requise."

    closed_at_raw = _as_non_empty_str(enriched_payload.get("closed_at"))
    if not closed_at_raw:
        return None, "invalid_outbox_payload", "Date de clôture absente pour construire l'écriture Paheko."
    try:
        date_value = datetime.fromisoformat(closed_at_raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return None, "invalid_outbox_payload", "Date de clôture invalide pour construire l'écriture Paheko."

    cash_session_id = _as_non_empty_str(enriched_payload.get("cash_session_id"))
    if not cash_session_id:
        return None, "invalid_outbox_payload", "cash_session_id absent du payload outbox."

    note_lines = build_paheko_cash_session_close_note_lines(
        enriched_payload,
        extra_note_lines=extra_note_lines,
    )

    sanitized: list[dict[str, Any]] = []
    for i, raw in enumerate(lines):
        if not isinstance(raw, dict):
            return None, "invalid_sub_write", f"Ligne ADVANCED #{i} invalide."
        acc = _as_non_empty_str(raw.get("account"))
        if not acc:
            return None, "invalid_sub_write", f"Ligne ADVANCED #{i} sans compte."
        debit_v = _as_float(raw.get("debit"))
        credit_v = _as_float(raw.get("credit"))
        has_d = debit_v is not None and debit_v > 0
        has_c = credit_v is not None and credit_v > 0
        if has_d == has_c:
            return None, "invalid_sub_write", f"Ligne ADVANCED #{i} : renseigner un seul côté débit ou crédit."
        line: dict[str, Any] = {"account": acc}
        if has_d:
            line["debit"] = round(float(debit_v), 2)
        else:
            line["credit"] = round(float(credit_v), 2)
        lbl = _as_non_empty_str(raw.get("label"))
        if lbl:
            line["label"] = lbl
        ref = _as_non_empty_str(raw.get("reference"))
        if ref:
            line["reference"] = ref
        sanitized.append(line)

    td = sum(float(x.get("debit") or 0) for x in sanitized)
    tc = sum(float(x.get("credit") or 0) for x in sanitized)
    if abs(round(td - tc, 2)) > 0.01:
        return (
            None,
            "invalid_sub_write",
            f"ADVANCED non équilibré : débits={td:.2f} crédits={tc:.2f}.",
        )

    body: dict[str, Any] = {
        "id_year": id_year,
        "label": label,
        "date": date_value,
        "type": "ADVANCED",
        "reference": reference,
        "lines": sanitized,
    }
    notes = "\n".join(note_lines)
    if notes:
        body["notes"] = notes
    return body, None, None


def build_cash_session_close_transaction_payload(
    enriched_payload: dict[str, Any],
) -> tuple[dict[str, Any] | None, str | None, str | None]:
    id_year = _as_int(enriched_payload.get("id_year"))
    debit = _as_non_empty_str(enriched_payload.get("debit"))
    credit = _as_non_empty_str(enriched_payload.get("credit"))
    if id_year is None or not debit or not credit:
        return (
            None,
            "invalid_destination_params",
            "destination_params doit contenir au minimum id_year, debit et credit pour l'API transaction Paheko.",
        )

    actual_amount = _as_float(enriched_payload.get("actual_amount"))
    theoretical_amount = _as_float(enriched_payload.get("theoretical_amount"))
    variance = _as_float(enriched_payload.get("variance"))
    amount = actual_amount if actual_amount is not None else theoretical_amount
    if amount is None:
        return None, "invalid_outbox_payload", "Montant clôture introuvable pour construire l'écriture Paheko."
    if amount < 0:
        return None, "invalid_outbox_payload", "Montant clôture négatif non supporté pour le slice Paheko."

    cash_session_id = _as_non_empty_str(enriched_payload.get("cash_session_id"))
    if not cash_session_id:
        return None, "invalid_outbox_payload", "cash_session_id absent du payload outbox."
    label_prefix = _as_non_empty_str(enriched_payload.get("label_prefix")) or "Clôture caisse"
    session_short = cash_session_id[:8]
    session_date = session_date_iso_for_paheko(enriched_payload)
    label = (
        f"{label_prefix} — {session_date}"
        if session_date
        else f"{label_prefix} — {session_short}"
    )
    reference = paheko_close_document_reference_base(enriched_payload)
    if not reference:
        reference_prefix = _as_non_empty_str(enriched_payload.get("reference_prefix")) or "cash-session-close"
        reference = f"{reference_prefix}:{cash_session_id}"

    return build_close_transaction_line_payload(
        enriched_payload,
        amount=float(amount),
        label=label,
        reference=reference,
        tx_type=(_as_non_empty_str(enriched_payload.get("type")) or "REVENUE"),
        swap_debit_credit=False,
        extra_note_lines=None,
    )
