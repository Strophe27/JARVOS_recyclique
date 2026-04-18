"""b48_p4_add_display_order_entry_to_categories

Revision ID: a1b2c3d4e5f7
Revises: 39f4b21e73f
Create Date: 2025-12-10 10:00:00.000000

Story B48-P4: Ajout colonne display_order_entry pour ordre d'affichage ENTRY/DEPOT
Ajoute la colonne display_order_entry INTEGER NOT NULL DEFAULT 0 à la table categories
pour permettre un ordre d'affichage distinct entre les contextes SALE (display_order)
et ENTRY/DEPOT (display_order_entry).
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f7'
down_revision = '39f4b21e73f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Story B48-P4: Ajouter colonne display_order_entry INTEGER NOT NULL DEFAULT 0 à la table categories
    # display_order reste pour SALE/CASH (inchangé)
    # display_order_entry est pour ENTRY/DEPOT (nouveau)
    op.add_column('categories', sa.Column('display_order_entry', sa.Integer(), nullable=False, server_default='0'))
    # Ajouter index pour performance du tri par display_order_entry
    op.create_index('ix_categories_display_order_entry', 'categories', ['display_order_entry'])


def downgrade() -> None:
    # Story B48-P4: Supprimer index et colonne display_order_entry de la table categories
    op.drop_index('ix_categories_display_order_entry', table_name='categories')
    op.drop_column('categories', 'display_order_entry')