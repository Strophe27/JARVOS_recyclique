from pydantic import BaseModel, Field, field_validator, ConfigDict, model_validator
from uuid import UUID
from typing import Annotated, List, Literal, Optional, Union
from datetime import datetime
from recyclic_api.models.sale import PaymentMethod, SaleLifecycleStatus, SocialActionKind, SpecialEncaissementKind
from recyclic_api.models.sale_reversal import RefundReasonCode


# Story B52-P1: Schémas pour paiements multiples
class PaymentBase(BaseModel):
    payment_method: PaymentMethod
    amount: float


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(PaymentBase):
    id: str
    sale_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator('id', 'sale_id', mode='before')
    @classmethod
    def _uuid_to_str(cls, v):
        return str(v) if v is not None else v

class SaleItemBase(BaseModel):
    category: str
    quantity: int  # Kept for backward compatibility
    weight: float  # Poids en kg avec décimales
    unit_price: float
    total_price: float
    # Story 1.1.2: Champs ajoutés pour preset et notes par item
    preset_id: Optional[UUID] = None
    notes: Optional[str] = None

class SaleItemCreate(SaleItemBase):
    pass

class SaleItemUpdate(BaseModel):
    """Schema for updating a sale item - Story B52-P4"""
    quantity: Optional[int] = None
    weight: Optional[float] = None
    unit_price: Optional[float] = None  # Admin only
    preset_id: Optional[UUID] = None
    notes: Optional[str] = None

class SaleItemResponse(SaleItemBase):
    id: str
    sale_id: str

    model_config = ConfigDict(from_attributes=True)

    @field_validator('id', 'sale_id', 'preset_id', mode='before')
    @classmethod
    def _uuid_to_str(cls, v):
        return str(v) if v is not None else v

class SaleBase(BaseModel):
    cash_session_id: str
    total_amount: float
    donation: Optional[float] = 0.0
    payment_method: Optional[PaymentMethod] = PaymentMethod.CASH
    note: Optional[str] = None  # Story B40-P5: Notes sur les tickets de caisse
    # Story 1.1.2: notes et preset_id déplacés vers sale_items (par item individuel)

    @field_validator('cash_session_id', mode='before')
    @classmethod
    def _uuid_to_str(cls, v):
        return str(v) if v is not None else v

class SaleCreate(BaseModel):
    cash_session_id: UUID
    items: List[SaleItemCreate] = Field(default_factory=list)
    total_amount: float
    donation: Optional[float] = 0.0
    payment_method: Optional[PaymentMethod] = PaymentMethod.CASH  # Déprécié - utiliser payments à la place
    payments: Optional[List[PaymentCreate]] = None  # Story B52-P1: Paiements multiples
    note: Optional[str] = None  # Story B40-P5: Notes sur les tickets de caisse
    # Story 1.1.2: notes et preset_id déplacés vers sale_items (par item individuel)
    # Story 6.5 : encaissement sans article — exige permission caisse.special_encaissement ; items doit être [].
    special_encaissement_kind: Optional[SpecialEncaissementKind] = None
    # Story 6.6 : action sociale — exige permission caisse.social_encaissement ; exclusif de special_encaissement_kind.
    social_action_kind: Optional[SocialActionKind] = None
    adherent_reference: Optional[str] = Field(None, max_length=200)

    @model_validator(mode="after")
    def _exclusive_encaissement_discriminants(self) -> "SaleCreate":
        if self.special_encaissement_kind is not None and self.social_action_kind is not None:
            raise ValueError(
                "Les champs special_encaissement_kind et social_action_kind sont mutuellement exclusifs (Story 6.6)."
            )
        return self


class SaleHoldCreate(BaseModel):
    """Story 6.3 — mise en attente : panier persisté sans paiement ni agrégat session."""

    cash_session_id: UUID
    items: List[SaleItemCreate]
    total_amount: float
    donation: Optional[float] = 0.0
    note: Optional[str] = None


class SaleFinalizeHeld(BaseModel):
    """Story 6.3 — finalisation d'un ticket précédemment mis en attente."""

    donation: Optional[float] = None
    payment_method: Optional[PaymentMethod] = PaymentMethod.CASH
    payments: Optional[List[PaymentCreate]] = None
    note: Optional[str] = None


class SaleUpdate(BaseModel):
    note: Optional[str] = None  # Story B40-P4: Edition des notes côté Admin

# Story B52-P2: Schéma pour modification du poids d'un item de vente
class SaleItemWeightUpdate(BaseModel):
    weight: float  # Nouveau poids en kg
    
    @field_validator('weight')
    @classmethod
    def validate_weight(cls, v):
        if v <= 0:
            raise ValueError('Le poids doit être supérieur à 0')
        return v

class SaleResponse(SaleBase):
    id: str
    operator_id: Optional[str] = None
    lifecycle_status: SaleLifecycleStatus = SaleLifecycleStatus.COMPLETED
    # Aligné sur sales.sale_date (nullable) : ventes historiques ou créées hors API peuvent être NULL.
    sale_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    items: List[SaleItemResponse] = []
    payments: List[PaymentResponse] = []  # Story B52-P1: Paiements multiples
    special_encaissement_kind: Optional[SpecialEncaissementKind] = None
    social_action_kind: Optional[SocialActionKind] = None
    adherent_reference: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator('id', 'cash_session_id', 'operator_id', mode='before')
    @classmethod
    def _uuid_to_str(cls, v):
        return str(v) if v is not None else v


class SaleReversalCreate(BaseModel):
    """Story 6.4 — remboursement total (montant imposé par la vente source, serveur autoritaire)."""

    source_sale_id: UUID
    reason_code: RefundReasonCode
    detail: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, max_length=128)

    @model_validator(mode="after")
    def _validate_detail(self) -> "SaleReversalCreate":
        if self.reason_code == RefundReasonCode.AUTRE:
            d = (self.detail or "").strip()
            if not d:
                raise ValueError("Le détail est obligatoire lorsque le motif est AUTRE.")
            if len(d) > 500:
                raise ValueError("Le détail ne peut pas dépasser 500 caractères.")
            self.detail = d
        elif self.detail is not None and len(self.detail) > 500:
            raise ValueError("Le détail ne peut pas dépasser 500 caractères.")
        return self


class SaleReversalResponse(BaseModel):
    """Réponse création / lecture reversal (Story 6.4)."""

    id: str
    source_sale_id: str
    cash_session_id: str
    operator_id: str
    amount_signed: float
    reason_code: str
    detail: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("id", "source_sale_id", "cash_session_id", "operator_id", mode="before")
    @classmethod
    def _uuid_reversal(cls, v):
        return str(v) if v is not None else v


class SaleCorrectionSaleDatePayload(BaseModel):
    """Story 6.8 — Lot 1 : correction isolée ``sale_date`` (liste fermée)."""

    model_config = ConfigDict(extra="forbid")

    kind: Literal["sale_date"]
    sale_date: datetime
    reason: str = Field(min_length=1, max_length=2000)


class SaleCorrectionFinalizeFieldsPayload(BaseModel):
    """Story 6.8 — Lot 1 : champs de finalisation whitelistés uniquement."""

    model_config = ConfigDict(extra="forbid")

    kind: Literal["finalize_fields"]
    donation: Optional[float] = None
    total_amount: Optional[float] = None
    payment_method: Optional[PaymentMethod] = None
    note: Optional[str] = Field(None, max_length=10000)
    reason: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def _at_least_one_finalize_field(self) -> "SaleCorrectionFinalizeFieldsPayload":
        if (
            self.donation is None
            and self.total_amount is None
            and self.payment_method is None
            and self.note is None
        ):
            raise ValueError(
                "Au moins un champ parmi donation, total_amount, payment_method, note est requis."
            )
        return self


SaleCorrectionCreate = Union[
    SaleCorrectionSaleDatePayload,
    SaleCorrectionFinalizeFieldsPayload,
]
