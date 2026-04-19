"""
Service de création de ventes (logique métier hors routeurs HTTP).

ARCH-04 : extraire la logique lourde de POST /sales depuis endpoints/sales.py.
ARCH-03 : erreurs métier via core.exceptions ; traduction HTTP au routeur ;
          mise à jour note admin (PUT /sales/{id}), item (PATCH …/items/{item_id}) et
          poids admin (PATCH …/items/{item_id}/weight) déléguées ici.
"""

from __future__ import annotations

import logging
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
from recyclic_api.models.payment_method import PaymentMethodDefinition, PaymentMethodKind
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.preset_button import PresetButton
from recyclic_api.models.sale import (
    PaymentMethod,
    Sale,
    SaleLifecycleStatus,
    SpecialEncaissementKind,
    _normalize_payment_method_token,
)
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
    SalePaymentMethodOption,
    PAHEKO_ACCOUNTING_SYNC_HINT_STANDARD_REFUND,
    SaleResponse,
    SaleReversalCreate,
    SaleReversalResponse,
)
from recyclic_api.services.accounting_period_authority_service import (
    AccountingPeriodAuthorityService,
    RefundFiscalBranch,
)
from recyclic_api.services.business_tag_resolution import (
    assert_explicit_matches_legacy,
    legacy_expected_tag_key,
    validate_tag_pair,
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

# Story 22.4 — comparaisons montants caisse (float ticket / paiements)
_ARBITRAGE_EPS = 1e-6


def _business_tag_db_pair(kind, custom: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """Persist ``business_tag_kind`` / ``business_tag_custom`` (colonnes VARCHAR)."""
    k = kind.value if kind is not None else None
    c = (custom or "").strip() or None
    return k, c


def _validate_sale_create_business_tags(sale_data: SaleCreate, soc_kind, s_kind) -> None:
    validate_tag_pair(sale_data.business_tag_kind, sale_data.business_tag_custom)
    legacy_k = legacy_expected_tag_key(s_kind, soc_kind)
    assert_explicit_matches_legacy(
        legacy_k,
        sale_data.business_tag_kind,
        sale_data.business_tag_custom,
    )
    for it in sale_data.items:
        validate_tag_pair(it.business_tag_kind, it.business_tag_custom)
        assert_explicit_matches_legacy(None, it.business_tag_kind, it.business_tag_custom)


def _validate_hold_business_tags(hold_data: SaleHoldCreate) -> None:
    validate_tag_pair(hold_data.business_tag_kind, hold_data.business_tag_custom)
    assert_explicit_matches_legacy(None, hold_data.business_tag_kind, hold_data.business_tag_custom)
    for it in hold_data.items:
        validate_tag_pair(it.business_tag_kind, it.business_tag_custom)
        assert_explicit_matches_legacy(None, it.business_tag_kind, it.business_tag_custom)

logger = logging.getLogger(__name__)

_SESSION_NOT_FOUND_ORACLE_MSG = "Session de caisse non trouvée"


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

    @staticmethod
    def _kind_to_legacy_payment_method_column(kind: PaymentMethodKind) -> PaymentMethod:
        """Colonne legacy ``sales.payment_method`` / ``payment_transactions.payment_method`` (agrégat UI)."""
        if kind == PaymentMethodKind.CASH:
            return PaymentMethod.CASH
        if kind == PaymentMethodKind.BANK:
            return PaymentMethod.CARD
        if kind == PaymentMethodKind.THIRD_PARTY:
            return PaymentMethod.CHECK
        return PaymentMethod.CHECK

    def parse_sale_payment_method_string(self, raw: str | None) -> tuple[PaymentMethod, PaymentMethodDefinition | None]:
        """Code expert (``payment_methods.code``) ou legacy cash|card|check|free → colonne agrégée + définition."""
        if raw is None or not str(raw).strip():
            pm = PaymentMethod.CASH
            return pm, self._resolve_payment_method_definition(pm)
        token = str(raw).strip().lower()
        if token == PaymentMethod.FREE.value:
            return PaymentMethod.FREE, None
        leg = _normalize_payment_method_token(token)
        if leg is not None:
            pm = PaymentMethod(leg)
            return pm, self._resolve_payment_method_definition(pm)
        ref = (
            self.db.query(PaymentMethodDefinition)
            .filter(
                PaymentMethodDefinition.code == token,
                PaymentMethodDefinition.archived_at.is_(None),
                PaymentMethodDefinition.active.is_(True),
            )
            .first()
        )
        if ref is None:
            logger.warning(
                "parse_sale_payment_method_string: code expert inconnu ou inactif (longueur=%s)",
                len(token),
            )
            raise ValidationError("Moyen de paiement inconnu ou inactif.")
        return self._kind_to_legacy_payment_method_column(ref.kind), ref

    @staticmethod
    def payment_method_token_is_free(raw: str | None) -> bool:
        if raw is None:
            return False
        return str(raw).strip().lower() == PaymentMethod.FREE.value

    def list_payment_method_options_for_caisse(self, operator_id: str) -> list[SalePaymentMethodOption]:
        """Référentiel expert actif — même permission qu'une vente caisse (hors session)."""
        db = self.db
        try:
            op_uuid = UUID(str(operator_id))
        except ValueError as e:
            raise ValidationError("Identifiant opérateur invalide") from e
        operator_user = db.query(User).filter(User.id == op_uuid).first()
        if not operator_user:
            raise AuthorizationError("Utilisateur authentifié introuvable — accès refusé.")
        privileged = operator_user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
        if not privileged and not user_has_any_cash_sale_access(operator_user, db):
            raise AuthorizationError(cash_sale_access_error_message())
        rows = (
            db.query(PaymentMethodDefinition)
            .filter(
                PaymentMethodDefinition.archived_at.is_(None),
                PaymentMethodDefinition.active.is_(True),
            )
            .order_by(PaymentMethodDefinition.display_order, PaymentMethodDefinition.code)
            .all()
        )
        return [SalePaymentMethodOption(code=r.code, label=r.label, kind=r.kind) for r in rows]

    @staticmethod
    def recompute_cash_session_completed_rollups(db: Session, cash_session: CashSession) -> None:
        """Recalcule ``total_sales`` (net hors ``sale.donation``), ``total_items`` et ``current_amount`` (fond + brut).

        Le champ ``total_amount`` sur le ticket est l'encaissement total ; ``donation`` en est une ventilation
        affichée à part — le net commercial est ``total_amount - coalesce(donation,0)``.
        """
        cid = cash_session.id
        row = (
            db.query(
                func.coalesce(func.sum(Sale.total_amount), 0.0),
                func.coalesce(func.sum(Sale.total_amount - func.coalesce(Sale.donation, 0)), 0.0),
                func.count(Sale.id),
            )
            .filter(
                Sale.cash_session_id == cid,
                Sale.lifecycle_status == SaleLifecycleStatus.COMPLETED,
            )
            .first()
        )
        gross_sales = float(row[0] or 0.0)
        net_sales = float(row[1] or 0.0)
        n_completed = int(row[2] or 0)
        cash_session.total_sales = net_sales
        cash_session.total_items = n_completed
        cash_session.current_amount = float(cash_session.initial_amount or 0.0) + gross_sales

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

    def build_sale_response(self, sale: Sale) -> SaleResponse:
        """Story 24.4 — ticket enrichi avec la prévisualisation autorité remboursement (cohérent POST reversals / 22.5)."""
        base = SaleResponse.model_validate(sale)
        try:
            authority = AccountingPeriodAuthorityService(self.db)
            auth_view = authority.resolve_refund_branch(sale_date=sale.sale_date, created_at=sale.created_at)
            return base.model_copy(
                update={
                    "fiscal_branch": auth_view.branch.value,
                    "sale_fiscal_year": auth_view.sale_fiscal_year,
                    "current_open_fiscal_year": auth_view.current_open_fiscal_year,
                }
            )
        except (ConflictError, ValidationError):
            return base

    def update_sale_item(
        self,
        sale_id: str,
        item_id: str,
        item_update: SaleItemUpdate,
        user: User,
    ) -> SaleItem:
        """
        Met à jour un item de vente (authentification / 401 déjà vérifiés par la route).

        Garde lecture alignée sur ``GET /v1/sales/{id}`` avant toute mutation (durcissement IDOR).

        Raises:
            ValidationError: UUID ou valeurs numériques invalides (→ 400).
            NotFoundError: vente ou item absent (→ 404).
            AuthorizationError: modification de prix réservée admin (→ 403).
        """
        db = self.db
        try:
            item_uuid = UUID(item_id)
        except ValueError:
            raise ValidationError("Invalid item ID format") from None

        sale = self.get_sale_readable_by_user(sale_id, str(user.id))

        if sale.lifecycle_status == SaleLifecycleStatus.HELD:
            raise ConflictError(
                "Ticket en attente : modification de ligne interdite — utiliser finalisation ou abandon côté caisse."
            )

        sale_uuid = sale.id
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
            raise NotFoundError(_SESSION_NOT_FOUND_ORACLE_MSG)

        try:
            op_uuid = UUID(str(operator_id))
        except ValueError as e:
            raise ValidationError("Identifiant opérateur invalide") from e

        operator_user = db.query(User).filter(User.id == op_uuid).first()
        if not operator_user:
            raise AuthorizationError("Utilisateur authentifié introuvable — vente refusée.")

        privileged = operator_user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)

        if not privileged:
            if cash_session.operator_id != op_uuid:
                raise NotFoundError(_SESSION_NOT_FOUND_ORACLE_MSG)
            if operator_user.site_id is None:
                raise NotFoundError(_SESSION_NOT_FOUND_ORACLE_MSG)
            if operator_user.site_id != cash_session.site_id:
                raise NotFoundError(_SESSION_NOT_FOUND_ORACLE_MSG)
            if not user_has_any_cash_sale_access(operator_user, db):
                raise NotFoundError(_SESSION_NOT_FOUND_ORACLE_MSG)

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
            NotFoundError: session absente ou hors périmètre pour l’opérateur standard (→ 404, oracle unifié).
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

        _validate_sale_create_business_tags(sale_data, soc_kind, s_kind)

        subtotal = sum(item.total_price for item in sale_data.items if item.total_price > 0)
        if subtotal > 0 and sale_data.total_amount < subtotal:
            raise ValidationError(
                f"Le total ({sale_data.total_amount}) ne peut pas être inférieur au sous-total ({subtotal})"
            )

        sale_payments, donation_surplus_to_create = self._resolve_payments(sale_data)

        sale_row_pm, _ = self.parse_sale_payment_method_string(sale_data.payment_method)
        if sale_payments:
            sale_row_pm, _ = self.parse_sale_payment_method_string(sale_payments[0].payment_method)

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

        bt_k, bt_c = _business_tag_db_pair(sale_data.business_tag_kind, sale_data.business_tag_custom)
        db_sale = Sale(
            cash_session_id=sale_data.cash_session_id,
            operator_id=op_for_sale,
            total_amount=sale_data.total_amount,
            donation=sale_data.donation,
            payment_method=sale_row_pm,
            note=sale_data.note,
            sale_date=sale_date,
            lifecycle_status=SaleLifecycleStatus.COMPLETED,
            created_at=timestamps,
            updated_at=timestamps,
            special_encaissement_kind=s_kind.value if s_kind else None,
            social_action_kind=soc_kind.value if soc_kind else None,
            adherent_reference=adherent_ref,
            business_tag_kind=bt_k,
            business_tag_custom=bt_c,
        )
        db.add(db_sale)
        db.flush()

        for item_data in sale_data.items:
            itk, itc = _business_tag_db_pair(item_data.business_tag_kind, item_data.business_tag_custom)
            db_item = SaleItem(
                sale_id=db_sale.id,
                category=item_data.category,
                quantity=item_data.quantity,
                weight=item_data.weight,
                unit_price=item_data.unit_price,
                total_price=item_data.total_price,
                preset_id=item_data.preset_id,
                notes=item_data.notes,
                business_tag_kind=itk,
                business_tag_custom=itc,
            )
            db.add(db_item)

        for payment_data in sale_payments:
            db_payment = self._build_payment_transaction(
                sale_id=db_sale.id,
                payment_data=payment_data,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
            )
            db.add(db_payment)

        for payment_data in donation_surplus_to_create:
            db_payment = self._build_payment_transaction(
                sale_id=db_sale.id,
                payment_data=payment_data,
                nature=PaymentTransactionNature.DONATION_SURPLUS,
                direction=PaymentTransactionDirection.INFLOW,
            )
            db.add(db_payment)

        # Une seule transaction : vente + lignes + paiements + agrégats session caisse.
        # Story 6.3 : les tickets « en attente » (held) ne comptent pas dans les agrégats tant qu'ils ne sont pas finalisés.
        SaleService.recompute_cash_session_completed_rollups(db, cash_session)

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

        payments_for_log = sale_payments + donation_surplus_to_create
        payment_methods_log = [p.payment_method for p in payments_for_log]
        payment_amounts_log = [float(p.amount) for p in payments_for_log]

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

        _validate_hold_business_tags(hold_data)

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

        htk, htc = _business_tag_db_pair(hold_data.business_tag_kind, hold_data.business_tag_custom)
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
            business_tag_kind=htk,
            business_tag_custom=htc,
        )
        db.add(db_sale)
        db.flush()

        for item_data in hold_data.items:
            itk, itc = _business_tag_db_pair(item_data.business_tag_kind, item_data.business_tag_custom)
            db_item = SaleItem(
                sale_id=db_sale.id,
                category=item_data.category,
                quantity=item_data.quantity,
                weight=item_data.weight,
                unit_price=item_data.unit_price,
                total_price=item_data.total_price,
                preset_id=item_data.preset_id,
                notes=item_data.notes,
                business_tag_kind=itk,
                business_tag_custom=itc,
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
    ) -> tuple[List[PaymentCreate], List[PaymentCreate]]:
        """Story 22.4 — retourne (lignes règlement, dons surplus explicites)."""
        sale_lines: List[PaymentCreate]
        donation_lines = list(payload.donation_surplus or [])

        if payload.payments:
            for p in payload.payments:
                if self.payment_method_token_is_free(p.payment_method):
                    raise ValidationError(
                        "Le moyen « free » est interdit dans la répartition explicite des paiements (payments)."
                    )
            sale_lines = list(payload.payments)
        elif total_amount <= _ARBITRAGE_EPS and self.payment_method_token_is_free(payload.payment_method):
            sale_lines = []
        elif payload.payment_method and not self.payment_method_token_is_free(payload.payment_method):
            if total_amount <= _ARBITRAGE_EPS:
                sale_lines = []
            else:
                sale_lines = [
                    PaymentCreate(
                        payment_method=payload.payment_method,
                        amount=total_amount,
                    )
                ]
        elif self.payment_method_token_is_free(payload.payment_method) and total_amount > _ARBITRAGE_EPS:
            raise ValidationError(
                "Le mode gratuité (free) est incompatible avec un total de ticket positif pour cette finalisation."
            )
        else:
            if total_amount <= _ARBITRAGE_EPS:
                sale_lines = []
            else:
                sale_lines = [
                    PaymentCreate(
                        payment_method=PaymentMethod.CASH.value,
                        amount=total_amount,
                    )
                ]

        sale_f = [p for p in sale_lines if float(p.amount) > _ARBITRAGE_EPS]
        don_f = [p for p in donation_lines if float(p.amount) > _ARBITRAGE_EPS]

        self._validate_payment_arbitrage_22_4(
            total_amount=total_amount,
            sale_lines=sale_f,
            donation_surplus_lines=don_f,
            payment_method_top=payload.payment_method,
            forbid_free_with_financial_lines=True,
        )
        return sale_f, don_f

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

        # Ticket tenu : `total_amount` = encaissement total, `donation` = ventilation (voir recompute rollups).
        # À la mise en attente seul le net marchand est souvent persisté ; le don saisi à la finalisation doit
        # augmenter `total_amount` (sinon l’arbitrage 22.4 compare les paiements à un total périmé).
        prev_total = float(sale.total_amount)
        prev_donation = float(sale.donation or 0.0)
        goods_net = prev_total - prev_donation

        if payload.donation is not None:
            new_donation = float(payload.donation)
            if new_donation < -_ARBITRAGE_EPS:
                raise ValidationError("Le don ne peut pas être négatif.")
            sale.donation = new_donation

        sale.total_amount = goods_net + float(sale.donation or 0.0)

        if subtotal > 0 and sale.total_amount < subtotal - _ARBITRAGE_EPS:
            raise ValidationError(
                f"Le total ({sale.total_amount}) ne peut pas être inférieur au sous-total ({subtotal})"
            )

        don_v = float(sale.donation or 0.0)
        if don_v > float(sale.total_amount) + _ARBITRAGE_EPS:
            raise ValidationError(
                f"La donation ({don_v}) ne peut pas dépasser le total du ticket ({sale.total_amount})."
            )

        if payload.note is not None:
            sale.note = payload.note

        if payload.business_tag_kind is not None or (payload.business_tag_custom or "").strip():
            validate_tag_pair(payload.business_tag_kind, payload.business_tag_custom)
            fk, fc = _business_tag_db_pair(payload.business_tag_kind, payload.business_tag_custom)
            sale.business_tag_kind = fk
            sale.business_tag_custom = fc

        sale_pays, donation_surplus_final = self._resolve_payments_for_finalize(float(sale.total_amount), payload)

        if sale_pays:
            leg_pm, _ = self.parse_sale_payment_method_string(sale_pays[0].payment_method)
            sale.payment_method = leg_pm
        elif payload.payment_method is not None:
            leg_pm, _ = self.parse_sale_payment_method_string(payload.payment_method)
            sale.payment_method = leg_pm

        for payment_data in sale_pays:
            db_payment = self._build_payment_transaction(
                sale_id=sale.id,
                payment_data=payment_data,
                nature=PaymentTransactionNature.SALE_PAYMENT,
                direction=PaymentTransactionDirection.INFLOW,
            )
            db.add(db_payment)

        for payment_data in donation_surplus_final:
            db_payment = self._build_payment_transaction(
                sale_id=sale.id,
                payment_data=payment_data,
                nature=PaymentTransactionNature.DONATION_SURPLUS,
                direction=PaymentTransactionDirection.INFLOW,
            )
            db.add(db_payment)

        sale.lifecycle_status = SaleLifecycleStatus.COMPLETED
        db.flush()

        SaleService.recompute_cash_session_completed_rollups(db, cash_session)

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

        payments_for_held_log = sale_pays + donation_surplus_final
        payment_methods_log = [p.payment_method for p in payments_for_held_log]
        payment_amounts_log = [float(p.amount) for p in payments_for_held_log]

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

    def build_sale_reversal_response(self, reversal: SaleReversal) -> SaleReversalResponse:
        """Story 24.3 — agrège journal REFUND_PAYMENT, vente source et autorité fiscale pour le contrat HTTP."""
        db = self.db
        sale = (
            db.query(Sale)
            .options(selectinload(Sale.payments))
            .filter(Sale.id == reversal.source_sale_id)
            .first()
        )
        if not sale:
            raise NotFoundError("Sale not found")

        pt = (
            db.query(PaymentTransaction)
            .filter(
                PaymentTransaction.sale_id == reversal.source_sale_id,
                PaymentTransaction.nature == PaymentTransactionNature.REFUND_PAYMENT,
            )
            .order_by(PaymentTransaction.created_at.desc())
            .first()
        )
        refund_pm = "cash"
        if pt is not None and pt.payment_method is not None:
            pm = pt.payment_method
            refund_pm = pm.value if hasattr(pm, "value") else str(pm)

        src_pm = sale.payment_method
        source_sale_pm = None
        if src_pm is not None:
            source_sale_pm = src_pm.value if hasattr(src_pm, "value") else str(src_pm)

        fiscal_branch = None
        sale_fy = None
        open_fy = None
        try:
            authority = AccountingPeriodAuthorityService(db)
            auth_view = authority.resolve_refund_branch(sale_date=sale.sale_date, created_at=sale.created_at)
            fiscal_branch = auth_view.branch.value
            sale_fy = auth_view.sale_fiscal_year
            open_fy = auth_view.current_open_fiscal_year
        except (ConflictError, ValidationError):
            pass

        return SaleReversalResponse(
            id=str(reversal.id),
            source_sale_id=str(reversal.source_sale_id),
            cash_session_id=str(reversal.cash_session_id),
            operator_id=str(reversal.operator_id),
            amount_signed=float(reversal.amount_signed),
            reason_code=str(reversal.reason_code),
            detail=reversal.detail,
            idempotency_key=reversal.idempotency_key,
            created_at=reversal.created_at,
            refund_payment_method=refund_pm,
            source_sale_payment_method=source_sale_pm,
            fiscal_branch=fiscal_branch,
            sale_fiscal_year=sale_fy,
            current_open_fiscal_year=open_fy,
            paheko_accounting_sync_hint=PAHEKO_ACCOUNTING_SYNC_HINT_STANDARD_REFUND,
        )

    def create_sale_reversal(
        self,
        payload: SaleReversalCreate,
        operator_id: str,
        request_id: Optional[str] = None,
    ) -> SaleReversalResponse:
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
                return self.build_sale_reversal_response(existing)

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

        authority = AccountingPeriodAuthorityService(db)
        auth_view = authority.resolve_refund_branch(sale_date=sale.sale_date, created_at=sale.created_at)

        if auth_view.branch == RefundFiscalBranch.PRIOR_CLOSED:
            if not payload.expert_prior_year_refund:
                raise ConflictError(
                    "[PRIOR_YEAR_REFUND_REQUIRES_EXPERT_PATH] "
                    "Remboursement sur exercice antérieur clos : utilisez le parcours expert (permission "
                    "accounting.prior_year_refund, expert_prior_year_refund=true) — interdit d'élargir "
                    "implicitement le wizard terrain (Story 22.5)."
                )
            if not user_has_permission(operator_user, "accounting.prior_year_refund", db):
                raise AuthorizationError("Permission requise: accounting.prior_year_refund")

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

        orig_pm_pk = self._original_payment_method_pk_for_refund_source(sale)
        pm_eff = self._resolve_payment_method_definition(payload.refund_payment_method)
        prior_flag = auth_view.branch == RefundFiscalBranch.PRIOR_CLOSED
        refund_journal = PaymentTransaction(
            sale_id=sale.id,
            payment_method=payload.refund_payment_method,
            payment_method_id=pm_eff.id if pm_eff else None,
            nature=PaymentTransactionNature.REFUND_PAYMENT,
            direction=PaymentTransactionDirection.OUTFLOW,
            amount=refund_amount,
            original_sale_id=sale.id,
            original_payment_method_id=orig_pm_pk,
            is_prior_year_special_case=prior_flag,
            notes="Story 22.5 — reversal caisse (journal canonique)",
        )
        db.add(refund_journal)

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
                "fiscal_branch": auth_view.branch.value,
                "sale_fiscal_year": auth_view.sale_fiscal_year,
                "is_prior_year_special_case": prior_flag,
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
                "fiscal_branch": auth_view.branch.value,
                "authority_source": auth_view.source,
                "authority_snapshot_version": auth_view.snapshot_version,
                "refund_payment_method": payload.refund_payment_method.value,
                "is_prior_year_special_case": prior_flag,
            },
            description="Remboursement / reversal caisse (Story 6.4 + journal 22.5)",
            db=db,
        )

        db.refresh(reversal)
        return self.build_sale_reversal_response(reversal)

    def get_sale_reversal_readable(self, reversal_id: str, user_id: str) -> SaleReversalResponse:
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
        return self.build_sale_reversal_response(rev)

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
                pays_pm = list(sale.payments or [])
                leg_pm, pm_ref = self.parse_sale_payment_method_string(fin.payment_method)
                if len(pays_pm) == 1:
                    pays_pm[0].payment_method = leg_pm
                    pays_pm[0].payment_method_id = pm_ref.id if pm_ref else None
                elif len(pays_pm) > 1:
                    raise ValidationError(
                        "Correction du moyen de paiement interdite : vente avec plusieurs lignes de paiement (Story 6.8)."
                    )
                sale.payment_method = leg_pm
                fields_touched.append("payment_method")

            if fin.note is not None:
                sale.note = fin.note
                fields_touched.append("note")

        if "total_amount" in fields_touched or "donation" in fields_touched:
            SaleService.recompute_cash_session_completed_rollups(db, cash_session)

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

    def _resolve_payment_method_definition(
        self,
        payment_method: PaymentMethod | None,
    ) -> PaymentMethodDefinition | None:
        if payment_method in (None, PaymentMethod.FREE):
            return None
        return (
            self.db.query(PaymentMethodDefinition)
            .filter(
                PaymentMethodDefinition.code == payment_method.value,
                PaymentMethodDefinition.archived_at.is_(None),
            )
            .first()
        )

    def _original_payment_method_pk_for_refund_source(self, sale: Sale) -> UUID | None:
        """Journal canonique : préfère les lignes ``SALE_PAYMENT`` ; repli référentiel depuis legacy brownfield."""
        q = (
            self.db.query(PaymentTransaction)
            .filter(
                PaymentTransaction.sale_id == sale.id,
                PaymentTransaction.nature == PaymentTransactionNature.SALE_PAYMENT,
            )
            .order_by(PaymentTransaction.created_at.asc())
        )
        for pt in q.all():
            if pt.payment_method_id is not None:
                return pt.payment_method_id
        pm_ref = self._resolve_payment_method_definition(sale.payment_method)
        return pm_ref.id if pm_ref else None

    def _validate_payment_arbitrage_22_4(
        self,
        *,
        total_amount: float,
        sale_lines: List[PaymentCreate],
        donation_surplus_lines: List[PaymentCreate],
        payment_method_top: str | None,
        forbid_free_with_financial_lines: bool,
    ) -> None:
        """
        Story 22.4 — couverture ticket, interdiction sur-règlement implicite, gratuité sans lignes financières.

        - Règlement (``sale_lines``) ne doit pas dépasser le total : excédent = don en surplus explicite.
        - Couverture : somme(règlements) + somme(don surplus) >= total (don explicite comble un éventuel manque).
        """
        sum_sale = sum(float(p.amount) for p in sale_lines)
        sum_don = sum(float(p.amount) for p in donation_surplus_lines)
        total = float(total_amount)

        if forbid_free_with_financial_lines and self.payment_method_token_is_free(payment_method_top):
            if sale_lines or donation_surplus_lines:
                raise ValidationError(
                    "Une vente en gratuité (payment_method=free) ne peut pas comporter de lignes "
                    "de paiement ni de don en surplus — retirez les encaissements ou changez le total."
                )
            if total > _ARBITRAGE_EPS:
                raise ValidationError(
                    "Le mode gratuité (free) est réservé à un total de vente nul — corrigez le total ou le moyen."
                )

        if total <= _ARBITRAGE_EPS:
            if sum_sale > _ARBITRAGE_EPS or sum_don > _ARBITRAGE_EPS:
                raise ValidationError(
                    "Pour un total de vente nul, aucune ligne financière (paiement ou don en surplus) n'est acceptée."
                )
            return

        if sum_sale > total + _ARBITRAGE_EPS:
            raise ValidationError(
                "Montant encaissé sur le règlement supérieur au total du ticket — "
                "réduisez les lignes de paiement ou déclarez explicitement le surplus en don."
            )

        if sum_sale + sum_don < total - _ARBITRAGE_EPS:
            raise ValidationError(
                "Encaissement insuffisant : la somme des paiements et des dons en surplus doit couvrir le total du ticket."
            )

    def _build_payment_transaction(
        self,
        *,
        sale_id: UUID,
        payment_data: PaymentCreate,
        nature: PaymentTransactionNature,
        direction: PaymentTransactionDirection,
    ) -> PaymentTransaction:
        if self.payment_method_token_is_free(payment_data.payment_method):
            raise ValidationError(
                "Le moyen de paiement 'free' n'est pas autorise dans payments[]. "
                "Utilisez payment_method=free sur la vente gratuite sans ligne financiere."
            )
        legacy_pm, payment_method_ref = self.parse_sale_payment_method_string(payment_data.payment_method)
        return PaymentTransaction(
            sale_id=sale_id,
            payment_method=legacy_pm,
            payment_method_id=payment_method_ref.id if payment_method_ref else None,
            nature=nature,
            direction=direction,
            amount=payment_data.amount,
        )

    def _resolve_payments(self, sale_data: SaleCreate) -> tuple[List[PaymentCreate], List[PaymentCreate]]:
        """Story 22.4 — vente directe : règlements + dons surplus explicites (journal distinct)."""
        donation_lines = list(sale_data.donation_surplus or [])

        if sale_data.payments:
            for p in sale_data.payments:
                if self.payment_method_token_is_free(p.payment_method):
                    raise ValidationError(
                        "Le moyen « free » est interdit dans la répartition explicite des paiements (payments)."
                    )
            sale_lines = list(sale_data.payments)
        elif sale_data.total_amount <= _ARBITRAGE_EPS and self.payment_method_token_is_free(sale_data.payment_method):
            sale_lines = []
        elif self.payment_method_token_is_free(sale_data.payment_method) and sale_data.total_amount > _ARBITRAGE_EPS:
            raise ValidationError(
                "Le mode gratuité (free) est incompatible avec un total de vente positif — utilisez des paiements explicites."
            )
        elif sale_data.payment_method:
            if sale_data.total_amount <= _ARBITRAGE_EPS:
                sale_lines = []
            else:
                sale_lines = [
                    PaymentCreate(
                        payment_method=sale_data.payment_method,
                        amount=sale_data.total_amount,
                    )
                ]
        else:
            if sale_data.total_amount <= _ARBITRAGE_EPS:
                sale_lines = []
            else:
                sale_lines = [
                    PaymentCreate(
                        payment_method=PaymentMethod.CASH.value,
                        amount=sale_data.total_amount,
                    )
                ]

        sale_f = [p for p in sale_lines if float(p.amount) > _ARBITRAGE_EPS]
        don_f = [p for p in donation_lines if float(p.amount) > _ARBITRAGE_EPS]

        self._validate_payment_arbitrage_22_4(
            total_amount=float(sale_data.total_amount),
            sale_lines=sale_f,
            donation_surplus_lines=don_f,
            payment_method_top=sale_data.payment_method,
            forbid_free_with_financial_lines=True,
        )
        return sale_f, don_f
