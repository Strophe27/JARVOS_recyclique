# Story 12.3 — tables de synchronisation membres Paheko (phase 1).

"""paheko member sync phase 1 (story 12.3)

Revision ID: 2026_02_28_12_3
Revises: 2026_02_27_9_1
Create Date: 2026-02-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "2026_02_28_12_3"
down_revision: Union[str, None] = "2026_02_27_9_1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "paheko_member_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("paheko_member_id", sa.String(length=128), nullable=False),
        sa.Column("sub", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=64), nullable=False),
        sa.Column("tenant", sa.String(length=128), nullable=False),
        sa.Column("membership_status", sa.String(length=64), nullable=False),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("local_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["local_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("paheko_member_id", name="uq_paheko_member_links_paheko_member_id"),
    )
    op.create_index(
        "idx_paheko_member_links_paheko_member_id",
        "paheko_member_links",
        ["paheko_member_id"],
        unique=True,
    )
    op.create_index(
        "idx_paheko_member_links_sub",
        "paheko_member_links",
        ["sub"],
        unique=False,
    )
    op.create_index(
        "idx_paheko_member_links_email",
        "paheko_member_links",
        ["email"],
        unique=False,
    )
    op.create_index(
        "idx_paheko_member_links_tenant",
        "paheko_member_links",
        ["tenant"],
        unique=False,
    )

    op.create_table(
        "paheko_member_sync_state",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_status", sa.String(length=32), nullable=False),
        sa.Column("last_request_id", sa.String(length=64), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("watermark", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_cursor", sa.String(length=128), nullable=True),
        sa.Column("last_created_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_updated_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_deleted_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_conflict_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("scheduler_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("paheko_member_sync_state")
    op.drop_index("idx_paheko_member_links_tenant", table_name="paheko_member_links")
    op.drop_index("idx_paheko_member_links_email", table_name="paheko_member_links")
    op.drop_index("idx_paheko_member_links_sub", table_name="paheko_member_links")
    op.drop_index("idx_paheko_member_links_paheko_member_id", table_name="paheko_member_links")
    op.drop_table("paheko_member_links")

