"""Story 24.6 — échange matière (conteneur) + permission caisse.exchange.

Revision ID: s24_6_material_exchange_story246
Revises: s22_8_fix_paheko_close_mapping_credit_7073
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "s24_6_material_exchange_story246"
down_revision = "s22_8_fix_paheko_close_mapping_credit_7073"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO permissions (id, name, description)
        SELECT gen_random_uuid(), 'caisse.exchange',
               'Story 24.6 — échange matière / différence financière (sous-flux vente ou remboursement).'
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'caisse.exchange')
        """
    )

    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("material_exchanges"):
        op.create_table(
            "material_exchanges",
            sa.Column("id", UUID(as_uuid=True), nullable=False),
            sa.Column("cash_session_id", UUID(as_uuid=True), nullable=False),
            sa.Column("operator_id", UUID(as_uuid=True), nullable=False),
            sa.Column("delta_amount_cents", sa.Integer(), nullable=False),
            sa.Column("material_trace", sa.JSON(), nullable=False),
            sa.Column("complement_sale_id", UUID(as_uuid=True), nullable=True),
            sa.Column("sale_reversal_id", UUID(as_uuid=True), nullable=True),
            sa.Column("idempotency_key", sa.String(length=128), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["cash_session_id"], ["cash_sessions.id"]),
            sa.ForeignKeyConstraint(["operator_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["complement_sale_id"], ["sales.id"]),
            sa.ForeignKeyConstraint(["sale_reversal_id"], ["sale_reversals.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "cash_session_id",
                "idempotency_key",
                name="uq_material_exchanges_session_idempotency",
            ),
        )
        op.create_index("ix_material_exchanges_cash_session_id", "material_exchanges", ["cash_session_id"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if insp.has_table("material_exchanges"):
        op.drop_table("material_exchanges")
    op.execute("DELETE FROM permissions WHERE name = 'caisse.exchange'")
