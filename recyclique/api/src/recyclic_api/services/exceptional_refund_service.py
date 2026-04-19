"""Story 24.5 — remboursement exceptionnel sans ticket (service métier)."""

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
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.exceptional_refund import ExceptionalRefund
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.exceptional_refund import (
    ExceptionalRefundCreate,
    ExceptionalRefundResponse,
    PAHEKO_ACCOUNTING_SYNC_HINT_EXCEPTIONAL_REFUND,
)
from recyclic_api.services.operations_specials_p3 import (
    register_operations_specials_p3_enabled,
    validate_exceptional_refund_p3_rules,
)
from recyclic_api.services.sale_service import SaleService

logger = logging.getLogger(__name__)

EXCEPTIONAL_REFUND_PERMISSION_KEY = "refund.exceptional"
_EXCEPTIONAL_REFUND_NOTE = "Story 24.5 — remboursement exceptionnel sans ticket (vente technique)"
_EXCEPTIONAL_REFUND_JOURNAL_NOTE = "Story 24.5 — remboursement exceptionnel sans ticket (journal canonique)"


class ExceptionalRefundService:
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
            raise ConflictError("Impossible de rembourser sur une session fermée.")

        if operator.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
            if cash_session.operator_id != operator.id:
                raise NotFoundError("Session de caisse non trouvée")
            if operator.site_id is None:
                raise NotFoundError("Session de caisse non trouvée")
            if operator.site_id != cash_session.site_id:
                raise NotFoundError("Session de caisse non trouvée")

        return cash_session, operator, operator.id

    def create_exceptional_refund(
        self,
        *,
        cash_session_id: str,
        payload: ExceptionalRefundCreate,
        operator: User,
        idempotency_key: str,
        request_id: Optional[str] = None,
        approver_step_up_at: Optional[datetime] = None,
    ) -> ExceptionalRefundResponse:
        cash_session, operator_user, op_uuid = self._load_session_and_operator(
            cash_session_id, operator
        )

        if not user_has_permission(operator_user, EXCEPTIONAL_REFUND_PERMISSION_KEY, self.db):
            raise AuthorizationError(f"Permission requise: {EXCEPTIONAL_REFUND_PERMISSION_KEY}")

        register: Optional[CashRegister] = None
        if cash_session.register_id:
            register = self.db.query(CashRegister).filter(CashRegister.id == cash_session.register_id).first()
        p3 = register_operations_specials_p3_enabled(register)
        validate_exceptional_refund_p3_rules(
            p3_enabled=p3,
            amount=float(payload.amount),
            reason_code=payload.reason_code.value,
            approval_evidence_ref=payload.approval_evidence_ref,
        )

        current = float(cash_session.current_amount or 0.0)
        outflow = float(payload.amount)
        if outflow > current:
            raise ValidationError(
                "Montant de remboursement supérieur au solde disponible en caisse pour cette session."
            )

        now = datetime.now(timezone.utc)
        step_up_mark = approver_step_up_at if approver_step_up_at is not None else now
        sale = Sale(
            cash_session_id=cash_session.id,
            operator_id=op_uuid,
            total_amount=0.0,
            donation=0.0,
            payment_method=payload.refund_payment_method,
            note=_EXCEPTIONAL_REFUND_NOTE,
            sale_date=now,
            lifecycle_status=SaleLifecycleStatus.COMPLETED,
            created_at=now,
            updated_at=now,
        )
        self.db.add(sale)
        self.db.flush()

        sale_service = SaleService(self.db)
        pm_ref = sale_service._resolve_payment_method_definition(payload.refund_payment_method)
        refund_tx = PaymentTransaction(
            sale_id=sale.id,
            payment_method=payload.refund_payment_method,
            payment_method_id=pm_ref.id if pm_ref else None,
            nature=PaymentTransactionNature.REFUND_PAYMENT,
            direction=PaymentTransactionDirection.OUTFLOW,
            amount=float(payload.amount),
            notes=_EXCEPTIONAL_REFUND_JOURNAL_NOTE,
        )
        self.db.add(refund_tx)

        cash_session.current_amount = current - outflow

        refund = ExceptionalRefund(
            cash_session_id=cash_session.id,
            sale_id=sale.id,
            amount=float(payload.amount),
            refund_payment_method=payload.refund_payment_method.value
            if isinstance(payload.refund_payment_method, PaymentMethod)
            else str(payload.refund_payment_method),
            reason_code=payload.reason_code.value,
            justification=payload.justification,
            detail=payload.detail,
            approval_evidence_ref=payload.approval_evidence_ref,
            initiator_user_id=operator_user.id,
            approver_user_id=operator_user.id,
            approved_at=now,
            approver_step_up_at=step_up_mark,
            idempotency_key=idempotency_key,
            request_id=request_id,
        )
        self.db.add(refund)

        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            logger.warning(
                "exceptional_refund_integrity_error session_id=%s user_id=%s err=%s",
                cash_session_id,
                operator_user.id,
                type(exc).__name__,
            )
            raise ConflictError("Remboursement exceptionnel déjà enregistré pour cette clé.") from None

        log_audit(
            action_type=AuditActionType.CASH_EXCEPTIONAL_REFUND,
            actor=operator_user,
            target_id=refund.id,
            target_type="exceptional_refund",
            details={
                "cash_session_id": str(cash_session.id),
                "sale_id": str(sale.id),
                "amount": float(payload.amount),
                "refund_payment_method": payload.refund_payment_method.value,
                "reason_code": payload.reason_code.value,
                "justification": payload.justification,
                "detail": payload.detail,
                "approval_evidence_ref": payload.approval_evidence_ref,
                "operations_specials_p3": p3,
                "proof_level": "N3" if p3 else None,
                "idempotency_key": idempotency_key,
                "request_id": request_id,
                "initiator_user_id": str(operator_user.id),
                "approver_user_id": str(operator_user.id),
                "approver_step_up_at": step_up_mark.isoformat() if step_up_mark else None,
            },
            description="Remboursement exceptionnel sans ticket (Story 24.5)",
            db=self.db,
        )

        return ExceptionalRefundResponse(
            id=str(refund.id),
            cash_session_id=str(refund.cash_session_id),
            sale_id=str(refund.sale_id),
            amount=float(refund.amount),
            refund_payment_method=refund.refund_payment_method,
            reason_code=refund.reason_code,
            justification=refund.justification,
            detail=refund.detail,
            approval_evidence_ref=refund.approval_evidence_ref,
            approver_step_up_at=refund.approver_step_up_at,
            proof_level_applied="N3" if p3 else None,
            idempotency_key=refund.idempotency_key,
            request_id=refund.request_id,
            initiator_user_id=str(refund.initiator_user_id),
            approver_user_id=str(refund.approver_user_id),
            approved_at=refund.approved_at,
            created_at=refund.created_at,
            paheko_accounting_sync_hint=PAHEKO_ACCOUNTING_SYNC_HINT_EXCEPTIONAL_REFUND,
        )
