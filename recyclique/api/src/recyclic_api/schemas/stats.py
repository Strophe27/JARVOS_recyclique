"""
Schemas for statistics endpoints.
"""
from pydantic import BaseModel, Field
from typing import List, Literal
from decimal import Decimal
from datetime import datetime


class ReceptionSummaryStats(BaseModel):
    """Summary statistics for reception data."""

    total_weight: Decimal = Field(
        ...,
        description="Total weight in kg",
        ge=0
    )
    total_items: int = Field(
        ...,
        description="Total number of items",
        ge=0
    )
    unique_categories: int = Field(
        ...,
        description="Number of unique categories",
        ge=0
    )

    class Config:
        json_schema_extra = {
            "example": {
                "total_weight": 1250.75,
                "total_items": 342,
                "unique_categories": 15
            }
        }


class CategoryStats(BaseModel):
    """Statistics for a single category."""

    category_name: str = Field(
        ...,
        description="Name of the category"
    )
    total_weight: Decimal = Field(
        ...,
        description="Total weight in kg for this category",
        ge=0
    )
    total_items: int = Field(
        ...,
        description="Total number of items for this category",
        ge=0
    )

    class Config:
        json_schema_extra = {
            "example": {
                "category_name": "Écrans",
                "total_weight": 350.5,
                "total_items": 80
            }
        }


class ReceptionLiveStatsResponse(BaseModel):
    """Live reception statistics for admin dashboard."""

    tickets_open: int = Field(
        ...,
        description="Number of currently open reception tickets",
        ge=0
    )
    tickets_closed_24h: int = Field(
        ...,
        description="Number of tickets closed in the last 24 hours",
        ge=0
    )
    items_received: int = Field(
        ...,
        description="Number of items/lines received from tickets closed in the last 24 hours",
        ge=0
    )
    turnover_eur: float = Field(
        ...,
        description="Total sales turnover in EUR for the last 24 hours",
        ge=0
    )
    donations_eur: float = Field(
        ...,
        description="Total donations collected in EUR for the last 24 hours",
        ge=0
    )
    weight_in: float = Field(
        ...,
        description="Total weight received in kg (open tickets + closed in last 24h)",
        ge=0
    )
    weight_out: float = Field(
        ...,
        description="Total weight sold in kg from sales in the last 24 hours",
        ge=0
    )

    class Config:
        json_schema_extra = {
            "example": {
                "tickets_open": 5,
                "tickets_closed_24h": 23,
                "items_received": 156,
                "turnover_eur": 1247.50,
                "donations_eur": 45.80,
                "weight_in": 1250.75,
                "weight_out": 890.25
            }
        }


class UnifiedLiveStatsResponse(BaseModel):
    """Unified live statistics for all modules (caisse + réception)."""

    # Stats Caisse
    tickets_count: int = Field(
        ...,
        description="Nombre de tickets vendus dans la période",
        ge=0
    )
    last_ticket_amount: float = Field(
        ...,
        description="Montant du dernier ticket vendu",
        ge=0
    )
    ca: float = Field(
        ...,
        description="Chiffre d'affaires total (SUM Sale.total_amount)",
        ge=0
    )
    donations: float = Field(
        ...,
        description="Dons totaux (SUM Sale.donation)",
        ge=0
    )
    weight_out_sales: float = Field(
        ...,
        description="Poids vendus uniquement (SUM SaleItem.weight, exclut is_exit=true)",
        ge=0
    )

    # Stats Réception
    tickets_open: int = Field(
        ...,
        description="Nombre de tickets de réception ouverts",
        ge=0
    )
    tickets_closed_24h: int = Field(
        ...,
        description="Nombre de tickets fermés dans la période",
        ge=0
    )
    items_received: int = Field(
        ...,
        description="Nombre d'items reçus dans la période",
        ge=0
    )

    # Stats Matière (unifiées)
    weight_in: float = Field(
        ...,
        description="Poids entrés (exclut is_exit=true)",
        ge=0
    )
    weight_out: float = Field(
        ...,
        description="Poids sortis (ventes + is_exit=true)",
        ge=0
    )

    # Métadonnées
    period_start: datetime = Field(
        ...,
        description="Début de la période de calcul"
    )
    period_end: datetime = Field(
        ...,
        description="Fin de la période de calcul"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "tickets_count": 45,
                "last_ticket_amount": 12.50,
                "ca": 1250.75,
                "donations": 45.80,
                "weight_out_sales": 890.25,
                "tickets_open": 3,
                "tickets_closed_24h": 23,
                "items_received": 156,
                "weight_in": 1250.75,
                "weight_out": 920.45,
                "period_start": "2025-12-09T00:00:00Z",
                "period_end": "2025-12-10T00:00:00Z"
            }
        }
