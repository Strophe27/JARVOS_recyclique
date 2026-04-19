"""Story 24.5 — idempotence exceptionnelle scopée par session (pas globale sur idempotency_key).

Revision ID: s24_5b_exceptional_refunds_session_idempotency
Revises: s24_5_exceptional_refunds
Create Date: 2026-04-19
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "s24_5b_exceptional_refunds_session_idempotency"
down_revision = "s24_5_exceptional_refunds"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    row = bind.execute(sa.text("SELECT to_regclass(:table_name)"), {"table_name": f"public.{table_name}"}).scalar()
    return row is not None


def upgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, "exceptional_refunds"):
        return
    insp = sa.inspect(bind)
    uqs = {c["name"] for c in insp.get_unique_constraints("exceptional_refunds")}
    if "uq_exceptional_refunds_idempotency_key" in uqs:
        op.drop_constraint("uq_exceptional_refunds_idempotency_key", "exceptional_refunds", type_="unique")
    if "uq_exceptional_refunds_session_idempotency" not in uqs:
        op.create_unique_constraint(
            "uq_exceptional_refunds_session_idempotency",
            "exceptional_refunds",
            ["cash_session_id", "idempotency_key"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, "exceptional_refunds"):
        return
    insp = sa.inspect(bind)
    uqs = {c["name"] for c in insp.get_unique_constraints("exceptional_refunds")}
    if "uq_exceptional_refunds_session_idempotency" in uqs:
        op.drop_constraint("uq_exceptional_refunds_session_idempotency", "exceptional_refunds", type_="unique")
    if "uq_exceptional_refunds_idempotency_key" not in uqs:
        op.create_unique_constraint(
            "uq_exceptional_refunds_idempotency_key",
            "exceptional_refunds",
            ["idempotency_key"],
        )
