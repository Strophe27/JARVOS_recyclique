"""merge_b40_p5_and_payment_method

Revision ID: ea87fd9f3cdb
Revises: 66dc64c75ec4, edb26c4fe53b
Create Date: 2025-01-27 15:00:00.000000

Merge des branches b40_p5_add_note_to_sales et convert_payment_method_to_simple_codes
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ea87fd9f3cdb'
down_revision = ('66dc64c75ec4', 'edb26c4fe53b')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Migration de merge - aucune opération nécessaire
    # Les deux migrations précédentes sont déjà appliquées
    pass


def downgrade() -> None:
    # Migration de merge - aucune opération nécessaire
    pass
















