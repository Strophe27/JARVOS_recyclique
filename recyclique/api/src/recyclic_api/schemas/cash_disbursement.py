"""Story 24.7 — schémas API décaissement typé."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from recyclic_api.models.cash_disbursement import (
    ADMIN_CODED_REASON_KEYS,
    CashDisbursementMotifCode,
    CashDisbursementSubtype,
)
from recyclic_api.models.sale import PaymentMethod

PAHEKO_ACCOUNTING_SYNC_HINT_DISBURSEMENT = (
    "Le décaissement est enregistré en caisse ; l’écriture Paheko correspondante suit le snapshot de clôture "
    "via l’outbox (ADR D1) — pas de second rail d’export direct."
)


class CashDisbursementCreate(BaseModel):
    """Création d’un décaissement — sous-type et motif codifiés obligatoires (PRD §10.5)."""

    subtype: CashDisbursementSubtype
    motif_code: CashDisbursementMotifCode
    counterparty_label: str = Field(min_length=1, max_length=500)
    amount: float = Field(gt=0, description="Montant décaissé (positif, en euros).")
    payment_method: PaymentMethod = Field(default=PaymentMethod.CASH)
    free_comment: Optional[str] = Field(default=None, max_length=2000)
    justification_reference: str = Field(min_length=1, max_length=256)
    actual_settlement_at: datetime
    admin_coded_reason_key: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Obligatoire si subtype = other_admin_coded — clé d’administration fermée.",
    )

    @field_validator("payment_method")
    @classmethod
    def _reject_free_channel(cls, v: PaymentMethod) -> PaymentMethod:
        if v == PaymentMethod.FREE:
            raise ValueError("Le moyen « free » ne peut pas servir de canal de décaissement réel.")
        return v

    @model_validator(mode="after")
    def _admin_coded_rules(self) -> "CashDisbursementCreate":
        if self.subtype == CashDisbursementSubtype.OTHER_ADMIN_CODED:
            key = (self.admin_coded_reason_key or "").strip()
            if not key:
                raise ValueError(
                    "La clé « admin_coded_reason_key » est obligatoire pour le sous-type « other_admin_coded »."
                )
            if key not in ADMIN_CODED_REASON_KEYS:
                raise ValueError(
                    "La clé administrative n'est pas reconnue (ensemble fermé) — pas de valeur fourre-tout."
                )
            self.admin_coded_reason_key = key
        elif self.admin_coded_reason_key is not None and str(self.admin_coded_reason_key).strip():
            raise ValueError(
                "« admin_coded_reason_key » n'est autorisé que pour le sous-type « other_admin_coded »."
            )
        return self


class CashDisbursementResponse(BaseModel):
    id: str
    cash_session_id: str
    sale_id: str
    amount: float
    subtype: str
    motif_code: str
    counterparty_label: str
    payment_method: str
    free_comment: Optional[str] = None
    justification_reference: str
    actual_settlement_at: datetime
    admin_coded_reason_key: Optional[str] = None
    initiator_user_id: str
    approver_user_id: str
    approved_at: datetime
    idempotency_key: str
    request_id: Optional[str] = None
    created_at: datetime
    paheko_accounting_sync_hint: str = Field(default=PAHEKO_ACCOUNTING_SYNC_HINT_DISBURSEMENT)

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
