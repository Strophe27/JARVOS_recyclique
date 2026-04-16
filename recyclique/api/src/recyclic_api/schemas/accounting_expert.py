"""Schémas API — paramétrage comptable expert (Story 22.3)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from recyclic_api.models.payment_method import PaymentMethodKind


_PAHEKO_ACCOUNT_RE = r"^[0-9A-Za-z._-]{1,32}$"


def _validate_paheko_account(v: str) -> str:
    import re

    if not re.match(_PAHEKO_ACCOUNT_RE, v):
        raise ValueError("Code compte Paheko invalide (1–32 caractères alphanumériques, . _ -)")
    return v


class GlobalAccountsPayload(BaseModel):
    default_sales_account: str
    default_donation_account: str
    prior_year_refund_account: str

    @field_validator("default_sales_account", "default_donation_account", "prior_year_refund_account")
    @classmethod
    def _acc(cls, v: str) -> str:
        return _validate_paheko_account(v)


class GlobalAccountsResponse(GlobalAccountsPayload):
    updated_at: datetime


class PaymentMethodExpertBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)
    label: str = Field(..., min_length=1, max_length=120)
    kind: PaymentMethodKind
    paheko_debit_account: str
    paheko_refund_credit_account: str
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    display_order: int = 0
    notes: Optional[str] = None

    @field_validator("paheko_debit_account", "paheko_refund_credit_account")
    @classmethod
    def _pm_acc(cls, v: str) -> str:
        return _validate_paheko_account(v)


class PaymentMethodCreate(PaymentMethodExpertBase):
    active: bool = False


class PaymentMethodUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=120)
    kind: Optional[PaymentMethodKind] = None
    paheko_debit_account: Optional[str] = None
    paheko_refund_credit_account: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    display_order: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("paheko_debit_account", "paheko_refund_credit_account")
    @classmethod
    def _upd_acc(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validate_paheko_account(v)


class PaymentMethodExpertResponse(PaymentMethodExpertBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    active: bool
    archived_at: Optional[datetime] = None


class AccountingRevisionSummary(BaseModel):
    id: UUID
    revision_seq: int
    published_at: datetime
    actor_user_id: Optional[UUID] = None
    note: Optional[str] = None


class AccountingRevisionDetail(AccountingRevisionSummary):
    snapshot: dict[str, Any]


class PublishAccountingRevisionBody(BaseModel):
    note: Optional[str] = Field(None, max_length=2000)
