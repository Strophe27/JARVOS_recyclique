"""Story 24.9 — tags métier ticket/ligne (sales, sale_items).

Revision ID: s24_9_story_business_tags_sale_items
Revises: s24_8_cash_internal_transfer_story248
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "s24_9_story_business_tags_sale_items"
down_revision = "s24_8_cash_internal_transfer_story248"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    sales_cols = {c["name"] for c in insp.get_columns("sales")}
    if "business_tag_kind" not in sales_cols:
        op.add_column("sales", sa.Column("business_tag_kind", sa.String(length=64), nullable=True))
    if "business_tag_custom" not in sales_cols:
        op.add_column("sales", sa.Column("business_tag_custom", sa.String(length=256), nullable=True))

    si_cols = {c["name"] for c in insp.get_columns("sale_items")}
    if "business_tag_kind" not in si_cols:
        op.add_column("sale_items", sa.Column("business_tag_kind", sa.String(length=64), nullable=True))
    if "business_tag_custom" not in si_cols:
        op.add_column("sale_items", sa.Column("business_tag_custom", sa.String(length=256), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    si_cols = {c["name"] for c in insp.get_columns("sale_items")}
    if "business_tag_custom" in si_cols:
        op.drop_column("sale_items", "business_tag_custom")
    if "business_tag_kind" in si_cols:
        op.drop_column("sale_items", "business_tag_kind")

    sales_cols = {c["name"] for c in insp.get_columns("sales")}
    if "business_tag_custom" in sales_cols:
        op.drop_column("sales", "business_tag_custom")
    if "business_tag_kind" in sales_cols:
        op.drop_column("sales", "business_tag_kind")
