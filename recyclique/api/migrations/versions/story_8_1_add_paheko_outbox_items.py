"""Story 8.1 — table paheko_outbox_items (outbox durable clôture caisse → Paheko).

Revision ID: story_8_1_paheko_outbox
Revises: repair_epic6_sales_drift
Create Date: 2026-04-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "story_8_1_paheko_outbox"
down_revision = "repair_epic6_sales_drift"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "paheko_outbox_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("operation_type", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=256), nullable=False),
        sa.Column("cash_session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("outbox_status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("sync_state_core", sa.String(length=32), nullable=False, server_default="a_reessayer"),
        sa.Column("correlation_id", sa.String(length=128), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_http_status", sa.Integer(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("last_response_snippet", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["cash_session_id"], ["cash_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("idempotency_key", name="uq_paheko_outbox_idempotency_key"),
    )
    op.create_index("ix_paheko_outbox_operation_type", "paheko_outbox_items", ["operation_type"])
    op.create_index("ix_paheko_outbox_cash_session_id", "paheko_outbox_items", ["cash_session_id"])
    op.create_index("ix_paheko_outbox_site_id", "paheko_outbox_items", ["site_id"])
    op.create_index("ix_paheko_outbox_outbox_status", "paheko_outbox_items", ["outbox_status"])
    op.create_index("ix_paheko_outbox_sync_state_core", "paheko_outbox_items", ["sync_state_core"])
    op.create_index("ix_paheko_outbox_correlation_id", "paheko_outbox_items", ["correlation_id"])


def downgrade() -> None:
    op.drop_index("ix_paheko_outbox_correlation_id", table_name="paheko_outbox_items")
    op.drop_index("ix_paheko_outbox_sync_state_core", table_name="paheko_outbox_items")
    op.drop_index("ix_paheko_outbox_outbox_status", table_name="paheko_outbox_items")
    op.drop_index("ix_paheko_outbox_site_id", table_name="paheko_outbox_items")
    op.drop_index("ix_paheko_outbox_cash_session_id", table_name="paheko_outbox_items")
    op.drop_index("ix_paheko_outbox_operation_type", table_name="paheko_outbox_items")
    op.drop_table("paheko_outbox_items")
