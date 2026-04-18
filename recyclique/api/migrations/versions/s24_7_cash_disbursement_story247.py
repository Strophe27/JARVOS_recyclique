"""Story 24.7 — décaissement typé (fusion des têtes Alembic + table + permission cash.disbursement).

Revision ID: s24_7_cash_disbursement_story247
Revises: s24_5b_exceptional_refunds_session_idempotency, s24_6_material_exchange_story246
Create Date: 2026-04-19
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "s24_7_cash_disbursement_story247"
down_revision = (
    "s24_5b_exceptional_refunds_session_idempotency",
    "s24_6_material_exchange_story246",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO permissions (id, name, description)
        SELECT gen_random_uuid(), 'cash.disbursement',
               'Story 24.7 — décaissement hors ticket (sous-types obligatoires, hors catégorie poubelle).'
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'cash.disbursement')
        """
    )

    bind = op.get_bind()
    insp = sa.inspect(bind)
    if insp.has_table("cash_disbursements"):
        return
    op.create_table(
        "cash_disbursements",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("cash_session_id", UUID(as_uuid=True), nullable=False),
        sa.Column("sale_id", UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("subtype", sa.String(length=64), nullable=False),
        sa.Column("motif_code", sa.String(length=64), nullable=False),
        sa.Column("counterparty_label", sa.Text(), nullable=False),
        sa.Column("payment_method", sa.String(length=32), nullable=False),
        sa.Column("free_comment", sa.Text(), nullable=True),
        sa.Column("justification_reference", sa.String(length=256), nullable=False),
        sa.Column("actual_settlement_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("admin_coded_reason_key", sa.String(length=64), nullable=True),
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
            name="uq_cash_disbursements_session_idempotency",
        ),
    )
    op.create_index("ix_cash_disbursements_cash_session_id", "cash_disbursements", ["cash_session_id"])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if insp.has_table("cash_disbursements"):
        op.drop_table("cash_disbursements")
    op.execute("DELETE FROM permissions WHERE name = 'cash.disbursement'")
