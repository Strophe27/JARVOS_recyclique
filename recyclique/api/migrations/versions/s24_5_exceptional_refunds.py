"""Story 24.5 — table exceptional_refunds + permission refund.exceptional.

Revision ID: s24_5_exceptional_refunds
Revises: s22_8_fix_paheko_close_mapping_credit_7073
Create Date: 2026-04-19
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "s24_5_exceptional_refunds"
down_revision = "s22_8_fix_paheko_close_mapping_credit_7073"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    row = bind.execute(sa.text("SELECT to_regclass(:table_name)"), {"table_name": f"public.{table_name}"}).scalar()
    return row is not None


def upgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, "exceptional_refunds"):
        op.create_table(
            "exceptional_refunds",
            sa.Column("id", UUID(as_uuid=True), nullable=False),
            sa.Column("cash_session_id", UUID(as_uuid=True), nullable=False),
            sa.Column("sale_id", UUID(as_uuid=True), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("refund_payment_method", sa.String(length=32), nullable=False),
            sa.Column("reason_code", sa.String(length=64), nullable=False),
            sa.Column("justification", sa.Text(), nullable=False),
            sa.Column("detail", sa.Text(), nullable=True),
            sa.Column("initiator_user_id", UUID(as_uuid=True), nullable=False),
            sa.Column("approver_user_id", UUID(as_uuid=True), nullable=False),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("idempotency_key", sa.String(length=128), nullable=False),
            sa.Column("request_id", sa.String(length=128), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["cash_session_id"], ["cash_sessions.id"]),
            sa.ForeignKeyConstraint(["sale_id"], ["sales.id"]),
            sa.ForeignKeyConstraint(["initiator_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["approver_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("idempotency_key", name="uq_exceptional_refunds_idempotency_key"),
        )

    insp = sa.inspect(bind)
    er_idx = {i["name"] for i in insp.get_indexes("exceptional_refunds")} if _table_exists(bind, "exceptional_refunds") else set()
    ix_cs = op.f("ix_exceptional_refunds_cash_session_id")
    if ix_cs not in er_idx:
        op.create_index(ix_cs, "exceptional_refunds", ["cash_session_id"], unique=False)

    op.execute(
        """
        INSERT INTO permissions (id, name, description)
        SELECT gen_random_uuid(), 'refund.exceptional',
               'Autorise les remboursements exceptionnels sans ticket (Story 24.5).'
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'refund.exceptional')
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM permissions WHERE name = 'refund.exceptional'")
    bind = op.get_bind()
    if not _table_exists(bind, "exceptional_refunds"):
        return
    insp = sa.inspect(bind)
    er_idx = {i["name"] for i in insp.get_indexes("exceptional_refunds")}
    ix_cs = op.f("ix_exceptional_refunds_cash_session_id")
    if ix_cs in er_idx:
        op.drop_index(ix_cs, table_name="exceptional_refunds")
    op.drop_table("exceptional_refunds")
