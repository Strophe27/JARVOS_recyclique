from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from recyclic_api.models.sale import PaymentMethod
from recyclic_api.models.sale_reversal import RefundReasonCode


PAHEKO_ACCOUNTING_SYNC_HINT_EXCEPTIONAL_REFUND = (
    "Le remboursement exceptionnel est enregistré en caisse ; l’écriture comptable Paheko correspondante "
    "est intégrée au snapshot de clôture de session, puis exportée via l’outbox — pas d’écriture Paheko "
    "immédiate au moment de l’enregistrement terrain."
)


class ExceptionalRefundCreate(BaseModel):
    """Story 24.5 — remboursement exceptionnel sans ticket (flux expert séparé)."""

    amount: float = Field(gt=0, description="Montant remboursé (positif, en euros).")
    refund_payment_method: PaymentMethod = Field(
        default=PaymentMethod.CASH,
        description="Moyen effectif utilisé pour rembourser le client.",
    )
    reason_code: RefundReasonCode
    justification: str = Field(min_length=1, max_length=2000)
    detail: Optional[str] = Field(default=None, max_length=500)

    @field_validator("refund_payment_method")
    @classmethod
    def _reject_free_channel(cls, v: PaymentMethod) -> PaymentMethod:
        if v == PaymentMethod.FREE:
            raise ValueError(
                "Le moyen « free » ne peut pas servir de canal de remboursement réel."
            )
        return v

    @model_validator(mode="after")
    def _validate_reason_and_justification(self) -> "ExceptionalRefundCreate":
        justification = (self.justification or "").strip()
        if not justification:
            raise ValueError("La justification est obligatoire pour un remboursement exceptionnel.")
        if len(justification) > 2000:
            raise ValueError("La justification ne peut pas dépasser 2000 caractères.")
        self.justification = justification

        detail = (self.detail or "").strip() or None
        if self.reason_code == RefundReasonCode.AUTRE:
            if not detail:
                raise ValueError("Le détail est obligatoire lorsque le motif est AUTRE.")
            if len(detail) > 500:
                raise ValueError("Le détail ne peut pas dépasser 500 caractères.")
        elif detail is not None and len(detail) > 500:
            raise ValueError("Le détail ne peut pas dépasser 500 caractères.")
        self.detail = detail
        return self


class ExceptionalRefundResponse(BaseModel):
    id: str
    cash_session_id: str
    sale_id: str
    amount: float
    refund_payment_method: str
    reason_code: str
    justification: str
    detail: Optional[str] = None
    idempotency_key: str
    request_id: Optional[str] = None
    initiator_user_id: str
    approver_user_id: str
    approved_at: datetime
    created_at: datetime
    paheko_accounting_sync_hint: str = Field(
        default=PAHEKO_ACCOUNTING_SYNC_HINT_EXCEPTIONAL_REFUND,
        description="Rappel chaîne canonique Paheko (pas de second rail).",
    )

    model_config = ConfigDict(from_attributes=False)

    @field_validator(
        "id",
        "cash_session_id",
        "sale_id",
        "initiator_user_id",
        "approver_user_id",
        mode="before",
    )
    @classmethod
    def _uuid_to_str(cls, v: UUID | str | None):
        return str(v) if v is not None else v
