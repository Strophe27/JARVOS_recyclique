"""Story 8.4 — journal append-only des transitions sync outbox (audit §6).

Revision ID: b8_4_paheko_outbox_sync_audit
Revises: b8_3_paheko_cash_session_close_mapping
Create Date: 2026-04-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b8_4_paheko_outbox_sync_audit"
down_revision = "b8_3_paheko_cash_session_close_mapping"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "paheko_outbox_sync_transitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("outbox_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transition_name", sa.String(length=128), nullable=False),
        sa.Column("from_sync_state", sa.String(length=32), nullable=False),
        sa.Column("to_sync_state", sa.String(length=32), nullable=False),
        sa.Column("from_outbox_status", sa.String(length=32), nullable=False),
        sa.Column("to_outbox_status", sa.String(length=32), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("correlation_id", sa.String(length=128), nullable=False),
        sa.Column("context_json", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["outbox_item_id"], ["paheko_outbox_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_paheko_outbox_sync_transitions_outbox_item_id",
        "paheko_outbox_sync_transitions",
        ["outbox_item_id"],
    )
    op.create_index(
        "ix_paheko_outbox_sync_transitions_transition_name",
        "paheko_outbox_sync_transitions",
        ["transition_name"],
    )
    op.create_index(
        "ix_paheko_outbox_sync_transitions_actor_user_id",
        "paheko_outbox_sync_transitions",
        ["actor_user_id"],
    )
    op.create_index(
        "ix_paheko_outbox_sync_transitions_correlation_id",
        "paheko_outbox_sync_transitions",
        ["correlation_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_paheko_outbox_sync_transitions_correlation_id", table_name="paheko_outbox_sync_transitions")
    op.drop_index("ix_paheko_outbox_sync_transitions_actor_user_id", table_name="paheko_outbox_sync_transitions")
    op.drop_index("ix_paheko_outbox_sync_transitions_transition_name", table_name="paheko_outbox_sync_transitions")
    op.drop_index("ix_paheko_outbox_sync_transitions_outbox_item_id", table_name="paheko_outbox_sync_transitions")
    op.drop_table("paheko_outbox_sync_transitions")
