"""Story 24.8 — mouvement interne caisse (permission cash.transfer, journal distinct décaissement).

Revision ID: s24_8_cash_internal_transfer_story248
Revises: s24_7_cash_disbursement_story247
Create Date: 2026-04-19
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "s24_8_cash_internal_transfer_story248"
down_revision = "s24_7_cash_disbursement_story247"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO permissions (id, name, description)
        SELECT gen_random_uuid(), 'cash.transfer',
               'Story 24.8 — mouvement interne de caisse (distinct remboursement client et décaissement charge).'
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'cash.transfer')
        """
    )

    bind = op.get_bind()
    insp = sa.inspect(bind)
    if insp.has_table("cash_internal_transfers"):
        return
    op.create_table(
        "cash_internal_transfers",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("cash_session_id", UUID(as_uuid=True), nullable=False),
        sa.Column("sale_id", UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("transfer_type", sa.String(length=64), nullable=False),
        sa.Column("session_flow", sa.String(length=16), nullable=False),
        sa.Column("origin_endpoint_label", sa.Text(), nullable=False),
        sa.Column("destination_endpoint_label", sa.Text(), nullable=False),
        sa.Column("motif", sa.Text(), nullable=False),
        sa.Column("payment_method", sa.String(length=32), nullable=False),
        sa.Column("justification_reference", sa.String(length=256), nullable=False),
        sa.Column("initiator_user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("approver_user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("request_id", sa.String(length=128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["cash_session_id"], ["cash_sessions.id"]),
        sa.ForeignKeyConstraint(["sale_id"], ["sales.id"]),
        sa.ForeignKeyConstraint(["initiator_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["approver_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "cash_session_id",
            "idempotency_key",
            name="uq_cash_internal_transfers_session_idempotency",
        ),
    )
    op.create_index(
        "ix_cash_internal_transfers_cash_session_id",
        "cash_internal_transfers",
        ["cash_session_id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if insp.has_table("cash_internal_transfers"):
        op.drop_table("cash_internal_transfers")
    op.execute("DELETE FROM permissions WHERE name = 'cash.transfer'")
