"""
Service de création de ventes (logique métier hors routeurs HTTP).

ARCH-04 : extraire la logique lourde de POST /sales depuis endpoints/sales.py.
ARCH-03 : erreurs métier via core.exceptions ; traduction HTTP au routeur ;
          mise à jour note admin (PUT /sales/{id}), item (PATCH …/items/{item_id}) et
          poids admin (PATCH …/items/{item_id}/weight) déléguées ici.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional, Union
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from recyclic_api.core.audit import log_audit, log_cash_sale
from recyclic_api.core.auth import user_has_permission
from recyclic_api.core.exceptions import AuthorizationError, ConflictError, NotFoundError, ValidationError
from recyclic_api.core.user_identity import username_for_audit
from recyclic_api.core.logging import log_transaction_event
from recyclic_api.models.audit_log import AuditActionType
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_transaction import PaymentTransaction
from recyclic_api.models.preset_button import PresetButton
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus, SpecialEncaissementKind
from recyclic_api.models.sale_reversal import SaleReversal
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.sale import (
    PaymentCreate,
    SaleCorrectionFinalizeFieldsPayload,
    SaleCorrectionSaleDatePayload,
    SaleCreate,
    SaleFinalizeHeld,
    SaleHoldCreate,
    SaleItemUpdate,
    SaleReversalCreate,
)
from recyclic_api.services.statistics_recalculation_service import StatisticsRecalculationService


CAISSE_ACCESS_PERMISSION_KEY = "caisse.access"
CAISSE_VIRTUAL_ACCESS_PERMISSION_KEY = "caisse.virtual.access"
CAISSE_DEFERRED_ACCESS_PERMISSION_KEY = "caisse.deferred.access"
CAISSE_REFUND_PERMISSION_KEY = "caisse.refund"
# Story 6.5 — don sans article / adhésion : distinct de l’accès nominal (même principe que caisse.refund).
CAISSE_SPECIAL_ENCAISSEMENT_PERMISSION_KEY = "caisse.special_encaissement"
# Story 6.6 — actions sociales / solidaires (lot 1) : distinct de 6.5 et de caisse.refund.
CAISSE_SOCIAL_ENCAISSEMENT_PERMISSION_KEY = "caisse.social_encaissement"

# Story 6.3 — borne produit (liste + refus serveur si dépassé).
MAX_HELD_SALES_PER_SESSION = 10


def user_has_any_cash_sale_access(user: User, db: Session) -> bool:
    """Brownfield-first Epic 6 : réel | virtuel | différé ouvrent le même cadre de vente."""
    return any(
        user_has_permission(user, permission_name, db)
        for permission_name in (
            CAISSE_ACCESS_PERMISSION_KEY,
            CAISSE_VIRTUAL_ACCESS_PERMISSION_KEY,
            CAISSE_DEFERRED_ACCESS_PERMISSION_KEY,
        )
    )


def cash_sale_access_error_message() -> str:
    return (
        "Permission requise: au moins une des permissions "
        f"{CAISSE_ACCESS_PERMISSION_KEY}, "
        f"{CAISSE_VIRTUAL_ACCESS_PERMISSION_KEY}, "
        f"{CAISSE_DEFERRED_ACCESS_PERMISSION_KEY}"
    )


class SaleService:
    """Création, mise à jour note admin et règles métier associées aux ventes."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_sale_readable_by_user(self, sale_id: str, user_id: str) -> Sale:
        """
        Détail vente (ticket) avec revalidation contexte caisse (Story 6.2).

        Raises:
            ValidationError: identifiant vente invalide (→ 400).
            NotFoundError: vente absente (→ 404).
            AuthorizationError: permission / site / opérateur (→ 403).
        """
        db = self.db
        try:
            sale_uuid = UUID(sale_id)
        except ValueError:
            raise ValidationError("Invalid sale ID format") from None

        try:
            user_uuid = UUID(str(user_id))
        except ValueError as e:
            raise ValidationError("Identifiant utilisateur invalide") from e

        user = db.query(User).filter(User.id == user_uuid).first()
        if not user:
            raise AuthorizationError("Utilisateur introuvable — lecture ticket refusée.")

        sale = (
            db.query(Sale)
            .options(
                selectinload(Sale.payments),
                selectinload(Sale.items),
                selectinload(Sale.cash_session),
            )
            .filter(Sale.id == sale_uuid)
            .first()
        )
        if not sale:
            raise NotFoundError("Sale not found")

        if sale.lifecycle_status == SaleLifecycleStatus.ABANDONED:
            raise NotFoundError("Sale not found")

        if user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
            return sale

        if not user_has_any_cash_sale_access(user, db):
            raise AuthorizationError(cash_sale_access_error_message())

        if user.site_id is None:
            raise AuthorizationError(
                "Aucun site d'exploitation affecté — lecture ticket refusée."
            )

        cash_session = sale.cash_session
        if cash_session is None:
            cash_session = db.query(CashSession).filter(CashSession.id == sale.cash_session_id).first()
        if cash_session is not None and user.site_id != cash_session.site_id:
            raise AuthorizationError("La vente n'appartient pas à votre site d'exploitation.")

        if sale.operator_id is None or sale.operator_id != user.id:
            raise AuthorizationError("Vente hors de votre périmètre opérateur.")

        return sale

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

        if sale.lifecycle_status == SaleLifecycleStatus.ABANDONED:
            raise NotFoundError("Sale not found")
        if sale.lifecycle_status == SaleLifecycleStatus.HELD:
            raise ConflictError(
                "Ticket en attente : modification de ligne interdite — utiliser finalisation ou abandon côté caisse."
            )

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

    def _load_cash_session_operator_user(
        self, cash_session_id: UUID, operator_id: str
    ) -> tuple[CashSession, User, UUID]:
        """
        Story 6.1 / 6.2 / 6.3 — session ouverte + règles opérateur / site / permission caisse.
        """
        db = self.db
        cash_session = db.query(CashSession).filter(CashSession.id == cash_session_id).first()
        if not cash_session:
            raise NotFoundError("Session de caisse non trouvée")

        try:
            op_uuid = UUID(str(operator_id))
        except ValueError as e:
            raise ValidationError("Identifiant opérateur invalide") from e

        operator_user = db.query(User).filter(User.id == op_uuid).first()
        if not operator_user:
            raise AuthorizationError("Utilisateur authentifié introuvable — vente refusée.")

        privileged = operator_user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)

        if not privileged and cash_session.operator_id != op_uuid:
            raise AuthorizationError(
                "L'opérateur authentifié ne correspond pas à la session de caisse cible."
            )

        if not privileged:
            if operator_user.site_id is None:
                raise AuthorizationError(
                    "Aucun site d'exploitation affecté — impossible d'enregistrer une vente."
                )
            if operator_user.site_id != cash_session.site_id:
                raise AuthorizationError(
                    "Le site de la session de caisse ne correspond pas à votre affectation."
                )
            if not user_has_any_cash_sale_access(operator_user, db):
                raise AuthorizationError(cash_sale_access_error_message())

        if cash_session.status != CashSessionStatus.OPEN:
            raise ConflictError(
                f"Impossible de créer une vente pour une session fermée (statut: {cash_session.status.value})"
            )

        return cash_session, operator_user, op_uuid

    def create_sale(
        self,
        sale_data: SaleCreate,
        operator_id: str,
        request_id: Optional[str] = None,
    ) -> Sale:
        """
        Crée une vente avec lignes, paiements, mise à jour session caisse et log PAYMENT_VALIDATED.

        Raises:
            NotFoundError: session de caisse absente (traduite en 404 par POST /sales/).
            ConflictError: session non ouverte (traduite en 422, contrat historique).
            ValidationError: totaux / paiements incohérents (traduite en 400).
        """
        db = self.db

        cash_session, operator_user, _ = self._load_cash_session_operator_user(
            sale_data.cash_session_id, operator_id
        )

        soc_kind = sale_data.social_action_kind
        s_kind = sale_data.special_encaissement_kind

        if soc_kind is not None:
            if not user_has_permission(operator_user, CAISSE_SOCIAL_ENCAISSEMENT_PERMISSION_KEY, db):
                raise AuthorizationError(f"Permission requise: {CAISSE_SOCIAL_ENCAISSEMENT_PERMISSION_KEY}")
            if len(sale_data.items) > 0:
                raise ValidationError(
                    "Une action sociale ne doit pas comporter de lignes article — utiliser items []."
                )
            if sale_data.total_amount <= 0:
                raise ValidationError("Action sociale / solidaire : le total doit être strictement positif (Story 6.6).")
            if (sale_data.adherent_reference or "").strip():
                raise ValidationError(
                    "Le champ adherent_reference n'est pas utilisé pour une action sociale."
                )
        elif s_kind is not None:
            if not user_has_permission(operator_user, CAISSE_SPECIAL_ENCAISSEMENT_PERMISSION_KEY, db):
                raise AuthorizationError(f"Permission requise: {CAISSE_SPECIAL_ENCAISSEMENT_PERMISSION_KEY}")
            if len(sale_data.items) > 0:
                raise ValidationError(
                    "Un encaissement spécial (don / adhésion) ne doit pas comporter de lignes article — utiliser items []."
                )
            if s_kind == SpecialEncaissementKind.DON_SANS_ARTICLE:
                if sale_data.total_amount < 0:
                    raise ValidationError("Don sans article : le total doit être supérieur ou égal à 0.")
                if (sale_data.adherent_reference or "").strip():
                    raise ValidationError(
                        "Le champ adherent_reference n'est pas utilisé pour un don sans article."
                    )
            elif s_kind == SpecialEncaissementKind.ADHESION_ASSOCIATION:
                if sale_data.total_amount <= 0:
                    raise ValidationError("Adhésion / cotisation : le total doit être strictement positif.")
        else:
            if len(sale_data.items) < 1:
                raise ValidationError(
                    "Au moins une ligne article est requise pour une vente nominale, "
                    "ou indiquez special_encaissement_kind ou social_action_kind pour un encaissement sans article."
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
        op_for_sale = UUID(str(operator_id)) if not isinstance(operator_id, UUID) else operator_id
        adherent_ref = (sale_data.adherent_reference or "").strip() or None
        if s_kind == SpecialEncaissementKind.ADHESION_ASSOCIATION:
            pass  # adherent_ref optional
        else:
            adherent_ref = None

        db_sale = Sale(
            cash_session_id=sale_data.cash_session_id,
            operator_id=op_for_sale,
            total_amount=sale_data.total_amount,
            donation=sale_data.donation,
            payment_method=sale_data.payment_method,
            note=sale_data.note,
            sale_date=sale_date,
            lifecycle_status=SaleLifecycleStatus.COMPLETED,
            created_at=timestamps,
            updated_at=timestamps,
            special_encaissement_kind=s_kind.value if s_kind else None,
            social_action_kind=soc_kind.value if soc_kind else None,
            adherent_reference=adherent_ref,
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

        # Une seule transaction : vente + lignes + paiements + agrégats session caisse.
        # Story 6.3 : les tickets « en attente » (held) ne comptent pas dans les agrégats tant qu'ils ne sont pas finalisés.
        session_sales = db.query(
            func.coalesce(func.sum(Sale.total_amount), 0).label("total_sales"),
            func.count(Sale.id).label("total_items"),
        ).filter(
            Sale.cash_session_id == sale_data.cash_session_id,
            Sale.lifecycle_status == SaleLifecycleStatus.COMPLETED,
        ).first()

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

        tx_payload: dict = {
            "user_id": str(operator_id),
            "session_id": str(sale_data.cash_session_id),
            "transaction_id": str(db_sale.id),
            "cart_state_before": cart_state_before,
            "cart_state_after": cart_state_after,
            "payment_method": payment_methods_log[0] if len(payment_methods_log) == 1 else None,
            "payment_methods": payment_methods_log,
            "payment_amounts": payment_amounts_log,
            "amount": float(sale_data.total_amount),
        }
        if s_kind is not None:
            tx_payload["special_encaissement_kind"] = s_kind.value
            if adherent_ref:
                tx_payload["adherent_reference"] = adherent_ref
        if soc_kind is not None:
            tx_payload["social_action_kind"] = soc_kind.value

        log_transaction_event(
            "PAYMENT_VALIDATED",
            tx_payload,
            request_id=request_id,
        )

        op = db.query(User).filter(User.id == UUID(str(operator_id))).first()
        op_name = username_for_audit(op.username) if op else "unknown"
        log_cash_sale(
            user_id=str(operator_id),
            username=op_name,
            sale_id=str(db_sale.id),
            amount=float(sale_data.total_amount),
            success=True,
            db=db,
            request_id=request_id,
            site_id=str(cash_session.site_id) if cash_session.site_id else None,
            cash_register_id=str(cash_session.register_id) if cash_session.register_id else None,
            session_id=str(cash_session.id),
        )

        if s_kind is not None:
            log_audit(
                action_type=AuditActionType.SYSTEM_CONFIG_CHANGED,
                actor=operator_user,
                target_id=db_sale.id,
                target_type="sale",
                details={
                    "operation": "special_encaissement",
                    "special_encaissement_kind": s_kind.value,
                    "adherent_reference": adherent_ref,
                    "cash_session_id": str(sale_data.cash_session_id),
                    "request_id": request_id,
                },
                description=f"Encaissement spécial caisse ({s_kind.value})",
                db=db,
            )

        if soc_kind is not None:
            log_audit(
                action_type=AuditActionType.SYSTEM_CONFIG_CHANGED,
                actor=operator_user,
                target_id=db_sale.id,
                target_type="sale",
                details={
                    "operation": "social_encaissement",
                    "social_action_kind": soc_kind.value,
                    "cash_session_id": str(sale_data.cash_session_id),
                    "request_id": request_id,
                },
                description=f"Encaissement action sociale caisse ({soc_kind.value})",
                db=db,
            )

        db.refresh(db_sale)
        db_sale = (
            db.query(Sale)
            .options(selectinload(Sale.payments), selectinload(Sale.items))
            .filter(Sale.id == db_sale.id)
            .first()
        )
        return db_sale

    def create_held_sale(
        self,
        hold_data: SaleHoldCreate,
        operator_id: str,
        request_id: Optional[str] = None,
    ) -> Sale:
        """Story 6.3 — persiste un panier sans paiement ; n'altère pas les agrégats de session."""
        db = self.db
        cash_session, operator_user, op_uuid = self._load_cash_session_operator_user(
            hold_data.cash_session_id, operator_id
        )

        held_count = (
            db.query(func.count(Sale.id))
            .filter(
                Sale.cash_session_id == hold_data.cash_session_id,
                Sale.lifecycle_status == SaleLifecycleStatus.HELD,
            )
            .scalar()
        )
        if (held_count or 0) >= MAX_HELD_SALES_PER_SESSION:
            raise ConflictError(
                f"Nombre maximal de tickets en attente pour cette session ({MAX_HELD_SALES_PER_SESSION}) atteint."
            )

        subtotal = sum(item.total_price for item in hold_data.items if item.total_price > 0)
        if subtotal > 0 and hold_data.total_amount < subtotal:
            raise ValidationError(
                f"Le total ({hold_data.total_amount}) ne peut pas être inférieur au sous-total ({subtotal})"
            )

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
        timestamps = session_opened_at if is_deferred_session else now

        db_sale = Sale(
            cash_session_id=hold_data.cash_session_id,
            operator_id=op_uuid,
            total_amount=hold_data.total_amount,
            donation=hold_data.donation,
            payment_method=PaymentMethod.CASH,
            note=hold_data.note,
            sale_date=sale_date,
            lifecycle_status=SaleLifecycleStatus.HELD,
            created_at=timestamps,
            updated_at=timestamps,
        )
        db.add(db_sale)
        db.flush()

        for item_data in hold_data.items:
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

        db.commit()

        log_transaction_event(
            "SALE_HELD",
            {
                "user_id": str(operator_id),
                "session_id": str(hold_data.cash_session_id),
                "transaction_id": str(db_sale.id),
                "items_count": len(hold_data.items),
                "total": float(hold_data.total_amount),
            },
            request_id=request_id,
        )

        log_audit(
            action_type=AuditActionType.SYSTEM_CONFIG_CHANGED,
            actor=operator_user,
            target_id=db_sale.id,
            target_type="sale",
            details={
                "operation": "sale_held",
                "sale_id": str(db_sale.id),
                "cash_session_id": str(hold_data.cash_session_id),
                "request_id": request_id,
            },
            description="Ticket mis en attente (parcours caisse)",
            db=db,
        )

        db_sale = (
            db.query(Sale)
            .options(selectinload(Sale.payments), selectinload(Sale.items))
            .filter(Sale.id == db_sale.id)
            .first()
        )
        return db_sale

    def list_held_sales_for_session(
        self,
        cash_session_id: str,
        operator_id: str,
        limit: int = 50,
    ) -> List[Sale]:
        """Story 6.3 — tickets en attente pour une session (même garde que création vente)."""
        try:
            sid = UUID(cash_session_id)
        except ValueError:
            raise ValidationError("Invalid cash session ID format") from None

        self._load_cash_session_operator_user(sid, operator_id)

        lim = max(1, min(limit, 100))
        return (
            self.db.query(Sale)
            .options(selectinload(Sale.items), selectinload(Sale.payments))
            .filter(
                Sale.cash_session_id == sid,
                Sale.lifecycle_status == SaleLifecycleStatus.HELD,
            )
            .order_by(Sale.updated_at.desc())
            .limit(lim)
            .all()
        )

    def _resolve_payments_for_finalize(
        self, total_amount: float, payload: SaleFinalizeHeld
    ) -> List[PaymentCreate]:
        if payload.payments:
            total_payments = sum(p.amount for p in payload.payments)
            if total_payments < total_amount:
                raise ValidationError(
                    f"La somme des paiements ({total_payments}) doit être supérieure ou égale "
                    f"au total ({total_amount})"
                )
            return list(payload.payments)
        if payload.payment_method:
            return [
                PaymentCreate(
                    payment_method=payload.payment_method,
                    amount=total_amount,
                )
            ]
        return [
            PaymentCreate(
                payment_method=PaymentMethod.CASH,
                amount=total_amount,
            )
        ]

    def finalize_held_sale(
        self,
        sale_id: str,
        payload: SaleFinalizeHeld,
        operator_id: str,
        request_id: Optional[str] = None,
    ) -> Sale:
        """Story 6.3 — finalise un ticket en attente : paiements, agrégats session, logs caisse."""
        db = self.db
        try:
            sale_uuid = UUID(sale_id)
        except ValueError:
            raise ValidationError("Invalid sale ID format") from None

        sale = (
            db.query(Sale)
            .options(selectinload(Sale.items), selectinload(Sale.payments), selectinload(Sale.cash_session))
            .filter(Sale.id == sale_uuid)
            .first()
        )
        if not sale:
            raise NotFoundError("Sale not found")
        if sale.lifecycle_status != SaleLifecycleStatus.HELD:
            raise ConflictError("La vente n'est pas un ticket en attente finalisable.")

        cash_session, _, _ = self._load_cash_session_operator_user(sale.cash_session_id, operator_id)

        subtotal = sum(item.total_price for item in sale.items if item.total_price > 0)
        if subtotal > 0 and sale.total_amount < subtotal:
            raise ValidationError(
                f"Le total ({sale.total_amount}) ne peut pas être inférieur au sous-total ({subtotal})"
            )

        if payload.donation is not None:
            sale.donation = payload.donation
        if payload.note is not None:
            sale.note = payload.note
        if payload.payment_method is not None:
            sale.payment_method = payload.payment_method

        payments_to_create = self._resolve_payments_for_finalize(float(sale.total_amount), payload)

        for payment_data in payments_to_create:
            db_payment = PaymentTransaction(
                sale_id=sale.id,
                payment_method=payment_data.payment_method,
                amount=payment_data.amount,
            )
            db.add(db_payment)

        sale.lifecycle_status = SaleLifecycleStatus.COMPLETED
        db.flush()

        session_sales = db.query(
            func.coalesce(func.sum(Sale.total_amount), 0).label("total_sales"),
            func.count(Sale.id).label("total_items"),
        ).filter(
            Sale.cash_session_id == sale.cash_session_id,
            Sale.lifecycle_status == SaleLifecycleStatus.COMPLETED,
        ).first()

        cash_session.total_sales = float(session_sales.total_sales)
        cash_session.total_items = session_sales.total_items
        cash_session.current_amount = cash_session.initial_amount + cash_session.total_sales

        db.commit()

        cart_state_before = {
            "items_count": len(sale.items),
            "items": [
                {
                    "id": f"item-{idx}",
                    "category": item.category,
                    "weight": item.weight,
                    "price": item.total_price,
                }
                for idx, item in enumerate(sale.items)
            ],
            "total": float(sale.total_amount),
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
                "session_id": str(sale.cash_session_id),
                "transaction_id": str(sale.id),
                "cart_state_before": cart_state_before,
                "cart_state_after": cart_state_after,
                "payment_method": payment_methods_log[0] if len(payment_methods_log) == 1 else None,
                "payment_methods": payment_methods_log,
                "payment_amounts": payment_amounts_log,
                "amount": float(sale.total_amount),
                "from_held": True,
            },
            request_id=request_id,
        )

        op = db.query(User).filter(User.id == UUID(str(operator_id))).first()
        op_name = username_for_audit(op.username) if op else "unknown"
        log_cash_sale(
            user_id=str(operator_id),
            username=op_name,
            sale_id=str(sale.id),
            amount=float(sale.total_amount),
            success=True,
            db=db,
            request_id=request_id,
            site_id=str(cash_session.site_id) if cash_session.site_id else None,
            cash_register_id=str(cash_session.register_id) if cash_session.register_id else None,
            session_id=str(cash_session.id),
        )

        db.refresh(sale)
        sale = (
            db.query(Sale)
            .options(selectinload(Sale.payments), selectinload(Sale.items))
            .filter(Sale.id == sale.id)
            .first()
        )
        return sale

    def abandon_held_sale(
        self,
        sale_id: str,
        operator_id: str,
        request_id: Optional[str] = None,
    ) -> Sale:
        """Story 6.3 — abandon explicite d'un ticket en attente (pas d'impact agrégats)."""
        db = self.db
        try:
            sale_uuid = UUID(sale_id)
        except ValueError:
            raise ValidationError("Invalid sale ID format") from None

        sale = db.query(Sale).filter(Sale.id == sale_uuid).first()
        if not sale:
            raise NotFoundError("Sale not found")
        if sale.lifecycle_status != SaleLifecycleStatus.HELD:
            raise ConflictError("Seuls les tickets en attente peuvent être abandonnés via cet endpoint.")

        _, operator_user, _ = self._load_cash_session_operator_user(sale.cash_session_id, operator_id)

        sale.lifecycle_status = SaleLifecycleStatus.ABANDONED
        db.commit()

        log_transaction_event(
            "SALE_HOLD_ABANDONED",
            {
                "user_id": str(operator_id),
                "session_id": str(sale.cash_session_id),
                "transaction_id": str(sale.id),
            },
            request_id=request_id,
        )

        log_audit(
            action_type=AuditActionType.SYSTEM_CONFIG_CHANGED,
            actor=operator_user,
            target_id=sale.id,
            target_type="sale",
            details={
                "operation": "sale_hold_abandoned",
                "sale_id": str(sale.id),
                "cash_session_id": str(sale.cash_session_id),
                "request_id": request_id,
            },
            description="Ticket en attente abandonné",
            db=db,
        )

        db.refresh(sale)
        return sale

    def create_sale_reversal(
        self,
        payload: SaleReversalCreate,
        operator_id: str,
        request_id: Optional[str] = None,
    ) -> SaleReversal:
        """
        Story 6.4 — remboursement total lié à une vente ``completed``, même session ouverte.

        Hypothèses VS : montant = total vente source ; pas de remboursement partiel ;
        au plus un reversal par ``source_sale_id`` ; idempotence optionnelle par clé client.

        Raises:
            ValidationError: identifiants invalides.
            NotFoundError: vente source absente.
            AuthorizationError: ``caisse.refund`` ou garde-fous session / site / opérateur (6.2).
            ConflictError: vente non finalisée, session fermée / autre session, doublon.
        """
        db = self.db

        idem = (payload.idempotency_key or "").strip() or None
        if idem:
            existing = db.query(SaleReversal).filter(SaleReversal.idempotency_key == idem).first()
            if existing:
                if existing.source_sale_id != payload.source_sale_id:
                    raise ConflictError(
                        "Clé d'idempotence déjà utilisée pour une autre intention de remboursement."
                    )
                return existing

        try:
            source_uuid = UUID(str(payload.source_sale_id))
        except ValueError:
            raise ValidationError("Invalid sale ID format") from None

        sale = (
            db.query(Sale)
            .options(selectinload(Sale.cash_session))
            .filter(Sale.id == source_uuid)
            .first()
        )
        if not sale:
            raise NotFoundError("Sale not found")

        if sale.lifecycle_status != SaleLifecycleStatus.COMPLETED:
            raise ConflictError(
                "Remboursement refusé : seule une vente finalisée (completed) peut être remboursée — "
                "les tickets en attente ou abandonnés ne sont pas éligibles."
            )

        cash_session, operator_user, op_uuid = self._load_cash_session_operator_user(
            sale.cash_session_id, operator_id
        )

        if not user_has_permission(operator_user, CAISSE_REFUND_PERMISSION_KEY, db):
            raise AuthorizationError(f"Permission requise: {CAISSE_REFUND_PERMISSION_KEY}")

        dup = db.query(SaleReversal).filter(SaleReversal.source_sale_id == sale.id).first()
        if dup:
            raise ConflictError("Un remboursement existe déjà pour cette vente source.")

        refund_amount = float(sale.total_amount)
        amount_signed = -refund_amount

        reversal = SaleReversal(
            source_sale_id=sale.id,
            cash_session_id=sale.cash_session_id,
            operator_id=op_uuid,
            amount_signed=amount_signed,
            reason_code=payload.reason_code.value,
            detail=payload.detail,
            idempotency_key=idem,
        )
        db.add(reversal)
        db.flush()

        cash_session.current_amount = float(cash_session.current_amount or 0) + amount_signed

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise ConflictError("Un remboursement existe déjà pour cette vente source.") from None

        log_transaction_event(
            "SALE_REVERSAL_RECORDED",
            {
                "user_id": str(operator_id),
                "session_id": str(sale.cash_session_id),
                "source_sale_id": str(sale.id),
                "reversal_id": str(reversal.id),
                "amount_signed": amount_signed,
                "reason_code": payload.reason_code.value,
            },
            request_id=request_id,
        )

        log_audit(
            action_type=AuditActionType.CASH_SALE_REVERSAL,
            actor=operator_user,
            target_id=reversal.id,
            target_type="sale_reversal",
            details={
                "source_sale_id": str(sale.id),
                "cash_session_id": str(sale.cash_session_id),
                "amount_signed": amount_signed,
                "reason_code": payload.reason_code.value,
                "request_id": request_id,
            },
            description="Remboursement / reversal caisse (Story 6.4)",
            db=db,
        )

        db.refresh(reversal)
        return reversal

    def get_sale_reversal_readable(self, reversal_id: str, user_id: str) -> SaleReversal:
        """Story 6.4 — lecture reversal si l'utilisateur peut lire la vente source (mêmes règles que GET sale)."""
        db = self.db
        try:
            rid = UUID(str(reversal_id))
        except ValueError:
            raise ValidationError("Invalid reversal ID format") from None

        rev = db.query(SaleReversal).filter(SaleReversal.id == rid).first()
        if not rev:
            raise NotFoundError("Reversal not found")

        self.get_sale_readable_by_user(str(rev.source_sale_id), user_id)
        return rev

    def _sale_correction_snapshot(self, sale: Sale) -> dict:
        pm = sale.payment_method
        pm_val = pm.value if pm is not None and hasattr(pm, "value") else pm
        return {
            "sale_date": sale.sale_date.isoformat() if sale.sale_date else None,
            "total_amount": float(sale.total_amount),
            "donation": float(sale.donation or 0),
            "payment_method": pm_val,
            "note": sale.note,
        }

    def apply_sensitive_sale_correction(
        self,
        sale_id: str,
        payload: Union[SaleCorrectionSaleDatePayload, SaleCorrectionFinalizeFieldsPayload],
        actor: User,
        request_id: Optional[str] = None,
    ) -> Sale:
        """
        Story 6.8 — correction post-hoc bornée (super-admin, session ouverte, audit complet).

        Raises:
            ValidationError: identifiants / règles de cohérence.
            NotFoundError: vente ou session absente.
            AuthorizationError: non super-admin (redondant si route filtrée).
            ConflictError: session clôturée, remboursement existant, ticket non éligible.
        """
        db = self.db
        if actor.role != UserRole.SUPER_ADMIN:
            raise AuthorizationError(
                "Seul un super-administrateur peut corriger une vente via cet endpoint (Story 6.8)."
            )

        try:
            sale_uuid = UUID(sale_id)
        except ValueError:
            raise ValidationError("Invalid sale ID format") from None

        sale = (
            db.query(Sale)
            .options(
                selectinload(Sale.payments),
                selectinload(Sale.items),
                selectinload(Sale.cash_session),
            )
            .filter(Sale.id == sale_uuid)
            .first()
        )
        if not sale:
            raise NotFoundError("Sale not found")
        if sale.lifecycle_status == SaleLifecycleStatus.ABANDONED:
            raise NotFoundError("Sale not found")
        if sale.lifecycle_status == SaleLifecycleStatus.HELD:
            raise ConflictError(
                "Correction refusée : ticket en attente — finaliser ou abandonner avant toute correction."
            )
        if sale.lifecycle_status != SaleLifecycleStatus.COMPLETED:
            raise ConflictError("Correction refusée : vente non finalisée.")

        if db.query(SaleReversal).filter(SaleReversal.source_sale_id == sale.id).first():
            raise ConflictError("Correction refusée : un remboursement existe pour cette vente.")

        cash_session = sale.cash_session
        if cash_session is None:
            cash_session = db.query(CashSession).filter(CashSession.id == sale.cash_session_id).first()
        if cash_session is None:
            raise NotFoundError("Sale not found")
        if cash_session.status != CashSessionStatus.OPEN:
            raise ConflictError("Correction refusée : la session de caisse est déjà clôturée.")

        before = self._sale_correction_snapshot(sale)
        fields_touched: List[str] = []

        if isinstance(payload, SaleCorrectionSaleDatePayload):
            new_dt = payload.sale_date
            if new_dt.tzinfo is None:
                new_dt = new_dt.replace(tzinfo=timezone.utc)
            opened = cash_session.opened_at
            if opened is not None and opened.tzinfo is None:
                opened = opened.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            if opened is not None and new_dt < opened - timedelta(days=1):
                raise ValidationError("Date de vente trop ancienne par rapport à l'ouverture de session.")
            if new_dt > now + timedelta(hours=1):
                raise ValidationError("Date de vente dans le futur non plausible.")
            sale.sale_date = new_dt
            fields_touched.append("sale_date")
        else:
            fin = payload
            prev_total = float(sale.total_amount)
            prev_donation = float(sale.donation or 0)
            new_total = prev_total if fin.total_amount is None else float(fin.total_amount)
            new_donation = prev_donation if fin.donation is None else float(fin.donation)
            if new_total < 0:
                raise ValidationError("Le total doit être supérieur ou égal à 0.")
            if new_donation < 0:
                raise ValidationError("Le don doit être supérieur ou égal à 0.")
            if new_donation > new_total + 1e-6:
                raise ValidationError("Incohérence : le don ne peut pas dépasser le total encaissé.")

            subtotal = sum(float(i.total_price or 0) for i in sale.items if (i.total_price or 0) > 0)
            if subtotal > 0 and new_total < subtotal - 1e-6:
                raise ValidationError(
                    f"Le total ({new_total}) ne peut pas être inférieur au sous-total des lignes ({subtotal})."
                )

            if fin.total_amount is not None:
                # Intégrité (P0 / CR) : ne jamais persister un nouveau total sans aligner exactement
                # une ligne PaymentTransaction sur ce montant. Sinon total encaissé et paiements divergent.
                # → refus 400 (ValidationError) si ce n'est pas le cas (0 ou >1 lignes).
                pays = list(sale.payments or [])
                if len(pays) != 1:
                    if len(pays) == 0:
                        raise ValidationError(
                            "Correction du total refusée : aucune ligne de paiement enregistrée — "
                            "impossible d'aligner le montant encaissé avec le total (Story 6.8)."
                        )
                    raise ValidationError(
                        "Correction du total interdite : vente avec plusieurs lignes de paiement (Story 6.8)."
                    )
                pays[0].amount = new_total
                sale.total_amount = new_total
                fields_touched.append("total_amount")

            if fin.donation is not None:
                sale.donation = new_donation
                fields_touched.append("donation")

            if fin.payment_method is not None:
                sale.payment_method = fin.payment_method
                fields_touched.append("payment_method")

            if fin.note is not None:
                sale.note = fin.note
                fields_touched.append("note")

        if "total_amount" in fields_touched:
            session_sales = db.query(
                func.coalesce(func.sum(Sale.total_amount), 0).label("total_sales"),
                func.count(Sale.id).label("total_items"),
            ).filter(
                Sale.cash_session_id == cash_session.id,
                Sale.lifecycle_status == SaleLifecycleStatus.COMPLETED,
            ).first()
            cash_session.total_sales = float(session_sales.total_sales)
            cash_session.total_items = int(session_sales.total_items or 0)
            cash_session.current_amount = float(cash_session.initial_amount or 0) + cash_session.total_sales

        db.commit()
        db.refresh(sale)
        sale = (
            db.query(Sale)
            .options(selectinload(Sale.payments), selectinload(Sale.items))
            .filter(Sale.id == sale_uuid)
            .first()
        )
        assert sale is not None
        after = self._sale_correction_snapshot(sale)

        log_audit(
            action_type=AuditActionType.CASH_SALE_CORRECTED,
            actor=actor,
            target_id=sale.id,
            target_type="sale",
            details={
                "operation": "cash_sale.correct",
                "sale_id": str(sale.id),
                "cash_session_id": str(sale.cash_session_id),
                "fields_touched": fields_touched,
                "before": before,
                "after": after,
                "reason": payload.reason,
                "request_id": request_id,
            },
            description="Correction sensible vente caisse (Story 6.8)",
            db=db,
        )

        return sale

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
