"""Story 6.6 — colonne sales.social_action_kind + permission caisse.social_encaissement.

Revision ID: f2b3_story_6_6_social
Revises: e9a1_story_6_5_special_enc
Create Date: 2026-04-08

Discriminant exclusif de ``special_encaissement_kind`` ; montants > 0 validés en service.
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op

revision = "f2b3_story_6_6_social"
down_revision = "e9a1_story_6_5_special_enc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sales", sa.Column("social_action_kind", sa.String(length=64), nullable=True))

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
                "name": "caisse.social_encaissement",
                "description": "Autorise les encaissements d'actions sociales / solidaires (lot 1) — Story 6.6.",
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM permissions WHERE name = 'caisse.social_encaissement'")
    op.drop_column("sales", "social_action_kind")
