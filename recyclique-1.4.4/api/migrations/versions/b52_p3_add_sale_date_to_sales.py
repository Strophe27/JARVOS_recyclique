"""b52_p3_add_sale_date_to_sales

Revision ID: b52_p3_sale_date
Revises: b50_p4_permissions
Create Date: 2025-01-27 22:00:00.000000

Story B52-P3: Ajout colonne sale_date pour distinguer date réelle du ticket et date d'enregistrement
Ajoute la colonne sale_date TIMESTAMP WITH TIME ZONE NULL à la table sales pour permettre
de distinguer la date réelle du ticket (date du cahier) de la date d'enregistrement (created_at).
Pour les sessions différées, sale_date = opened_at (date du cahier), created_at = NOW() (date de saisie).
Pour les sessions normales, sale_date = created_at (même valeur).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TIMESTAMP

# revision identifiers, used by Alembic.
revision = 'b52_p3_sale_date'
down_revision = 'b50_p4_permissions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Story B52-P3: Ajouter colonne sale_date TIMESTAMP WITH TIME ZONE NULL à la table sales
    op.add_column('sales', sa.Column('sale_date', TIMESTAMP(timezone=True), nullable=True))
    
    # Story B52-P3: Remplir sale_date = created_at pour toutes les ventes existantes
    # Cela garantit que les données existantes ont une valeur pour sale_date
    op.execute("""
        UPDATE sales 
        SET sale_date = created_at 
        WHERE sale_date IS NULL
    """)
    
    # Optionnel: Rendre la colonne NOT NULL après remplissage
    # Pour l'instant, on laisse nullable pour compatibilité, mais on peut la rendre NOT NULL plus tard
    # op.alter_column('sales', 'sale_date', nullable=False)


def downgrade() -> None:
    # Story B52-P3: Supprimer colonne sale_date de la table sales
    op.drop_column('sales', 'sale_date')

