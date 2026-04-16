"""Helpers pytest — outbox Paheko stories 8.x (mappings 8.3)."""

from __future__ import annotations

import json
import uuid

from sqlalchemy import desc
from sqlalchemy.orm import Session

from recyclic_api.models.accounting_config import AccountingConfigRevision
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.paheko_cash_session_close_mapping import PahekoCashSessionCloseMapping


def attach_latest_accounting_revision_to_session(db: Session, cs: CashSession) -> None:
    """Story 23.4 : clôture → batch Paheko requiert un `accounting_config_revision_id` sur le snapshot ; figer la session de test."""
    rev = (
        db.query(AccountingConfigRevision)
        .order_by(desc(AccountingConfigRevision.revision_seq))
        .first()
    )
    if rev is None:
        raise RuntimeError("Tests Paheko 8.x : aucun accounting_config_revisions — vérifier conftest seed 22.3.")
    try:
        snap = json.loads(rev.snapshot_json or "{}")
    except json.JSONDecodeError:
        snap = {}
    pms = snap.get("payment_methods")
    if not isinstance(pms, list):
        pms = []
    codes = {str(m.get("code", "")).strip().lower() for m in pms if isinstance(m, dict)}
    if "cash" not in codes:
        pms = [
            *pms,
            {
                "code": "cash",
                "label": "Especes",
                "active": True,
                "kind": "cash",
                "paheko_debit_account": "511",
                "paheko_refund_credit_account": "511",
            },
        ]
        snap["payment_methods"] = pms
        rev.snapshot_json = json.dumps(snap)
        db.add(rev)
        db.flush()
    cs.accounting_config_revision_id = rev.id


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
