# Story 12.4 - exceptions d'acces Paheko avec garde-fous operationnels.

"""paheko access exceptions (story 12.4)

Revision ID: 2026_02_28_12_4
Revises: 2026_02_28_12_3
Create Date: 2026-02-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "2026_02_28_12_4"
down_revision: Union[str, None] = "2026_02_28_12_3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "paheko_access_exceptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approved_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("revocation_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["revoked_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_paheko_access_exceptions_user_id",
        "paheko_access_exceptions",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "idx_paheko_access_exceptions_expires_at",
        "paheko_access_exceptions",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "idx_paheko_access_exceptions_revoked_at",
        "paheko_access_exceptions",
        ["revoked_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_paheko_access_exceptions_revoked_at", table_name="paheko_access_exceptions")
    op.drop_index("idx_paheko_access_exceptions_expires_at", table_name="paheko_access_exceptions")
    op.drop_index("idx_paheko_access_exceptions_user_id", table_name="paheko_access_exceptions")
    op.drop_table("paheko_access_exceptions")
