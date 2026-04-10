"""Story 6.5 — colonnes sales (special_encaissement_kind, adherent_reference) + permission caisse.special_encaissement.

Revision ID: e9a1_story_6_5_special_enc
Revises: d7f1_story_6_4_reversals
Create Date: 2026-04-08

Encaissements sans lignes article (don, adhésion) : agrégats session inchangés
(voir enrichissement totals.sales_completed — même somme que ventes nominales).
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "e9a1_story_6_5_special_enc"
down_revision = "d7f1_story_6_4_reversals"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("sales")}
    if "special_encaissement_kind" not in cols:
        op.add_column("sales", sa.Column("special_encaissement_kind", sa.String(length=64), nullable=True))
    if "adherent_reference" not in cols:
        op.add_column("sales", sa.Column("adherent_reference", sa.String(length=200), nullable=True))

    op.execute(
        """
        INSERT INTO permissions (id, name, description)
        SELECT gen_random_uuid(), 'caisse.special_encaissement',
               'Autorise les encaissements spéciaux sans article (don, adhésion) — Story 6.5.'
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'caisse.special_encaissement')
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM permissions WHERE name = 'caisse.special_encaissement'")
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("sales")}
    if "adherent_reference" in cols:
        op.drop_column("sales", "adherent_reference")
    if "special_encaissement_kind" in cols:
        op.drop_column("sales", "special_encaissement_kind")
