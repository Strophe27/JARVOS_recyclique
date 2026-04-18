"""Résolution des mappings Paheko (Story 8.3) — slice ``cash_session_close``."""

from __future__ import annotations

import uuid
from typing import Any, Optional, Sequence, Tuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from recyclic_api.models.accounting_config import GLOBAL_ACCOUNTING_SETTINGS_ROW_ID, GlobalAccountingSettings
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.paheko_cash_session_close_mapping import PahekoCashSessionCloseMapping
from recyclic_api.models.site import Site
from recyclic_api.models.user import User
from recyclic_api.services.paheko_transaction_payload_builder import validate_destination_params_for_transaction

def _valid_destination_params(raw: Any) -> bool:
    return validate_destination_params_for_transaction(raw)


def resolve_cash_session_close_mapping_row(
    db: Session,
    *,
    site_id: uuid.UUID,
    register_id: uuid.UUID | None,
) -> tuple[PahekoCashSessionCloseMapping | None, str | None]:
    """
    Résout la ligne de mapping applicable (spécifique registre puis défaut site).
    Retourne ``(row, None)`` ou ``(None, code_erreur)`` — **pas** de fallback silencieux.
    """
    if register_id is not None:
        specific = (
            db.query(PahekoCashSessionCloseMapping)
            .filter(
                PahekoCashSessionCloseMapping.site_id == site_id,
                PahekoCashSessionCloseMapping.register_id == register_id,
            )
            .one_or_none()
        )
        if specific is not None:
            if not specific.enabled:
                return None, "mapping_disabled"
            if not _valid_destination_params(specific.destination_params):
                return None, "invalid_destination_params"
            return specific, None

    default_row = (
        db.query(PahekoCashSessionCloseMapping)
        .filter(
            PahekoCashSessionCloseMapping.site_id == site_id,
            PahekoCashSessionCloseMapping.register_id.is_(None),
        )
        .one_or_none()
    )
    if default_row is None:
        return None, "mapping_missing"
    if not default_row.enabled:
        return None, "mapping_disabled"
    if not _valid_destination_params(default_row.destination_params):
        return None, "invalid_destination_params"
    return default_row, None


def build_enriched_close_payload(
    base_payload: dict[str, Any],
    mapping: PahekoCashSessionCloseMapping,
) -> dict[str, Any]:
    """Fusionne le JSON outbox d'origine avec ``destination_params`` (vérité config)."""
    merged = dict(base_payload or {})
    dest = mapping.destination_params
    if not isinstance(dest, dict):
        return merged
    merged.update(dest)
    return merged


def resolve_enriched_payload_for_item(
    db: Session,
    *,
    base_payload: dict[str, Any],
    cash_session_id: uuid.UUID | None,
) -> tuple[dict[str, Any] | None, str | None, str | None]:
    """Variante sans relation chargée : ``base_payload`` = ``item.payload``."""
    if cash_session_id is None:
        return None, "session_not_found", "cash_session_id absent sur la ligne outbox — résolution impossible."

    session = db.get(CashSession, cash_session_id)
    if session is None:
        return None, "session_not_found", "Session caisse introuvable — résolution mapping impossible."

    site_id = session.site_id
    if site_id is None:
        return None, "site_missing", "Session sans site_id — configurer le site avant sync Paheko."

    register_id = session.register_id
    row, err = resolve_cash_session_close_mapping_row(db, site_id=site_id, register_id=register_id)
    if err or row is None:
        codes = {
            "mapping_missing": "Aucune correspondance Paheko active pour ce site / cette caisse (slice clôture).",
            "mapping_disabled": "La correspondance Paheko existe mais est désactivée (enabled=false).",
            "invalid_destination_params": "destination_params invalide en base — fournir au minimum id_year, debit et credit.",
        }
        return None, err or "mapping_missing", codes.get(err or "", codes["mapping_missing"])

    merged = build_enriched_close_payload(base_payload, row)
    if str(merged.get("label_prefix") or "").strip() == "":
        ga = db.get(GlobalAccountingSettings, str(GLOBAL_ACCOUNTING_SETTINGS_ROW_ID))
        if ga is not None:
            pref = str(getattr(ga, "default_entry_label_prefix", None) or "").strip()
            if pref:
                merged["label_prefix"] = pref

    if session.closed_at is not None:
        merged["session_date"] = session.closed_at.date().isoformat()

    if session.site_id is not None:
        site = db.get(Site, session.site_id)
        if site is not None and (site.name or "").strip():
            merged["site_display_name"] = str(site.name).strip()

    if session.operator_id is not None:
        op = db.get(User, session.operator_id)
        if op is not None:
            parts = [p for p in [(op.first_name or "").strip(), (op.last_name or "").strip()] if p]
            display = " ".join(parts) if parts else (op.username or "").strip()
            if display:
                merged["operator_display_name"] = display

    return merged, None, None


def list_cash_session_close_mappings(
    db: Session,
    *,
    site_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[Sequence[PahekoCashSessionCloseMapping], int]:
    q = db.query(PahekoCashSessionCloseMapping)
    if site_id is not None:
        q = q.filter(PahekoCashSessionCloseMapping.site_id == site_id)
    total = q.count()
    rows = (
        q.order_by(
            PahekoCashSessionCloseMapping.site_id.asc(),
            PahekoCashSessionCloseMapping.register_id.asc().nullsfirst(),
        )
        .offset(skip)
        .limit(min(limit, 200))
        .all()
    )
    return rows, total


def create_cash_session_close_mapping(
    db: Session,
    *,
    site_id: uuid.UUID,
    register_id: uuid.UUID | None,
    destination_params: dict[str, Any],
    enabled: bool = True,
    label: str | None = None,
) -> tuple[PahekoCashSessionCloseMapping | None, str | None]:
    if not _valid_destination_params(destination_params):
        return None, "invalid_destination_params"
    row = PahekoCashSessionCloseMapping(
        site_id=site_id,
        register_id=register_id,
        enabled=enabled,
        destination_params=dict(destination_params),
        label=(label or "").strip()[:255] or None,
    )
    try:
        with db.begin_nested():
            db.add(row)
            db.flush()
    except IntegrityError:
        return None, "duplicate_key"
    return row, None


def update_cash_session_close_mapping(
    db: Session,
    mapping_id: uuid.UUID,
    *,
    destination_params: dict[str, Any] | None = None,
    enabled: bool | None = None,
    label: str | None = None,
) -> tuple[PahekoCashSessionCloseMapping | None, str | None]:
    row = db.get(PahekoCashSessionCloseMapping, mapping_id)
    if row is None:
        return None, "not_found"
    if enabled is not None:
        row.enabled = enabled
    if destination_params is not None:
        if not _valid_destination_params(destination_params):
            return None, "invalid_destination_params"
        row.destination_params = dict(destination_params)
    if label is not None:
        row.label = label.strip()[:255] or None
    row.touch_updated()
    db.flush()
    return row, None
