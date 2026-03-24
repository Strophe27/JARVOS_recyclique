from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class CategoryBase(BaseModel):
    name: str  # Nom court/rapide (obligatoire, inchangé)
    official_name: Optional[str] = None  # Story B48-P5: Nom complet officiel (optionnel)


class CategoryCreate(CategoryBase):
    parent_id: Optional[str] = None
    price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    display_order: Optional[int] = 0
    display_order_entry: Optional[int] = 0  # Story B48-P4: Ordre pour ENTRY/DEPOT
    is_visible: Optional[bool] = True
    shortcut_key: Optional[str] = None
    # official_name hérité de CategoryBase (optionnel)


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    official_name: Optional[str] = None  # Story B48-P5: Nom complet officiel (optionnel)
    is_active: Optional[bool] = None
    parent_id: Optional[str] = None
    price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    display_order: Optional[int] = None
    display_order_entry: Optional[int] = None  # Story B48-P4: Ordre pour ENTRY/DEPOT
    is_visible: Optional[bool] = None
    shortcut_key: Optional[str] = None


class CategoryRead(CategoryBase):
    id: str
    is_active: bool
    parent_id: Optional[str] = None
    price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    display_order: int
    display_order_entry: int  # Story B48-P4: Ordre pour ENTRY/DEPOT
    is_visible: bool
    shortcut_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    # name et official_name hérités de CategoryBase

    model_config = ConfigDict(from_attributes=True)

    @field_validator('id', mode='before')
    @classmethod
    def _uuid_to_str(cls, v):
        return str(v) if v is not None else v

    @field_validator('parent_id', mode='before')
    @classmethod
    def _parent_uuid_to_str(cls, v):
        return str(v) if v is not None else v


class CategoryWithChildren(CategoryRead):
    children: List['CategoryWithChildren'] = []

    model_config = ConfigDict(from_attributes=True)


class CategoryImportAnalyzeResponse(BaseModel):
    session_id: Optional[str]
    summary: dict
    sample: List[dict]
    errors: List[str]


class CategoryImportExecuteRequest(BaseModel):
    session_id: str
    delete_existing: bool = False


class CategoryDisplay(BaseModel):
    """Story B48-P5: Schéma pour l'API opérationnelle - retourne name (nom court) directement"""
    id: str
    name: str  # Nom court/rapide (toujours utilisé pour l'affichage)
    official_name: Optional[str] = None  # Nom complet officiel (pour tooltips)
    is_active: bool
    parent_id: Optional[str] = None
    price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    display_order: int
    display_order_entry: int  # Story B48-P4: Ordre pour ENTRY/DEPOT
    is_visible: bool
    shortcut_key: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator('id', mode='before')
    @classmethod
    def _uuid_to_str(cls, v):
        return str(v) if v is not None else v

    @field_validator('parent_id', mode='before')
    @classmethod
    def _parent_uuid_to_str(cls, v):
        return str(v) if v is not None else v

    @classmethod
    def from_category(cls, category):
        """Story B48-P5: Créer un CategoryDisplay depuis une Category - utilise name directement"""
        return cls(
            id=str(category.id),
            name=category.name,  # Nom court/rapide (toujours utilisé)
            official_name=category.official_name,  # Nom complet officiel (optionnel)
            is_active=category.is_active,
            parent_id=str(category.parent_id) if category.parent_id else None,
            price=category.price,
            max_price=category.max_price,
            display_order=category.display_order,
            display_order_entry=category.display_order_entry,  # Story B48-P4
            is_visible=category.is_visible,
            shortcut_key=category.shortcut_key
        )