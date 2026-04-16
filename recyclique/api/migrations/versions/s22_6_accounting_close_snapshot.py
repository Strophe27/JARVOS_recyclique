"""Story 22.6 — snapshot JSON immutable sur cash_sessions pour clôture comptable.

Revision ID: s22_6_accounting_close_snapshot
Revises: s22_5_refund_canonical_period_auth
Create Date: 2026-04-16
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "s22_6_accounting_close_snapshot"
down_revision = "s22_5_refund_canonical_period_auth"
branch_labels = None
depends_on = None


def _has_column(inspector: sa.Inspector, table: str, column: str) -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not _has_column(inspector, "cash_sessions", "accounting_close_snapshot"):
        op.add_column(
            "cash_sessions",
            sa.Column("accounting_close_snapshot", sa.JSON(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if _has_column(inspector, "cash_sessions", "accounting_close_snapshot"):
        op.drop_column("cash_sessions", "accounting_close_snapshot")
