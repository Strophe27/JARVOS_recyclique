"""Story 24.10 — preuves P3 sur remboursements exceptionnels (référence D8 + step-up validateur).

Revision ID: s24_10_exceptional_refund_p3_proof
Revises: s24_9_story_business_tags_sale_items
Create Date: 2026-04-19

"""

from alembic import op
import sqlalchemy as sa


revision = "s24_10_exceptional_refund_p3_proof"
down_revision = "s24_9_story_business_tags_sale_items"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "exceptional_refunds",
        sa.Column("approval_evidence_ref", sa.Text(), nullable=True),
    )
    op.add_column(
        "exceptional_refunds",
        sa.Column("approver_step_up_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("exceptional_refunds", "approver_step_up_at")
    op.drop_column("exceptional_refunds", "approval_evidence_ref")
