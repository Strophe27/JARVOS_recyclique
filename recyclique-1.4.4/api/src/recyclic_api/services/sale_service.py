"""
Service de création de ventes (logique métier hors routeurs HTTP).

ARCH-04 : extraire la logique lourde de POST /sales depuis endpoints/sales.py.
ARCH-03 : erreurs métier via core.exceptions ; traduction HTTP au routeur ;
          mise à jour note admin (PUT /sales/{id}), item (PATCH …/items/{item_id}) et
          poids admin (PATCH …/items/{item_id}/weight) déléguées ici.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from recyclic_api.core.audit import log_audit
from recyclic_api.core.exceptions import AuthorizationError, ConflictError, NotFoundError, ValidationError
from recyclic_api.core.user_identity import username_for_audit
from recyclic_api.core.logging import log_transaction_event
from recyclic_api.models.audit_log import AuditActionType
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_transaction import PaymentTransaction
from recyclic_api.models.preset_button import PresetButton
from recyclic_api.models.sale import PaymentMethod, Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.sale import PaymentCreate, SaleCreate, SaleItemUpdate
from recyclic_api.services.statistics_recalculation_service import StatisticsRecalculationService


class SaleService:
    """Création, mise à jour note admin et règles métier associées aux ventes."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def update_sale_item(
        self,
        sale_id: str,
        item_id: str,
        item_update: SaleItemUpdate,
        user: User,
    ) -> SaleItem:
        """
        Met à jour un item de vente (authentification / 401 déjà vérifiés par la route).

        Raises:
            ValidationError: UUID ou valeurs numériques invalides (→ 400).
            NotFoundError: vente ou item absent (→ 404).
            AuthorizationError: modification de prix réservée admin (→ 403).
        """
        db = self.db
        try:
            sale_uuid = UUID(sale_id)
        except ValueError:
            raise ValidationError("Invalid sale ID format") from None
        try:
            item_uuid = UUID(item_id)
        except ValueError:
            raise ValidationError("Invalid item ID format") from None

        sale = db.query(Sale).filter(Sale.id == sale_uuid).first()
        if not sale:
            raise NotFoundError("Sale not found")

        item = db.query(SaleItem).filter(SaleItem.id == item_uuid, SaleItem.sale_id == sale_uuid).first()
        if not item:
            raise NotFoundError("Sale item not found")

        if item_update.unit_price is not None:
            if user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
                raise AuthorizationError(
                    "Insufficient permissions. Admin access required to modify price."
                )
            new_price = item_update.unit_price
            if new_price < 0:
                raise ValidationError("Price must be >= 0")
            old_price = item.unit_price
            log_audit(
                action_type=AuditActionType.SYSTEM_CONFIG_CHANGED,
                actor=user,
                target_id=item_uuid,
                target_type="sale_item",
                details={
                    "sale_id": str(sale_uuid),
                    "item_id": str(item_uuid),
                    "old_price": float(old_price),
                    "new_price": float(new_price),
                    "user_id": str(user.id),
                    "username": username_for_audit(user.username),
                },
                description=f"Price modification: {old_price} → {new_price} for item {item_id}",
                db=db,
            )

        if item_update.quantity is not None:
            if item_update.quantity <= 0:
                raise ValidationError("Quantity must be > 0")
            item.quantity = item_update.quantity

        if item_update.weight is not None:
            if item_update.weight <= 0:
                raise ValidationError("Weight must be > 0")
            item.weight = item_update.weight

        if item_update.unit_price is not None:
            item.unit_price = item_update.unit_price
            item.total_price = item_update.unit_price

        if item_update.preset_id is not None:
            preset = db.query(PresetButton).filter(PresetButton.id == item_update.preset_id).first()
            if not preset:
                raise ValidationError("Preset not found")
            item.preset_id = item_update.preset_id

        if item_update.notes is not None:
            item.notes = item_update.notes

        db.commit()
        db.refresh(item)
        return item

    def update_sale_item_weight_admin(
        self,
        sale_id: str,
        item_id: str,
        new_weight: float,
        actor: Any,
    ) -> SaleItem:
        """
        Met à jour le poids d'un item de vente (admin / super-admin — vérifié par la route).

        Recalcule les statistiques impactées, journalise l'audit et valide la transaction
        (même enchaînement flush → recalcul → log_audit → commit qu'avant extraction).

        Raises:
            ValidationError: UUID invalides (détail ``Invalid ID format``) ou poids ≤ 0.
            NotFoundError: item absent ou ne correspond pas à la vente.
        """
        db = self.db
        try:
            sale_uuid = UUID(sale_id)
            item_uuid = UUID(item_id)
        except ValueError:
            raise ValidationError("Invalid ID format") from None

        if new_weight <= 0:
            raise ValidationError("Le poids doit être supérieur à 0")

        item = db.query(SaleItem).filter(
            SaleItem.id == item_uuid,
            SaleItem.sale_id == sale_uuid,
        ).first()
        if not item:
            raise NotFoundError("Sale item not found")

        old_weight = float(item.weight) if item.weight else 0.0
        item.weight = new_weight
        db.flush()

        recalculation_result = None
        try:
            recalculation_service = StatisticsRecalculationService(db)
            recalculation_result = recalculation_service.recalculate_after_sale_item_weight_update(
                sale_id=sale_uuid,
                item_id=item_uuid,
                old_weight=old_weight,
                new_weight=new_weight,
            )
        except Exception as e:  # pragma: no cover - chemin de secours
            recalculation_result = {"error": str(e)}

        log_audit(
            action_type=AuditActionType.SYSTEM_CONFIG_CHANGED,
            actor=actor,
            target_id=item_uuid,
            target_type="sale_item",
            details={
                "sale_id": str(sale_uuid),
                "item_id": str(item_uuid),
                "old_weight": old_weight,
                "new_weight": new_weight,
                "weight_delta": new_weight - old_weight,
                "recalculation_result": recalculation_result,
            },
            description=f"Modification du poids d'un item de vente: {old_weight} kg → {new_weight} kg",
            db=db,
        )

        db.commit()
        db.refresh(item)
        return item

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
