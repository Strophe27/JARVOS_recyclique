"""Story 6.4 — table sale_reversals + permission caisse.refund.

Revision ID: d7f1_story_6_4_reversals
Revises: c6e3_sale_lifecycle
Create Date: 2026-04-08

Remboursement total uniquement ; FK immuable vers vente source ; agrégats session
via enrichissement (sales_completed, refunds algébrique, net) — lien clôture 6.7 / NFR21.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "d7f1_story_6_4_reversals"
down_revision = "c6e3_sale_lifecycle"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    row = bind.execute(sa.text("SELECT to_regclass(:table_name)"), {"table_name": f"public.{table_name}"}).scalar()
    return row is not None


def upgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, "sale_reversals"):
        op.create_table(
            "sale_reversals",
            sa.Column("id", UUID(as_uuid=True), nullable=False),
            sa.Column("source_sale_id", UUID(as_uuid=True), nullable=False),
            sa.Column("cash_session_id", UUID(as_uuid=True), nullable=False),
            sa.Column("operator_id", UUID(as_uuid=True), nullable=False),
            sa.Column("amount_signed", sa.Float(), nullable=False),
            sa.Column("reason_code", sa.String(length=64), nullable=False),
            sa.Column("detail", sa.Text(), nullable=True),
            sa.Column("idempotency_key", sa.String(length=128), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
            sa.ForeignKeyConstraint(["cash_session_id"], ["cash_sessions.id"]),
            sa.ForeignKeyConstraint(["operator_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["source_sale_id"], ["sales.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("source_sale_id", name="uq_sale_reversals_source_sale_id"),
            sa.UniqueConstraint("idempotency_key", name="uq_sale_reversals_idempotency_key"),
        )

    insp = sa.inspect(bind)
    sr_idx = {i["name"] for i in insp.get_indexes("sale_reversals")} if _table_exists(bind, "sale_reversals") else set()
    ix_cs = op.f("ix_sale_reversals_cash_session_id")
    if ix_cs not in sr_idx:
        op.create_index(ix_cs, "sale_reversals", ["cash_session_id"], unique=False)

    op.execute(
        """
        INSERT INTO permissions (id, name, description)
        SELECT gen_random_uuid(), 'caisse.refund',
               'Autorise les remboursements / reversals caisse (Story 6.4).'
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'caisse.refund')
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM permissions WHERE name = 'caisse.refund'")
    bind = op.get_bind()
    if not _table_exists(bind, "sale_reversals"):
        return
    insp = sa.inspect(bind)
    sr_idx = {i["name"] for i in insp.get_indexes("sale_reversals")}
    ix_cs = op.f("ix_sale_reversals_cash_session_id")
    if ix_cs in sr_idx:
        op.drop_index(ix_cs, table_name="sale_reversals")
    op.drop_table("sale_reversals")
