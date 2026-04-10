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


def validate_destination_params_for_transaction(destination_params: Any) -> bool:
    if not isinstance(destination_params, dict) or not destination_params:
        return False
    id_year = _as_int(destination_params.get("id_year"))
    debit = _as_non_empty_str(destination_params.get("debit"))
    credit = _as_non_empty_str(destination_params.get("credit"))
    return id_year is not None and bool(debit) and bool(credit)


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
    site_id = _as_non_empty_str(enriched_payload.get("site_id"))
    operator_id = _as_non_empty_str(enriched_payload.get("operator_id"))

    tx_type = (_as_non_empty_str(enriched_payload.get("type")) or "REVENUE").upper()
    label_prefix = _as_non_empty_str(enriched_payload.get("label_prefix")) or "Cloture caisse"
    session_short = cash_session_id[:8]
    label = f"{label_prefix} {session_short}"
    reference_prefix = _as_non_empty_str(enriched_payload.get("reference_prefix")) or "cash-session-close"
    reference = f"{reference_prefix}:{cash_session_id}"

    note_lines = [
        f"cash_session_id={cash_session_id}",
        f"site_id={site_id or '-'}",
        f"operator_id={operator_id or '-'}",
    ]
    if theoretical_amount is not None:
        note_lines.append(f"theoretical_amount={theoretical_amount:.2f}")
    if variance is not None:
        note_lines.append(f"variance={variance:.2f}")
    extra_notes = _as_non_empty_str(enriched_payload.get("notes"))
    if extra_notes:
        note_lines.append(extra_notes)

    body: dict[str, Any] = {
        "id_year": id_year,
        "label": label,
        "date": date_value,
        "type": tx_type,
        "amount": round(amount, 2),
        "debit": debit,
        "credit": credit,
    }
    if reference:
        body["reference"] = reference
    notes = "\n".join(note_lines)
    if notes:
        body["notes"] = notes
    return body, None, None
