"""Story 24.8 — mouvement interne typé (permission cash.transfer, nature cash_internal_transfer)."""

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
from recyclic_api.models.cash_internal_transfer import (
    CashInternalTransfer,
    CashInternalTransferType as CITT,
    CashSessionInternalFlow,
)
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_transaction import (
    PaymentTransaction,
    PaymentTransactionDirection,
    PaymentTransactionNature,
)
from recyclic_api.models.sale import PaymentMethod, Sale, SaleLifecycleStatus
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.cash_internal_transfer import CashInternalTransferCreate, CashInternalTransferResponse
from recyclic_api.services.sale_service import SaleService

logger = logging.getLogger(__name__)

INTERNAL_TRANSFER_PERMISSION_KEY = "cash.transfer"
_TECH_SALE_NOTE = "Story 24.8 — mouvement interne caisse (vente technique conteneur)"
_JOURNAL_NOTE = "Story 24.8 — mouvement interne caisse (journal canonique, distinct décaissement / remboursement)"

# Preuve N3 : types sensibles ou montant élevé (step-up PIN).
_INTERNAL_TRANSFER_N3_AMOUNT_EUR = 500.0


def internal_transfer_requires_step_up(payload: CashInternalTransferCreate) -> bool:
    if payload.transfer_type in (CITT.INTER_REGISTER_TRANSFER, CITT.VARIANCE_REGULARIZATION):
        return True
    return float(payload.amount) >= _INTERNAL_TRANSFER_N3_AMOUNT_EUR


class CashInternalTransferService:
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
            raise ConflictError("Impossible d'enregistrer un mouvement interne sur une session fermée.")

        if operator.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
            if cash_session.operator_id != operator.id:
                raise NotFoundError("Session de caisse non trouvée")
            if operator.site_id is None:
                raise NotFoundError("Session de caisse non trouvée")
            if operator.site_id != cash_session.site_id:
                raise NotFoundError("Session de caisse non trouvée")

        return cash_session, operator, operator.id

    def create_internal_transfer(
        self,
        *,
        cash_session_id: str,
        payload: CashInternalTransferCreate,
        operator: User,
        idempotency_key: str,
        request_id: Optional[str] = None,
    ) -> CashInternalTransferResponse:
        cash_session, operator_user, op_uuid = self._load_session_and_operator(cash_session_id, operator)

        if not user_has_permission(operator_user, INTERNAL_TRANSFER_PERMISSION_KEY, self.db):
            raise AuthorizationError(f"Permission requise: {INTERNAL_TRANSFER_PERMISSION_KEY}")

        current = float(cash_session.current_amount or 0.0)
        amt = float(payload.amount)
        outflow = payload.session_flow == CashSessionInternalFlow.OUTFLOW
        if outflow and amt > current:
            raise ValidationError(
                "Montant supérieur au solde disponible en caisse pour cette session (sortie)."
            )

        now = datetime.now(timezone.utc)
        sale = Sale(
            cash_session_id=cash_session.id,
            operator_id=op_uuid,
            total_amount=0.0,
            donation=0.0,
            payment_method=payload.payment_method,
            note=_TECH_SALE_NOTE,
            sale_date=now,
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

        direction = (
            PaymentTransactionDirection.OUTFLOW if outflow else PaymentTransactionDirection.INFLOW
        )
        pt = PaymentTransaction(
            sale_id=sale.id,
            payment_method=pay_meth,
            payment_method_id=pm_ref.id if pm_ref else None,
            nature=PaymentTransactionNature.CASH_INTERNAL_TRANSFER,
            direction=direction,
            amount=float(payload.amount),
            notes=_JOURNAL_NOTE,
        )
        self.db.add(pt)

        if outflow:
            cash_session.current_amount = current - amt
        else:
            cash_session.current_amount = current + amt

        row = CashInternalTransfer(
            cash_session_id=cash_session.id,
            sale_id=sale.id,
            amount=amt,
            transfer_type=payload.transfer_type.value,
            session_flow=payload.session_flow.value,
            origin_endpoint_label=payload.origin_endpoint_label.strip(),
            destination_endpoint_label=payload.destination_endpoint_label.strip(),
            motif=payload.motif.strip(),
            payment_method=pm_token,
            justification_reference=payload.justification_reference.strip(),
            initiator_user_id=operator_user.id,
            approver_user_id=operator_user.id,
            approved_at=now,
            idempotency_key=idempotency_key,
            request_id=request_id,
        )
        self.db.add(row)

        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            logger.warning(
                "cash_internal_transfer_integrity session_id=%s user_id=%s",
                cash_session_id,
                operator_user.id,
            )
            raise ConflictError("Mouvement interne déjà enregistré pour cette clé d'idempotence.") from None

        log_audit(
            action_type=AuditActionType.CASH_INTERNAL_TRANSFER,
            actor=operator_user,
            target_id=row.id,
            target_type="cash_internal_transfer",
            details={
                "cash_session_id": str(cash_session.id),
                "sale_id": str(sale.id),
                "amount": amt,
                "transfer_type": payload.transfer_type.value,
                "session_flow": payload.session_flow.value,
                "justification_reference": payload.justification_reference,
                "idempotency_key": idempotency_key,
                "request_id": request_id,
            },
            description="Mouvement interne de caisse (Story 24.8)",
            db=self.db,
        )

        return CashInternalTransferResponse(
            id=str(row.id),
            cash_session_id=str(row.cash_session_id),
            sale_id=str(row.sale_id),
            transfer_type=row.transfer_type,
            session_flow=row.session_flow,
            amount=float(row.amount),
            origin_endpoint_label=row.origin_endpoint_label,
            destination_endpoint_label=row.destination_endpoint_label,
            motif=row.motif,
            payment_method=row.payment_method,
            justification_reference=row.justification_reference,
            initiator_user_id=str(row.initiator_user_id),
            approver_user_id=str(row.approver_user_id),
            approved_at=row.approved_at,
            idempotency_key=row.idempotency_key,
            request_id=row.request_id,
            created_at=row.created_at,
        )
