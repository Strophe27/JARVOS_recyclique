"""Story 24.7 — décaissement typé (permission cash.disbursement, journal DISBURSEMENT)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from recyclic_api.core.audit import log_audit
from recyclic_api.core.auth import user_has_permission
from recyclic_api.core.exceptions import AuthorizationError, ConflictError, NotFoundError, ValidationError
from recyclic_api.models.audit_log import AuditActionType
from recyclic_api.models.cash_disbursement import CashDisbursement
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.cash_disbursement import CashDisbursementCreate, CashDisbursementResponse
from recyclic_api.services.sale_service import SaleService

logger = logging.getLogger(__name__)

DISBURSEMENT_PERMISSION_KEY = "cash.disbursement"
_TECH_SALE_NOTE = "Story 24.7 — décaissement hors ticket (vente technique conteneur)"
_JOURNAL_NOTE = "Story 24.7 — décaissement hors ticket (journal canonique)"


class CashDisbursementService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _load_session_and_operator(
        self,
        cash_session_id: str,
        operator: User,
    ) -> tuple[CashSession, User, UUID]:
        try:
            sid = UUID(str(cash_session_id))
        except ValueError as exc:
            raise ValidationError("Identifiant session invalide") from exc

        cash_session = self.db.query(CashSession).filter(CashSession.id == sid).first()
        if not cash_session:
            raise NotFoundError("Session de caisse non trouvée")
        if cash_session.status != CashSessionStatus.OPEN:
            raise ConflictError("Impossible de décaisser sur une session fermée.")

        if operator.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
            if cash_session.operator_id != operator.id:
                raise NotFoundError("Session de caisse non trouvée")
            if operator.site_id is None:
                raise NotFoundError("Session de caisse non trouvée")
            if operator.site_id != cash_session.site_id:
                raise NotFoundError("Session de caisse non trouvée")

        return cash_session, operator, operator.id

    def create_disbursement(
        self,
        *,
        cash_session_id: str,
        payload: CashDisbursementCreate,
        operator: User,
        idempotency_key: str,
        request_id: Optional[str] = None,
    ) -> CashDisbursementResponse:
        cash_session, operator_user, op_uuid = self._load_session_and_operator(cash_session_id, operator)

        if not user_has_permission(operator_user, DISBURSEMENT_PERMISSION_KEY, self.db):
            raise AuthorizationError(f"Permission requise: {DISBURSEMENT_PERMISSION_KEY}")

        current = float(cash_session.current_amount or 0.0)
        outflow = float(payload.amount)
        if outflow > current:
            raise ValidationError(
                "Montant supérieur au solde disponible en caisse pour cette session."
            )

        now = datetime.now(timezone.utc)
        sale = Sale(
            cash_session_id=cash_session.id,
            operator_id=op_uuid,
            total_amount=0.0,
            donation=0.0,
            payment_method=payload.payment_method,
            note=_TECH_SALE_NOTE,
            sale_date=payload.actual_settlement_at,
            lifecycle_status=SaleLifecycleStatus.COMPLETED,
            created_at=now,
            updated_at=now,
        )
        self.db.add(sale)
        self.db.flush()

        sale_service = SaleService(self.db)
        pm_ref = sale_service._resolve_payment_method_definition(payload.payment_method)
        pay_meth = payload.payment_method
        pm_token = pay_meth.value if isinstance(pay_meth, PaymentMethod) else str(pay_meth)

        refund_tx = PaymentTransaction(
            sale_id=sale.id,
            payment_method=pay_meth,
            payment_method_id=pm_ref.id if pm_ref else None,
            nature=PaymentTransactionNature.DISBURSEMENT,
            direction=PaymentTransactionDirection.OUTFLOW,
            amount=float(payload.amount),
            notes=_JOURNAL_NOTE,
        )
        self.db.add(refund_tx)

        cash_session.current_amount = current - outflow

        disc = CashDisbursement(
            cash_session_id=cash_session.id,
            sale_id=sale.id,
            amount=float(payload.amount),
            subtype=payload.subtype.value,
            motif_code=payload.motif_code.value,
            counterparty_label=payload.counterparty_label.strip(),
            payment_method=pm_token,
            free_comment=(payload.free_comment or "").strip() or None,
            justification_reference=payload.justification_reference.strip(),
            actual_settlement_at=payload.actual_settlement_at,
            admin_coded_reason_key=(payload.admin_coded_reason_key or "").strip() or None,
            initiator_user_id=operator_user.id,
            approver_user_id=operator_user.id,
            approved_at=now,
            idempotency_key=idempotency_key,
            request_id=request_id,
        )
        self.db.add(disc)

        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            logger.warning(
                "cash_disbursement_integrity_error session_id=%s user_id=%s err=%s",
                cash_session_id,
                operator_user.id,
                type(exc).__name__,
            )
            raise ConflictError("Décaissement déjà enregistré pour cette clé d'idempotence.") from None

        log_audit(
            action_type=AuditActionType.CASH_DISBURSEMENT,
            actor=operator_user,
            target_id=disc.id,
            target_type="cash_disbursement",
            details={
                "cash_session_id": str(cash_session.id),
                "sale_id": str(sale.id),
                "amount": float(payload.amount),
                "subtype": payload.subtype.value,
                "motif_code": payload.motif_code.value,
                "justification_reference": payload.justification_reference,
                "idempotency_key": idempotency_key,
                "request_id": request_id,
            },
            description="Décaissement typé hors ticket (Story 24.7)",
            db=self.db,
        )

        return CashDisbursementResponse(
            id=str(disc.id),
            cash_session_id=str(disc.cash_session_id),
            sale_id=str(disc.sale_id),
            amount=float(disc.amount),
            subtype=disc.subtype,
            motif_code=disc.motif_code,
            counterparty_label=disc.counterparty_label,
            payment_method=disc.payment_method,
            free_comment=disc.free_comment,
            justification_reference=disc.justification_reference,
            actual_settlement_at=disc.actual_settlement_at,
            admin_coded_reason_key=disc.admin_coded_reason_key,
            initiator_user_id=str(disc.initiator_user_id),
            approver_user_id=str(disc.approver_user_id),
            approved_at=disc.approved_at,
            idempotency_key=disc.idempotency_key,
            request_id=disc.request_id,
            created_at=disc.created_at,
        )
