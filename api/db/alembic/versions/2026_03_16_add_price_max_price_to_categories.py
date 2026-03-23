"""Add price and max_price to categories table.

Revision ID: 2026_03_16_001
Revises: 2026_03_01_002
Create Date: 2026-03-16

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "2026_03_16_001"
down_revision: Union[str, None] = "2026_03_01_002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("price", sa.Numeric(10, 2), nullable=True))
    op.add_column("categories", sa.Column("max_price", sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("categories", "max_price")
    op.drop_column("categories", "price")
