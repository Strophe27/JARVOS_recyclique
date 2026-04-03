"""b50_p4_add_virtual_deferred_permissions

Revision ID: b50_p4_permissions
Revises: b49_p1_workflow
Create Date: 2025-01-27 20:00:00.000000

Story B50-P4: Séparation Permissions Caisse Virtuelle et Différée
Ajoute les permissions caisse.virtual.access et caisse.deferred.access pour permettre
une gestion fine des accès selon le type de caisse.
"""
from alembic import op
import sqlalchemy as sa
import uuid

# revision identifiers, used by Alembic.
revision = 'b50_p4_permissions'
down_revision = 'b49_p1_workflow'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Define the permissions table structure
    permissions_table = sa.table(
        'permissions',
        sa.column('id', sa.UUID),
        sa.column('name', sa.String),
        sa.column('description', sa.Text)
    )
    
    # Insert the 2 new permissions
    op.bulk_insert(permissions_table, [
        {
            'id': str(uuid.uuid4()),
            'name': 'caisse.virtual.access',
            'description': 'Accès à la caisse virtuelle uniquement'
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'caisse.deferred.access',
            'description': 'Accès à la caisse différée uniquement'
        }
    ])


def downgrade() -> None:
    # Remove the new permissions by name
    op.execute("""
        DELETE FROM permissions 
        WHERE name IN (
            'caisse.virtual.access',
            'caisse.deferred.access'
        )
    """)

