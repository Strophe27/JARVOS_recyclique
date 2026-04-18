"""Données QA — crédit clôture 7073 → 707 + note métier moyen « donation ».

Révision ID: s22_8_fix_paheko_close_mapping_credit_7073
Revises: s22_7_legacy_payment_method_lowercase

- Alignement I1 : les mappings Paheko clôture ne doivent pas pointer vers un sous-compte
  famille (7073) ; compte de ventes global 707.
- Note payment_methods.donation : cadre produit (référentiel vs caisse), sans promesse
  « surplus automatique » (décision 2026-04-18).
"""

from __future__ import annotations

import json

import sqlalchemy as sa
from alembic import op

revision = "s22_8_fix_paheko_close_mapping_credit_7073"
down_revision = "s22_7_legacy_payment_method_lowercase"
branch_labels = None
depends_on = None

_DONATION_NOTES = (
    "Don en caisse — référentiel expert pour la ventilation Paheko. "
    "À la caisse : don volontaire selon les règles applicatives (Story 22.4). "
    "Ne pas utiliser comme moyen de règlement standard."
)
_DONATION_NOTES_LEGACY = (
    "Surplus volontaire du client. Ne pas utiliser comme moyen de règlement standard."
)


def _upgrade_mappings(bind: sa.Connection, dialect: str) -> None:
    if dialect == "postgresql":
        bind.execute(
            sa.text(
                """
                UPDATE paheko_cash_session_close_mappings
                SET destination_params = jsonb_set(
                    COALESCE(destination_params::jsonb, '{}'::jsonb),
                    '{credit}',
                    to_jsonb('707'::text),
                    true
                )
                WHERE (destination_params->>'credit') = '7073'
                """
            )
        )
        return

    rows = bind.execute(sa.text("SELECT id, destination_params FROM paheko_cash_session_close_mappings")).fetchall()
    for rid, raw in rows:
        if raw is None:
            continue
        if isinstance(raw, str):
            try:
                dp = json.loads(raw)
            except json.JSONDecodeError:
                continue
        elif isinstance(raw, dict):
            dp = dict(raw)
        else:
            continue
        if dp.get("credit") != "7073":
            continue
        dp["credit"] = "707"
        bind.execute(
            sa.text(
                "UPDATE paheko_cash_session_close_mappings SET destination_params = :dp WHERE id = :id"
            ),
            {"dp": json.dumps(dp), "id": rid},
        )


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    dialect = bind.dialect.name

    if insp.has_table("paheko_cash_session_close_mappings"):
        _upgrade_mappings(bind, dialect)

    if insp.has_table("payment_methods"):
        bind.execute(
            sa.text(
                "UPDATE payment_methods SET notes = :n WHERE code = 'donation' "
                "AND (notes IS NULL OR notes = :legacy)"
            ),
            {"n": _DONATION_NOTES, "legacy": _DONATION_NOTES_LEGACY},
        )


def downgrade() -> None:
    """Pas de retour arrière fiable pour les données migrées (707 vs choix métier)."""
    pass
