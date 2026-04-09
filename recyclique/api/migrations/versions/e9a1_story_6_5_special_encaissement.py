"""Story 6.5 — colonnes sales (special_encaissement_kind, adherent_reference) + permission caisse.special_encaissement.

Revision ID: e9a1_story_6_5_special_enc
Revises: d7f1_story_6_4_reversals
Create Date: 2026-04-08

Encaissements sans lignes article (don, adhésion) : agrégats session inchangés
(voir enrichissement totals.sales_completed — même somme que ventes nominales).
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op

revision = "e9a1_story_6_5_special_enc"
down_revision = "d7f1_story_6_4_reversals"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sales", sa.Column("special_encaissement_kind", sa.String(length=64), nullable=True))
    op.add_column("sales", sa.Column("adherent_reference", sa.String(length=200), nullable=True))

    permissions_table = sa.table(
        "permissions",
        sa.column("id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
    )
    op.bulk_insert(
        permissions_table,
        [
            {
                "id": str(uuid.uuid4()),
                "name": "caisse.special_encaissement",
                "description": "Autorise les encaissements spéciaux sans article (don, adhésion) — Story 6.5.",
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM permissions WHERE name = 'caisse.special_encaissement'")
    op.drop_column("sales", "adherent_reference")
    op.drop_column("sales", "special_encaissement_kind")
