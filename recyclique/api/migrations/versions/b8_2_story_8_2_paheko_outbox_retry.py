"""Story 8.2 — retry / backoff / rejet explicite (outbox Paheko).

Revision ID: b8_2_paheko_outbox_retry
Revises: story_8_1_paheko_outbox
Create Date: 2026-04-10
"""

from alembic import op
import sqlalchemy as sa

revision = "b8_2_paheko_outbox_retry"
down_revision = "story_8_1_paheko_outbox"
branch_labels = None
depends_on = None


def _idx_names(bind, table: str) -> set[str]:
    insp = sa.inspect(bind)
    if not insp.has_table(table):
        return set()
    return {i["name"] for i in insp.get_indexes(table)}


def upgrade() -> None:
    """Idempotent : colonnes retry déjà présentes sur bases partiellement migrées."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table("paheko_outbox_items"):
        return
    cols = {c["name"] for c in insp.get_columns("paheko_outbox_items")}
    if "next_retry_at" not in cols:
        op.add_column(
            "paheko_outbox_items",
            sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "rejection_reason" not in cols:
        op.add_column(
            "paheko_outbox_items",
            sa.Column("rejection_reason", sa.Text(), nullable=True),
        )
    idx = _idx_names(bind, "paheko_outbox_items")
    if "ix_paheko_outbox_next_retry_at" not in idx:
        op.create_index(
            "ix_paheko_outbox_next_retry_at",
            "paheko_outbox_items",
            ["next_retry_at"],
        )


def downgrade() -> None:
    op.drop_index("ix_paheko_outbox_next_retry_at", table_name="paheko_outbox_items")
    op.drop_column("paheko_outbox_items", "rejection_reason")
    op.drop_column("paheko_outbox_items", "next_retry_at")
