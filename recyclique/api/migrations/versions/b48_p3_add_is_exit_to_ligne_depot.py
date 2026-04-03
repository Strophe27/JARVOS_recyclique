"""b48_p3_add_is_exit_to_ligne_depot

Revision ID: f1a2b3c4d5e6
Revises: d72092157d1b
Create Date: 2025-12-09 14:00:00.000000

Story B48-P3: Ajout colonne is_exit pour sorties de stock depuis réception
Ajoute la colonne is_exit BOOLEAN NOT NULL DEFAULT false à la table ligne_depot pour permettre de déclarer des sorties directement depuis l'écran réception.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = 'd72092157d1b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Story B48-P3: Ajouter colonne is_exit BOOLEAN NOT NULL DEFAULT false à la table ligne_depot
    op.add_column('ligne_depot', sa.Column('is_exit', sa.Boolean(), nullable=False, server_default='false'))
    # Ajouter index pour performance des requêtes filtrées
    op.create_index('idx_ligne_depot_is_exit', 'ligne_depot', ['is_exit'])


def downgrade() -> None:
    # Story B48-P3: Supprimer index et colonne is_exit de la table ligne_depot
    op.drop_index('idx_ligne_depot_is_exit', table_name='ligne_depot')
    op.drop_column('ligne_depot', 'is_exit')

