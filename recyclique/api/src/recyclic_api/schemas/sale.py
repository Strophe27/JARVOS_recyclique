from pydantic import BaseModel, Field, field_validator, ConfigDict, model_validator
from uuid import UUID
from typing import Annotated, List, Literal, Optional, Union
from datetime import datetime
from recyclic_api.models.payment_transaction import PaymentTransactionDirection, PaymentTransactionNature
from recyclic_api.models.sale import PaymentMethod, SaleLifecycleStatus, SocialActionKind, SpecialEncaissementKind
from recyclic_api.services.business_tag_resolution import BusinessTagKind
from recyclic_api.models.payment_method import PaymentMethodKind
from recyclic_api.models.sale_reversal import RefundReasonCode


# Story B52-P1: Schémas pour paiements multiples
class PaymentBase(BaseModel):
    payment_method: PaymentMethod
    amount: float


def _normalize_payment_method_str(v: object) -> str:
    if isinstance(v, PaymentMethod):
        return v.value
    s = str(v).strip().lower()
    if not s:
        raise ValueError("payment_method ne peut pas être vide.")
    return s


class PaymentCreate(BaseModel):
    """Ligne de paiement : code référentiel expert (table ``payment_methods``) ou legacy cash|card|check."""

    payment_method: str = Field(max_length=64)
    # Story 22.4 : rejeter tôt les montants non positifs (évite filtrage silencieux dans sale_service)
    amount: float = Field(gt=0, description="Montant strictement positif pour chaque ligne de paiement ou de don.")

    @field_validator("payment_method", mode="before")
    @classmethod
    def _coerce_payment_method_str(cls, v: object) -> str:
        return _normalize_payment_method_str(v)

    @field_validator("payment_method")
    @classmethod
    def _reject_free_explicit_payment(cls, v: str) -> str:
        if v == PaymentMethod.FREE.value:
            raise ValueError(
                "Le moyen de paiement 'free' n'est pas autorise dans payments[]. "
                "Utilisez payment_method=free sur la vente gratuite sans ligne financiere."
            )
        return v


class PaymentResponse(PaymentBase):
    id: str
    sale_id: str
    payment_method_id: Optional[str] = None
    payment_method_code: Optional[str] = None
    nature: Optional[PaymentTransactionNature] = None
    direction: Optional[PaymentTransactionDirection] = None
    original_sale_id: Optional[str] = None
    original_payment_method_id: Optional[str] = None
    is_prior_year_special_case: bool = False
    paheko_account_override: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator(
        'id',
        'sale_id',
        'payment_method_id',
        'original_sale_id',
        'original_payment_method_id',
        mode='before',
    )
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
    # Story 24.9 — tag métier ligne (prime sur le tag ticket).
    business_tag_kind: Optional[BusinessTagKind] = None
    business_tag_custom: Optional[str] = Field(None, max_length=256)

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
    effective_business_tag: Optional[str] = Field(
        default=None,
        description="Tag métier effectif (ligne > ticket > legacy 6.5/6.6).",
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator('id', 'sale_id', 'preset_id', mode='before')
    @classmethod
    def _uuid_to_str(cls, v):
        return str(v) if v is not None else v

class SaleBase(BaseModel):
    cash_session_id: str
    total_amount: float
    donation: Optional[float] = 0.0
    payment_method: Optional[str] = Field(default=PaymentMethod.CASH.value, max_length=64)
    note: Optional[str] = None  # Story B40-P5: Notes sur les tickets de caisse
    # Story 1.1.2: notes et preset_id déplacés vers sale_items (par item individuel)

    @field_validator("payment_method", mode="before")
    @classmethod
    def _coerce_sale_base_pm(cls, v: object) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, PaymentMethod):
            return v.value
        return _normalize_payment_method_str(v)

    @field_validator('cash_session_id', mode='before')
    @classmethod
    def _uuid_to_str(cls, v):
        return str(v) if v is not None else v

class SaleCreate(BaseModel):
    cash_session_id: UUID
    items: List[SaleItemCreate] = Field(default_factory=list)
    total_amount: float
    donation: Optional[float] = 0.0
    payment_method: Optional[str] = Field(
        default=PaymentMethod.CASH.value,
        max_length=64,
    )  # Déprécié - utiliser payments à la place
    payments: Optional[List[PaymentCreate]] = None  # Story B52-P1: Paiements multiples
    # Story 22.4 — don / surplus hors règlement de vente (journal `donation_surplus`)
    donation_surplus: Optional[List[PaymentCreate]] = None
    note: Optional[str] = None  # Story B40-P5: Notes sur les tickets de caisse
    # Story 1.1.2: notes et preset_id déplacés vers sale_items (par item individuel)
    # Story 6.5 : encaissement sans article — exige permission caisse.special_encaissement ; items doit être [].
    special_encaissement_kind: Optional[SpecialEncaissementKind] = None
    # Story 6.6 : action sociale — exige permission caisse.social_encaissement ; exclusif de special_encaissement_kind.
    social_action_kind: Optional[SocialActionKind] = None
    adherent_reference: Optional[str] = Field(None, max_length=200)
    # Story 24.9 — tags métier ticket (surcharge ligne dans items[]).
    business_tag_kind: Optional[BusinessTagKind] = None
    business_tag_custom: Optional[str] = Field(None, max_length=256)

    @field_validator("payment_method", mode="before")
    @classmethod
    def _coerce_sale_create_top_pm(cls, v: object) -> Optional[str]:
        if v is None:
            return None
        return _normalize_payment_method_str(v)

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
    business_tag_kind: Optional[BusinessTagKind] = None
    business_tag_custom: Optional[str] = Field(None, max_length=256)


class SaleFinalizeHeld(BaseModel):
    """Story 6.3 — finalisation d'un ticket précédemment mis en attente."""

    donation: Optional[float] = None
    payment_method: Optional[str] = Field(default=PaymentMethod.CASH.value, max_length=64)
    payments: Optional[List[PaymentCreate]] = None
    donation_surplus: Optional[List[PaymentCreate]] = None
    note: Optional[str] = None
    business_tag_kind: Optional[BusinessTagKind] = None
    business_tag_custom: Optional[str] = Field(None, max_length=256)

    @field_validator("payment_method", mode="before")
    @classmethod
    def _coerce_finalize_top_pm(cls, v: object) -> Optional[str]:
        if v is None:
            return None
        return _normalize_payment_method_str(v)


class SalePaymentMethodOption(BaseModel):
    """Moyen de paiement actif pour UI caisse (référentiel expert, pas import Paheko)."""

    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=120)
    kind: PaymentMethodKind


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
    business_tag_kind: Optional[BusinessTagKind] = None
    business_tag_custom: Optional[str] = None
    effective_business_tag: Optional[str] = Field(
        default=None,
        description="Tag métier effectif au niveau ticket (sans lignes ou défaut avant surcharge ligne).",
    )
    # Story 24.4 — même résolution que le reversal (resolve_refund_branch) ; lecture seule pour le terrain.
    fiscal_branch: Optional[str] = Field(
        default=None,
        description="Branche fiscale si ce remboursement était tenté : current | prior_closed (serveur, GET vente).",
    )
    sale_fiscal_year: Optional[int] = Field(
        default=None,
        description="Année fiscale de rattachement de la vente source (cadrage N vs N-1).",
    )
    current_open_fiscal_year: Optional[int] = Field(
        default=None,
        description="Exercice ouvert connu au moment de la résolution (snapshot autorité).",
    )

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
    # Story 22.5 — double contexte : moyen de sortie réel (≠ vente source legacy) + parcours expert N-1 clos.
    refund_payment_method: PaymentMethod = Field(
        default=PaymentMethod.CASH,
        description="Moyen effectif de remboursement (journal canonique) ; distinct du legacy vente source.",
    )
    expert_prior_year_refund: bool = Field(
        default=False,
        description="Second parcours : déblocage remboursement sur exercice antérieur clos (permission accounting.prior_year_refund).",
    )

    @field_validator("refund_payment_method")
    @classmethod
    def _reject_free_refund_channel(cls, v: PaymentMethod) -> PaymentMethod:
        if v == PaymentMethod.FREE:
            raise ValueError(
                "Le moyen « free » ne peut pas servir de canal de remboursement réel (Story 22.5)."
            )
        return v

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


# Story 24.3 — message métier chaîne canonique (clôture → snapshot → outbox), sans promesse d’écriture instantanée Paheko.
PAHEKO_ACCOUNTING_SYNC_HINT_STANDARD_REFUND = (
    "Le remboursement est enregistré en caisse ; l’écriture comptable Paheko correspondante est intégrée au snapshot "
    "de clôture de session, puis exportée via l’outbox — pas d’écriture Paheko immédiate au moment de "
    "l’enregistrement terrain."
)


class SaleReversalResponse(BaseModel):
    """Réponse création / lecture reversal (Story 6.4 + enrichissement visibilité 24.3)."""

    id: str
    source_sale_id: str
    cash_session_id: str
    operator_id: str
    amount_signed: float
    reason_code: str
    detail: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: datetime
    # Story 24.3 — alignement journal REFUND_PAYMENT / ventilation Epic 23 vs libellé vente source.
    refund_payment_method: str = Field(
        ...,
        description="Moyen effectif de remboursement (journal REFUND_PAYMENT), distinct du legacy vente source si besoin.",
    )
    source_sale_payment_method: Optional[str] = Field(
        default=None,
        description="Moyen de paiement porté par la vente source (peut différer du canal de sortie réel).",
    )
    fiscal_branch: Optional[str] = Field(
        default=None,
        description="Branche fiscale courante : current | prior_closed (autorité exercices ; null si indisponible).",
    )
    sale_fiscal_year: Optional[int] = Field(
        default=None,
        description="Année fiscale de rattachement de la vente source (autorité comptable).",
    )
    current_open_fiscal_year: Optional[int] = Field(
        default=None,
        description="Exercice ouvert connu (cadrage N vs N-1).",
    )
    paheko_accounting_sync_hint: str = Field(
        default=PAHEKO_ACCOUNTING_SYNC_HINT_STANDARD_REFUND,
        description="Rappel chaîne canonique Paheko (pas de second rail ; pas d’instantanéité hors batch clôture).",
    )

    # Construction explicite via ``SaleService.build_sale_reversal_response`` (journal + vente source) — pas d’ORM direct.
    model_config = ConfigDict(from_attributes=False)

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
    payment_method: Optional[str] = None
    note: Optional[str] = Field(None, max_length=10000)
    reason: str = Field(min_length=1, max_length=2000)
    # Remplacement explicite des lignes journal (multi-moyens / Story 22.4) — même granularité que finalize-held.
    payments: Optional[List[PaymentCreate]] = None
    donation_surplus: Optional[List[PaymentCreate]] = None

    @field_validator("payment_method", mode="before")
    @classmethod
    def _coerce_correction_pm(cls, v: object) -> Optional[str]:
        if v is None:
            return None
        return _normalize_payment_method_str(v)

    @model_validator(mode="after")
    def _at_least_one_finalize_field(self) -> "SaleCorrectionFinalizeFieldsPayload":
        if (
            self.donation is None
            and self.total_amount is None
            and self.payment_method is None
            and self.note is None
            and self.payments is None
            and self.donation_surplus is None
        ):
            raise ValueError(
                "Au moins un champ parmi donation, total_amount, payment_method, note, payments, donation_surplus est requis."
            )
        return self


SaleCorrectionCreate = Union[
    SaleCorrectionSaleDatePayload,
    SaleCorrectionFinalizeFieldsPayload,
]
