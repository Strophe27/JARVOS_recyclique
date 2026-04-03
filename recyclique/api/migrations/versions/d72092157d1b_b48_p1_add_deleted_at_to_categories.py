"""b48_p1_add_deleted_at_to_categories

Revision ID: d72092157d1b
Revises: b47_p5_legacy_category_cache
Create Date: 2025-12-09 12:00:00.000000

Story B48-P1: Ajout colonne deleted_at pour Soft Delete des catégories
Ajoute la colonne deleted_at TIMESTAMP NULL à la table categories pour permettre l'archivage sans perte de données historiques.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TIMESTAMP

# revision identifiers, used by Alembic.
revision = 'd72092157d1b'
down_revision = 'b47_p5_legacy_category_cache'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Story B48-P1: Ajouter colonne deleted_at TIMESTAMP NULL à la table categories
    op.add_column('categories', sa.Column('deleted_at', TIMESTAMP(timezone=True), nullable=True))
    # Ajouter index pour performance des requêtes filtrées
    op.create_index('ix_categories_deleted_at', 'categories', ['deleted_at'])


def downgrade() -> None:
    # Story B48-P1: Supprimer index et colonne deleted_at de la table categories
    op.drop_index('ix_categories_deleted_at', table_name='categories')
    op.drop_column('categories', 'deleted_at')

