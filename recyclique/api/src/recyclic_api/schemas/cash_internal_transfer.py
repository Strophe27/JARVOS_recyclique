"""Story 24.8 — schémas API mouvement interne caisse."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from recyclic_api.models.cash_internal_transfer import CashInternalTransferType, CashSessionInternalFlow
from recyclic_api.models.sale import PaymentMethod

PAHEKO_ACCOUNTING_SYNC_HINT_INTERNAL_TRANSFER = (
    "Mouvement interne enregistré en caisse ; export Paheko via snapshot de clôture et outbox (ADR D1) — "
    "pas de second rail ; libellés distincts remboursement client et décaissement charge."
)


class CashInternalTransferCreate(BaseModel):
    """Mouvement interne typé — référentiel fermé serveur (PRD §10.6)."""

    transfer_type: CashInternalTransferType
    session_flow: CashSessionInternalFlow
    origin_endpoint_label: str = Field(min_length=1, max_length=1000)
    destination_endpoint_label: str = Field(min_length=1, max_length=1000)
    motif: str = Field(min_length=1, max_length=4000)
    amount: float = Field(gt=0, description="Montant absolu du mouvement (euros).")
    payment_method: PaymentMethod = Field(default=PaymentMethod.CASH)
    justification_reference: str = Field(min_length=1, max_length=256)

    @field_validator("payment_method")
    @classmethod
    def _reject_free_channel(cls, v: PaymentMethod) -> PaymentMethod:
        if v == PaymentMethod.FREE:
            raise ValueError("Le moyen « free » ne peut pas servir de canal de mouvement interne réel.")
        return v

    @model_validator(mode="after")
    def _coherent_type_flow(self) -> "CashInternalTransferCreate":
        t = self.transfer_type
        f = self.session_flow
        allowed: dict[CashInternalTransferType, frozenset[CashSessionInternalFlow]] = {
            CashInternalTransferType.BANK_DEPOSIT: frozenset({CashSessionInternalFlow.OUTFLOW}),
            CashInternalTransferType.BANK_WITHDRAWAL: frozenset({CashSessionInternalFlow.INFLOW}),
            CashInternalTransferType.CASH_FLOAT_TOPUP: frozenset({CashSessionInternalFlow.INFLOW}),
            CashInternalTransferType.CASH_FLOAT_SEED: frozenset({CashSessionInternalFlow.INFLOW}),
            CashInternalTransferType.INTER_REGISTER_TRANSFER: frozenset(
                {CashSessionInternalFlow.INFLOW, CashSessionInternalFlow.OUTFLOW}
            ),
            CashInternalTransferType.VARIANCE_REGULARIZATION: frozenset(
                {CashSessionInternalFlow.INFLOW, CashSessionInternalFlow.OUTFLOW}
            ),
        }
        if f not in allowed.get(t, frozenset()):
            raise ValueError(
                f"Combinaison interdite : type « {t.value} » et sens « {f.value} » pour la caisse en session."
            )
        return self


class CashInternalTransferResponse(BaseModel):
    id: str
    cash_session_id: str
    sale_id: str
    transfer_type: str
    session_flow: str
    amount: float
    origin_endpoint_label: str
    destination_endpoint_label: str
    motif: str
    payment_method: str
    justification_reference: str
    initiator_user_id: str
    approver_user_id: str
    approved_at: datetime
    idempotency_key: str
    request_id: Optional[str] = None
    created_at: datetime
    paheko_accounting_sync_hint: str = Field(
        default=PAHEKO_ACCOUNTING_SYNC_HINT_INTERNAL_TRANSFER
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
