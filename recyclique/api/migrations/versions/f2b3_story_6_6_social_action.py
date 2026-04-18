"""Story 6.6 — colonne sales.social_action_kind + permission caisse.social_encaissement.

Revision ID: f2b3_story_6_6_social
Revises: e9a1_story_6_5_special_enc
Create Date: 2026-04-08

Discriminant exclusif de ``special_encaissement_kind`` ; montants > 0 validés en service.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "f2b3_story_6_6_social"
down_revision = "e9a1_story_6_5_special_enc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("sales")}
    if "social_action_kind" not in cols:
        op.add_column("sales", sa.Column("social_action_kind", sa.String(length=64), nullable=True))

    op.execute(
        """
        INSERT INTO permissions (id, name, description)
        SELECT gen_random_uuid(), 'caisse.social_encaissement',
               'Autorise les encaissements d''actions sociales / solidaires (lot 1) — Story 6.6.'
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'caisse.social_encaissement')
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM permissions WHERE name = 'caisse.social_encaissement'")
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("sales")}
    if "social_action_kind" in cols:
        op.drop_column("sales", "social_action_kind")
