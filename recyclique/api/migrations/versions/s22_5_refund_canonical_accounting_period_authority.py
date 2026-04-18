"""Story 22.5 — snapshot autorité exercices + permission second parcours remboursement N-1.

Revision ID: s22_5_refund_canonical_period_auth
Revises: s22_3_expert_accounting_governance
Create Date: 2026-04-16
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "s22_5_refund_canonical_period_auth"
down_revision = "s22_3_expert_accounting_governance"
branch_labels = None
depends_on = None

_ROW_ID = uuid.UUID("00000000-0000-5000-8000-000000000001")


def _has_table(bind, name: str) -> bool:
    insp = sa.inspect(bind)
    return insp.has_table(name)


def upgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, "accounting_period_authority_snapshots"):
        op.create_table(
            "accounting_period_authority_snapshots",
            sa.Column("id", UUID(as_uuid=True), nullable=False),
            sa.Column("current_open_fiscal_year", sa.Integer(), nullable=False),
            sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("source", sa.String(length=32), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    op.execute(
        f"""
        INSERT INTO accounting_period_authority_snapshots (
            id, current_open_fiscal_year, fetched_at, source, version
        )
        SELECT
            '{_ROW_ID!s}'::uuid,
            EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::integer,
            CURRENT_TIMESTAMP,
            'local_bootstrap',
            1
        WHERE NOT EXISTS (SELECT 1 FROM accounting_period_authority_snapshots WHERE id = '{_ROW_ID!s}'::uuid)
        """
    )

    op.execute(
        """
        INSERT INTO permissions (id, name, description)
        SELECT gen_random_uuid(), 'accounting.prior_year_refund',
               'Story 22.5 — second parcours : remboursement sur exercice antérieur clos (hors borne terrain 6.4).'
        WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'accounting.prior_year_refund')
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM permissions WHERE name = 'accounting.prior_year_refund'")
    bind = op.get_bind()
    if _has_table(bind, "accounting_period_authority_snapshots"):
        op.drop_table("accounting_period_authority_snapshots")
