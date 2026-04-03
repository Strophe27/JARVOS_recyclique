"""b40_p5_add_note_to_sales

Revision ID: 66dc64c75ec4
Revises: story_12_add_category_visibility
Create Date: 2025-01-27 14:30:00.000000

Story B40-P5: Migration DB – Notes sur les tickets
Ajoute la colonne note TEXT NULL à la table sales pour stocker les notes sur les tickets de caisse.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '66dc64c75ec4'
down_revision = 'story_12_add_category_visibility'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Story B40-P5: Ajouter colonne note TEXT NULL à la table sales
    op.add_column('sales', sa.Column('note', sa.Text(), nullable=True))


def downgrade() -> None:
    # Story B40-P5: Supprimer colonne note de la table sales
    op.drop_column('sales', 'note')
















