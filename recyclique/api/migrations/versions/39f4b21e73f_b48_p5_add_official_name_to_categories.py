"""b48_p5_add_official_name_to_categories

Revision ID: 39f4b21e73f
Revises: f1a2b3c4d5e6
Create Date: 2025-12-09 16:00:00.000000

Story B48-P5: Ajout colonne official_name pour double dénomination des catégories
Ajoute la colonne official_name VARCHAR(255) NULL à la table categories pour permettre
un nom complet officiel (ex: "Articles de bricolage et jardinage thermique") distinct 
du nom court (name, ex: "Bricot") qui reste inchangé.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '39f4b21e73f'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Story B48-P5: Ajouter colonne official_name VARCHAR(255) NULL à la table categories
    # name reste le nom court/rapide (inchangé)
    # official_name est le nom complet officiel (optionnel, à remplir manuellement)
    op.add_column('categories', sa.Column('official_name', sa.String(255), nullable=True))


def downgrade() -> None:
    # Story B48-P5: Supprimer colonne official_name de la table categories
    op.drop_column('categories', 'official_name')

