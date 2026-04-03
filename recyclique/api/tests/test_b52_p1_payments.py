"""
Tests unitaires pour les paiements multiples (Story B52-P1)

Valide :
- Création de PaymentTransaction
- Validation des paiements multiples
- Calcul de la somme des paiements
- Rétrocompatibilité avec payment_method unique
"""

import pytest
import uuid
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from recyclic_api.models.payment_transaction import PaymentTransaction
from recyclic_api.models.sale import Sale, PaymentMethod
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.cash_register import CashRegister


class TestPaymentTransactionModel:
    """Tests unitaires pour le modèle PaymentTransaction"""

    def test_create_payment_transaction(self, db_session: Session):
        """Test de création d'une transaction de paiement"""
        # Créer une vente de test
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=uuid.uuid4(),
            operator_id=uuid.uuid4(),
            total_amount=50.0,
            donation=0.0
        )
        db_session.add(sale)
        db_session.flush()

        # Créer une transaction de paiement
        payment = PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            amount=50.0
        )
        db_session.add(payment)
        db_session.commit()

        # Vérifier que la transaction a été créée
        assert payment.id is not None
        assert payment.sale_id == sale.id
        assert payment.payment_method == PaymentMethod.CASH
        assert payment.amount == 50.0
        assert payment.created_at is not None

    def test_payment_transaction_relationship(self, db_session: Session):
        """Test de la relation entre Sale et PaymentTransaction"""
        # Créer une vente
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=uuid.uuid4(),
            operator_id=uuid.uuid4(),
            total_amount=100.0,
            donation=0.0
        )
        db_session.add(sale)
        db_session.flush()

        # Créer plusieurs transactions de paiement
        payment1 = PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            amount=50.0
        )
        payment2 = PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CHECK,
            amount=50.0
        )
        db_session.add(payment1)
        db_session.add(payment2)
        db_session.commit()

        # Vérifier la relation
        db_session.refresh(sale)
        assert len(sale.payments) == 2
        assert payment1 in sale.payments
        assert payment2 in sale.payments

    def test_payment_transaction_cascade_delete(self, db_session: Session):
        """Test que la suppression d'une vente supprime ses paiements"""
        # Créer une vente avec paiements
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=uuid.uuid4(),
            operator_id=uuid.uuid4(),
            total_amount=100.0,
            donation=0.0
        )
        db_session.add(sale)
        db_session.flush()

        payment = PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            amount=100.0
        )
        db_session.add(payment)
        db_session.commit()

        payment_id = payment.id

        # Supprimer la vente
        db_session.delete(sale)
        db_session.commit()

        # Vérifier que le paiement a été supprimé (cascade)
        deleted_payment = db_session.query(PaymentTransaction).filter(
            PaymentTransaction.id == payment_id
        ).first()
        assert deleted_payment is None


class TestMultiplePaymentsValidation:
    """Tests de validation des paiements multiples"""

    def test_sum_payments_equals_total(self, db_session: Session):
        """Test que la somme des paiements peut être égale au total"""
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=uuid.uuid4(),
            operator_id=uuid.uuid4(),
            total_amount=100.0,
            donation=0.0
        )
        db_session.add(sale)
        db_session.flush()

        # Créer deux paiements qui totalisent exactement 100.0
        payment1 = PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            amount=50.0
        )
        payment2 = PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CHECK,
            amount=50.0
        )
        db_session.add(payment1)
        db_session.add(payment2)
        db_session.commit()

        # Vérifier la somme
        total_payments = sum(p.amount for p in sale.payments)
        assert total_payments == 100.0

    def test_sum_payments_greater_than_total(self, db_session: Session):
        """Test que la somme des paiements peut être supérieure au total (reste pour espèces)"""
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=uuid.uuid4(),
            operator_id=uuid.uuid4(),
            total_amount=100.0,
            donation=0.0
        )
        db_session.add(sale)
        db_session.flush()

        # Créer un paiement espèces supérieur au total (reste = 5.0)
        payment = PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            amount=105.0
        )
        db_session.add(payment)
        db_session.commit()

        # Vérifier que la somme est supérieure au total
        total_payments = sum(p.amount for p in sale.payments)
        assert total_payments == 105.0
        assert total_payments > sale.total_amount

    def test_multiple_payment_methods(self, db_session: Session):
        """Test avec plusieurs moyens de paiement différents"""
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=uuid.uuid4(),
            operator_id=uuid.uuid4(),
            total_amount=150.0,
            donation=0.0
        )
        db_session.add(sale)
        db_session.flush()

        # Créer trois paiements avec moyens différents
        payments = [
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CASH,
                amount=50.0
            ),
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CHECK,
                amount=75.0
            ),
            PaymentTransaction(
                sale_id=sale.id,
                payment_method=PaymentMethod.CARD,
                amount=25.0
            )
        ]
        for payment in payments:
            db_session.add(payment)
        db_session.commit()

        # Vérifier que tous les paiements sont présents
        db_session.refresh(sale)
        assert len(sale.payments) == 3
        assert sum(p.amount for p in sale.payments) == 150.0

        # Vérifier les moyens de paiement
        methods = {p.payment_method for p in sale.payments}
        assert PaymentMethod.CASH in methods
        assert PaymentMethod.CHECK in methods
        assert PaymentMethod.CARD in methods

    def test_payment_with_donation(self, db_session: Session):
        """Test avec don inclus dans le total"""
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=uuid.uuid4(),
            operator_id=uuid.uuid4(),
            total_amount=120.0,  # 100.0 base + 20.0 don
            donation=20.0
        )
        db_session.add(sale)
        db_session.flush()

        # Créer un paiement qui couvre le total (inclut le don)
        payment = PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CHECK,
            amount=120.0
        )
        db_session.add(payment)
        db_session.commit()

        # Vérifier que le paiement couvre le total (inclut le don)
        total_payments = sum(p.amount for p in sale.payments)
        assert total_payments == 120.0
        assert total_payments >= sale.total_amount


class TestBackwardCompatibility:
    """Tests de rétrocompatibilité avec payment_method unique"""

    def test_sale_without_payments(self, db_session: Session):
        """Test qu'une vente peut exister sans PaymentTransaction (rétrocompatibilité)"""
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=uuid.uuid4(),
            operator_id=uuid.uuid4(),
            total_amount=50.0,
            donation=0.0
        )
        db_session.add(sale)
        db_session.commit()

        # Vérifier que la vente existe sans paiements
        db_session.refresh(sale)
        assert len(sale.payments) == 0
        assert sale.total_amount == 50.0



