"""Story 24.6 — orchestration échange matière : vente et/ou reversal canoniques, conteneur audit."""

from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from recyclic_api.core.audit import log_audit
from recyclic_api.core.auth import user_has_permission
from recyclic_api.core.exceptions import AuthorizationError, ValidationError
from recyclic_api.models.audit_log import AuditActionType
from recyclic_api.models.material_exchange import MaterialExchange
from recyclic_api.models.sale import Sale
from recyclic_api.models.user import User
from recyclic_api.schemas.material_exchange import MaterialExchangeCreate, MaterialExchangeResponse
from recyclic_api.schemas.sale import PAHEKO_ACCOUNTING_SYNC_HINT_STANDARD_REFUND, SaleCreate
from recyclic_api.services.sale_service import SaleService, CAISSE_REFUND_PERMISSION_KEY

CAISSE_EXCHANGE_PERMISSION_KEY = "caisse.exchange"

PAHEKO_ACCOUNTING_SYNC_HINT_MATERIAL_EXCHANGE = (
    "L’échange est journalisé en caisse ; toute écriture Paheko associée suit la chaîne clôture → snapshot → "
    "outbox (Story 24.3 / 24.6), comme les autres flux caisse."
)


def _euros_to_cents(amount: float) -> int:
    return int(round(float(amount) * 100.0))


class MaterialExchangeService:
    def __init__(self, db: Session):
        self.db = db

    def _to_response(self, row: MaterialExchange, hint: Optional[str] = None) -> MaterialExchangeResponse:
        return MaterialExchangeResponse(
            id=str(row.id),
            cash_session_id=str(row.cash_session_id),
            delta_amount_cents=row.delta_amount_cents,
            material_trace=dict(row.material_trace) if isinstance(row.material_trace, dict) else {},
            complement_sale_id=str(row.complement_sale_id) if row.complement_sale_id else None,
            sale_reversal_id=str(row.sale_reversal_id) if row.sale_reversal_id else None,
            paheko_accounting_sync_hint=hint,
            created_at=row.created_at,
        )

    def create_material_exchange(
        self,
        *,
        cash_session_id: UUID,
        payload: MaterialExchangeCreate,
        operator_user: User,
        request_id: Optional[str] = None,
    ) -> MaterialExchangeResponse:
        sale_svc = SaleService(self.db)
        op_id = str(operator_user.id)
        op_uuid = UUID(str(operator_user.id))

        if not user_has_permission(operator_user, CAISSE_EXCHANGE_PERMISSION_KEY, self.db):
            raise AuthorizationError(f"Permission requise: {CAISSE_EXCHANGE_PERMISSION_KEY}")

        idem = (payload.idempotency_key or "").strip() or None
        if idem:
            existing = (
                self.db.query(MaterialExchange)
                .filter(
                    MaterialExchange.cash_session_id == cash_session_id,
                    MaterialExchange.idempotency_key == idem,
                )
                .first()
            )
            if existing:
                return self._resolve_idempotent_hint(existing)

        sale_svc._load_cash_session_operator_user(cash_session_id, op_id)

        complement_id: Optional[UUID] = None
        reversal_id: Optional[UUID] = None
        hint_out: Optional[str] = PAHEKO_ACCOUNTING_SYNC_HINT_MATERIAL_EXCHANGE

        if payload.delta_amount_cents == 0:
            trace = payload.material_trace if isinstance(payload.material_trace, dict) else {}
            row = MaterialExchange(
                cash_session_id=cash_session_id,
                operator_id=op_uuid,
                delta_amount_cents=0,
                material_trace=trace,
                idempotency_key=idem,
            )
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
            self._audit(operator_user, row, request_id=request_id)
            return self._to_response(row, hint_out)

        if payload.delta_amount_cents > 0:
            if payload.complement_sale is None:
                raise ValidationError("complement_sale requis pour un complément d'échange.")
            c = payload.complement_sale
            if _euros_to_cents(c.total_amount) != payload.delta_amount_cents:
                raise ValidationError(
                    "Le total_amount de complement_sale doit coïncider avec delta_amount_cents (cents entiers)."
                )
            sale_in = SaleCreate.model_validate({**c.model_dump(), "cash_session_id": cash_session_id})
            created = sale_svc.create_sale(sale_in, op_id, request_id=request_id)
            complement_id = UUID(str(created.id))
            trace = payload.material_trace if isinstance(payload.material_trace, dict) else {}
            row = MaterialExchange(
                cash_session_id=cash_session_id,
                operator_id=op_uuid,
                delta_amount_cents=payload.delta_amount_cents,
                material_trace=trace,
                complement_sale_id=complement_id,
                idempotency_key=idem,
            )
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
            self._audit(operator_user, row, request_id=request_id)
            return self._to_response(row, hint_out)

        if payload.reversal is None:
            raise ValidationError("reversal requis pour la sortie caisse d'un échange.")
        if not user_has_permission(operator_user, CAISSE_REFUND_PERMISSION_KEY, self.db):
            raise AuthorizationError(f"Permission requise pour le reversal: {CAISSE_REFUND_PERMISSION_KEY}")

        src = self.db.query(Sale).filter(Sale.id == payload.reversal.source_sale_id).first()
        if not src:
            raise ValidationError("Vente source introuvable pour l'échange.")
        expected = _euros_to_cents(src.total_amount)
        if expected != abs(payload.delta_amount_cents):
            raise ValidationError(
                "Échange avec remboursement : le reversal suit le remboursement total de la vente source ; "
                f"le delta (valeur absolue) doit être {expected} centimes (total source), pas "
                f"{abs(payload.delta_amount_cents)}."
            )

        rev_resp = sale_svc.create_sale_reversal(payload.reversal, op_id, request_id=request_id)
        reversal_uuid = UUID(str(rev_resp.id))
        hint_out = PAHEKO_ACCOUNTING_SYNC_HINT_STANDARD_REFUND
        trace = payload.material_trace if isinstance(payload.material_trace, dict) else {}
        row = MaterialExchange(
            cash_session_id=cash_session_id,
            operator_id=op_uuid,
            delta_amount_cents=payload.delta_amount_cents,
            material_trace=trace,
            sale_reversal_id=reversal_uuid,
            idempotency_key=idem,
        )
        self.db.add(row)
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(row)
        self._audit(operator_user, row, request_id=request_id)
        return self._to_response(row, hint_out)

    def _resolve_idempotent_hint(self, row: MaterialExchange) -> MaterialExchangeResponse:
        if row.delta_amount_cents < 0 and row.sale_reversal_id:
            return self._to_response(row, PAHEKO_ACCOUNTING_SYNC_HINT_STANDARD_REFUND)
        return self._to_response(row, PAHEKO_ACCOUNTING_SYNC_HINT_MATERIAL_EXCHANGE)

    def _audit(self, operator_user: User, row: MaterialExchange, request_id: Optional[str]) -> None:
        details: dict[str, Any] = {
            "cash_session_id": str(row.cash_session_id),
            "delta_amount_cents": row.delta_amount_cents,
            "material_trace": row.material_trace,
            "request_id": request_id,
        }
        if row.complement_sale_id:
            details["complement_sale_id"] = str(row.complement_sale_id)
        if row.sale_reversal_id:
            details["sale_reversal_id"] = str(row.sale_reversal_id)
        log_audit(
            action_type=AuditActionType.CASH_MATERIAL_EXCHANGE,
            actor=operator_user,
            target_id=row.id,
            target_type="material_exchange",
            details=details,
            description="Échange matière — conteneur Story 24.6",
            db=self.db,
        )
