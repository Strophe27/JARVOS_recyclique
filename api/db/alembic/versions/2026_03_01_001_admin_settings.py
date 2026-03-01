# Story 17.6 - persistance parametres admin.

"""admin_settings (story 17.6)

Revision ID: 2026_03_01_001
Revises: 2026_02_28_12_4
Create Date: 2026-03-01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "2026_03_01_001"
down_revision: Union[str, None] = "2026_02_28_12_4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("alert_thresholds", sa.JSON(), nullable=True),
        sa.Column("session", sa.JSON(), nullable=True),
        sa.Column("email", sa.JSON(), nullable=True),
        sa.Column("activity_threshold", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_admin_settings_activity_threshold",
        "admin_settings",
        ["activity_threshold"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_admin_settings_activity_threshold", table_name="admin_settings")
    op.drop_table("admin_settings")
