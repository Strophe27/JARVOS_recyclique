"""b52_p1_add_payment_transactions

Revision ID: b52_p1_payments
Revises: b50_p4_permissions
Create Date: 2025-01-27 23:00:00.000000

Story B52-P1: Paiements multiples à l'encaissement
Crée la table payment_transactions pour supporter plusieurs paiements par vente.
Migre les données existantes : crée un PaymentTransaction pour chaque Sale existant.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM
import uuid

# revision identifiers, used by Alembic.
revision = 'b52_p1_payments'
down_revision = 'b52_p3_sale_date'  # B52-P3 est déjà appliquée
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Story B52-P1: Créer la table payment_transactions
    op.create_table(
        'payment_transactions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('sale_id', UUID(as_uuid=True), sa.ForeignKey('sales.id'), nullable=False),
        sa.Column('payment_method', sa.String(50), nullable=False),  # Utilise le même enum que sales.payment_method
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Créer un index sur sale_id pour améliorer les performances des requêtes
    op.create_index('ix_payment_transactions_sale_id', 'payment_transactions', ['sale_id'])
    
    # Story B52-P1: Migrer les données existantes
    # Pour chaque Sale existant, créer un PaymentTransaction avec payment_method et total_amount
    op.execute("""
        INSERT INTO payment_transactions (id, sale_id, payment_method, amount, created_at)
        SELECT 
            gen_random_uuid(),
            s.id,
            COALESCE(s.payment_method, 'cash'),
            s.total_amount,
            s.created_at
        FROM sales s
        WHERE NOT EXISTS (
            SELECT 1 FROM payment_transactions pt WHERE pt.sale_id = s.id
        )
    """)


def downgrade() -> None:
    # Story B52-P1: Supprimer la table payment_transactions
    op.drop_index('ix_payment_transactions_sale_id', table_name='payment_transactions')
    op.drop_table('payment_transactions')

