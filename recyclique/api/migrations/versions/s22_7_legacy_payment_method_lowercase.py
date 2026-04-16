"""Normalise payment_method en minuscules (valeurs enum) — brownfield SQLAlchemy.

Révision ID: s22_7_legacy_payment_method_lowercase
Revises: s22_6_accounting_close_snapshot

Anciennes lignes peuvent contenir les **noms** d'enum (`CASH`, …) au lieu des **valeurs**
(`cash`, …). SQLAlchemy + ``values_callable`` sur ``payment_transactions`` lève alors
``LookupError`` au chargement (ex. clôture caisse / agrégat journal).
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "s22_7_legacy_payment_method_lowercase"
down_revision = "s22_6_accounting_close_snapshot"
branch_labels = None
depends_on = None


def _has_table(inspector: sa.Inspector, name: str) -> bool:
    return name in inspector.get_table_names()


def _has_column(inspector: sa.Inspector, table: str, column: str) -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table))


def _normalize_table(bind, inspector: sa.Inspector, table: str) -> None:
    if not _has_table(inspector, table) or not _has_column(inspector, table, "payment_method"):
        return
    bind.execute(
        sa.text(
            f"""
            UPDATE {table}
            SET payment_method = lower(payment_method)
            WHERE payment_method IS NOT NULL
              AND lower(payment_method) IN ('cash', 'card', 'check', 'free')
              AND payment_method <> lower(payment_method)
            """
        )
    )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    _normalize_table(bind, inspector, "payment_transactions")
    _normalize_table(bind, inspector, "sales")


def downgrade() -> None:
    """Pas de retour arrière fiable (perte d'information sur la casse d'origine)."""
    pass
