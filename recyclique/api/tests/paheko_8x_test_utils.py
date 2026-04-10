"""Helpers pytest — outbox Paheko stories 8.x (mappings 8.3)."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from recyclic_api.models.paheko_cash_session_close_mapping import PahekoCashSessionCloseMapping


def seed_default_paheko_close_mapping(
    db: Session,
    site_id: uuid.UUID,
    *,
    destination_params: dict | None = None,
) -> PahekoCashSessionCloseMapping:
    """Ligne défaut site (register_id NULL) — requise pour tout POST Paheko mocké en 8.3+."""
    row = PahekoCashSessionCloseMapping(
        site_id=site_id,
        register_id=None,
        enabled=True,
        destination_params=destination_params or {"id_year": 2, "debit": "512", "credit": "707"},
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
