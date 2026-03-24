from pydantic import BaseModel, field_validator, ConfigDict
from uuid import UUID
from typing import List, Optional
from datetime import datetime
from recyclic_api.models.sale import PaymentMethod


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
    items: List[SaleItemCreate]
    total_amount: float
    donation: Optional[float] = 0.0
    payment_method: Optional[PaymentMethod] = PaymentMethod.CASH  # Déprécié - utiliser payments à la place
    payments: Optional[List[PaymentCreate]] = None  # Story B52-P1: Paiements multiples
    note: Optional[str] = None  # Story B40-P5: Notes sur les tickets de caisse
    # Story 1.1.2: notes et preset_id déplacés vers sale_items (par item individuel)

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
    sale_date: datetime  # Story B52-P3: Date réelle du ticket (date du cahier)
    created_at: datetime
    updated_at: datetime
    items: List[SaleItemResponse] = []
    payments: List[PaymentResponse] = []  # Story B52-P1: Paiements multiples

    model_config = ConfigDict(from_attributes=True)

    @field_validator('id', 'cash_session_id', mode='before')
    @classmethod
    def _uuid_to_str(cls, v):
        return str(v) if v is not None else v
