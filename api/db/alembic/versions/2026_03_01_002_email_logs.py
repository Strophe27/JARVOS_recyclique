# Story 17.8 — table email_logs pour logs email admin.

"""email_logs (story 17.8)

Revision ID: 2026_03_01_002
Revises: 2026_03_01_001
Create Date: 2026-03-01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "2026_03_01_002"
down_revision: Union[str, None] = "2026_03_01_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column("subject", sa.String(512), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_email_logs_sent_at", "email_logs", ["sent_at"], unique=False)
    op.create_index("idx_email_logs_recipient", "email_logs", ["recipient"], unique=False)
    op.create_index("idx_email_logs_status", "email_logs", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_email_logs_status", table_name="email_logs")
    op.drop_index("idx_email_logs_recipient", table_name="email_logs")
    op.drop_index("idx_email_logs_sent_at", table_name="email_logs")
    op.drop_table("email_logs")
