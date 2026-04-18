"""b49_p1_add_workflow_options_to_cash_registers

Revision ID: b49_p1_workflow
Revises: a1b2c3d4e5f7
Create Date: 2025-01-27 18:00:00.000000

Story B49-P1: Infrastructure Options de Workflow
Ajoute les colonnes workflow_options JSONB, enable_virtual BOOLEAN, et enable_deferred BOOLEAN
à la table cash_registers pour permettre la configuration des options de workflow par caisse.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = 'b49_p1_workflow'
down_revision = 'a1b2c3d4e5f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Story B49-P1: Ajouter colonne workflow_options JSONB NOT NULL DEFAULT '{}'
    op.add_column('cash_registers', sa.Column('workflow_options', JSONB, nullable=False, server_default='{}'))
    
    # Story B49-P1: Ajouter colonne enable_virtual BOOLEAN NOT NULL DEFAULT false
    op.add_column('cash_registers', sa.Column('enable_virtual', sa.Boolean(), nullable=False, server_default='false'))
    
    # Story B49-P1: Ajouter colonne enable_deferred BOOLEAN NOT NULL DEFAULT false
    op.add_column('cash_registers', sa.Column('enable_deferred', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Story B49-P1: Supprimer colonnes workflow_options, enable_virtual, enable_deferred
    op.drop_column('cash_registers', 'enable_deferred')
    op.drop_column('cash_registers', 'enable_virtual')
    op.drop_column('cash_registers', 'workflow_options')



