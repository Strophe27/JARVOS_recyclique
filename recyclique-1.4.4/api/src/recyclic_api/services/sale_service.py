"""
Service de création de ventes (logique métier hors routeurs HTTP).

ARCH-04 : extraire la logique lourde de POST /sales depuis endpoints/sales.py.
ARCH-03 : erreurs métier via core.exceptions ; traduction HTTP au routeur ;
          mise à jour note admin (PUT /sales/{id}) déléguée ici.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.core.logging import log_transaction_event
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_transaction import PaymentTransaction
from recyclic_api.models.sale import PaymentMethod, Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.schemas.sale import PaymentCreate, SaleCreate


class SaleService:
    """Création, mise à jour note admin et règles métier associées aux ventes."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def update_admin_note(self, sale_id: str, note: str | None) -> Sale:
        """
        Met à jour le champ ``note`` d'une vente (autorisation admin déjà vérifiée par la route).

        Raises:
            ValidationError: identifiant vente invalide (traduite en 400).
            NotFoundError: vente absente (traduite en 404).
        """
        try:
            sale_uuid = UUID(sale_id)
        except ValueError:
            raise ValidationError("Invalid sale ID format") from None

        db = self.db
        sale = db.query(Sale).filter(Sale.id == sale_uuid).first()
        if not sale:
            raise NotFoundError("Sale not found")

        if note is not None:
            sale.note = note

        db.commit()
        sale = (
            db.query(Sale)
            .options(selectinload(Sale.payments), selectinload(Sale.items))
            .filter(Sale.id == sale_uuid)
            .first()
        )
        if not sale:
            raise NotFoundError("Sale not found")
        return sale

    def create_sale(self, sale_data: SaleCreate, operator_id: str) -> Sale:
        """
        Crée une vente avec lignes, paiements, mise à jour session caisse et log PAYMENT_VALIDATED.

        Raises:
            NotFoundError: session de caisse absente (traduite en 404 par POST /sales/).
            ConflictError: session non ouverte (traduite en 422, contrat historique).
            ValidationError: totaux / paiements incohérents (traduite en 400).
        """
        db = self.db

        cash_session = db.query(CashSession).filter(CashSession.id == sale_data.cash_session_id).first()
        if not cash_session:
            raise NotFoundError("Session de caisse non trouvée")

        if cash_session.status != CashSessionStatus.OPEN:
            raise ConflictError(
                f"Impossible de créer une vente pour une session fermée (statut: {cash_session.status.value})"
            )

        subtotal = sum(item.total_price for item in sale_data.items if item.total_price > 0)
        if subtotal > 0 and sale_data.total_amount < subtotal:
            raise ValidationError(
                f"Le total ({sale_data.total_amount}) ne peut pas être inférieur au sous-total ({subtotal})"
            )

        payments_to_create = self._resolve_payments(sale_data)

        now = datetime.now(timezone.utc)
        session_opened_at = None
        is_deferred_session = False
        if cash_session.opened_at:
            session_opened_at = cash_session.opened_at
            if session_opened_at.tzinfo is None:
                session_opened_at = session_opened_at.replace(tzinfo=timezone.utc)
            time_diff_hours = (now - session_opened_at).total_seconds() / 3600
            if time_diff_hours > 24:
                is_deferred_session = True

        sale_date = session_opened_at if is_deferred_session else now

        # created_at / updated_at explicites : sous PostgreSQL, server_default now() suit
        # transaction_timestamp() et reste identique pour tous les INSERT d'un même test
        # (conftest : transaction racine). Session normale : horodatage mural distinct (now).
        # Session différée (cahier) : aligner sur opened_at comme sale_date (B44 / tests PG).
        timestamps = session_opened_at if is_deferred_session else now
        db_sale = Sale(
            cash_session_id=sale_data.cash_session_id,
            operator_id=operator_id,
            total_amount=sale_data.total_amount,
            donation=sale_data.donation,
            payment_method=sale_data.payment_method,
            note=sale_data.note,
            sale_date=sale_date,
            created_at=timestamps,
            updated_at=timestamps,
        )
        db.add(db_sale)
        db.flush()

        for item_data in sale_data.items:
            db_item = SaleItem(
                sale_id=db_sale.id,
                category=item_data.category,
                quantity=item_data.quantity,
                weight=item_data.weight,
                unit_price=item_data.unit_price,
                total_price=item_data.total_price,
                preset_id=item_data.preset_id,
                notes=item_data.notes,
            )
            db.add(db_item)

        for payment_data in payments_to_create:
            db_payment = PaymentTransaction(
                sale_id=db_sale.id,
                payment_method=payment_data.payment_method,
                amount=payment_data.amount,
            )
            db.add(db_payment)

        db.commit()

        if cash_session:
            session_sales = db.query(
                func.coalesce(func.sum(Sale.total_amount), 0).label("total_sales"),
                func.count(Sale.id).label("total_items"),
            ).filter(Sale.cash_session_id == sale_data.cash_session_id).first()

            cash_session.total_sales = float(session_sales.total_sales)
            cash_session.total_items = session_sales.total_items
            cash_session.current_amount = cash_session.initial_amount + cash_session.total_sales
            db.commit()

        cart_state_before = {
            "items_count": len(sale_data.items),
            "items": [
                {
                    "id": f"item-{idx}",
                    "category": item.category,
                    "weight": item.weight,
                    "price": item.total_price,
                }
                for idx, item in enumerate(sale_data.items)
            ],
            "total": sale_data.total_amount,
        }
        cart_state_after = {"items_count": 0, "items": [], "total": 0.0}

        payment_methods_log = [
            p.payment_method.value if hasattr(p.payment_method, "value") else str(p.payment_method)
            for p in payments_to_create
        ]
        payment_amounts_log = [float(p.amount) for p in payments_to_create]

        log_transaction_event(
            "PAYMENT_VALIDATED",
            {
                "user_id": str(operator_id),
                "session_id": str(sale_data.cash_session_id),
                "transaction_id": str(db_sale.id),
                "cart_state_before": cart_state_before,
                "cart_state_after": cart_state_after,
                "payment_method": payment_methods_log[0] if len(payment_methods_log) == 1 else None,
                "payment_methods": payment_methods_log,
                "payment_amounts": payment_amounts_log,
                "amount": float(sale_data.total_amount),
            },
        )

        db.refresh(db_sale)
        db_sale = (
            db.query(Sale)
            .options(selectinload(Sale.payments), selectinload(Sale.items))
            .filter(Sale.id == db_sale.id)
            .first()
        )
        return db_sale

    def _resolve_payments(self, sale_data: SaleCreate) -> List[PaymentCreate]:
        if sale_data.payments:
            total_payments = sum(p.amount for p in sale_data.payments)
            if total_payments < sale_data.total_amount:
                raise ValidationError(
                    f"La somme des paiements ({total_payments}) doit être supérieure ou égale "
                    f"au total ({sale_data.total_amount})"
                )
            return list(sale_data.payments)
        if sale_data.payment_method:
            return [
                PaymentCreate(
                    payment_method=sale_data.payment_method,
                    amount=sale_data.total_amount,
                )
            ]
        return [
            PaymentCreate(
                payment_method=PaymentMethod.CASH,
                amount=sale_data.total_amount,
            )
        ]
