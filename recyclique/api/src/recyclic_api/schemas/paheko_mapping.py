"""Schémas API admin — mappings Paheko clôture caisse (Story 8.3)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PahekoCashSessionCloseMappingPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: str
    site_id: str = Field(description="Site Recyclique (contexte terrain).")
    register_id: Optional[str] = Field(
        default=None,
        description="Poste de caisse (`CashRegister`) si surcharge ; null = **défaut pour tout le site**.",
    )
    enabled: bool = Field(description="False : la ligne est ignorée à la résolution (équivalent absent).")
    destination_params: Dict[str, Any] = Field(
        description="Paramètres comptables Paheko pour l'écriture officielle `POST /api/accounting/transaction` ; minimum attendu : `id_year`, `debit`, `credit`.",
    )
    label: Optional[str] = Field(default=None, description="Libellé admin optionnel.")
    created_at: datetime
    updated_at: datetime


class PahekoCashSessionCloseMappingListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: List[PahekoCashSessionCloseMappingPublic]
    total: int
    skip: int
    limit: int


class PahekoCashSessionCloseMappingCreateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    site_id: str
    register_id: Optional[str] = None
    destination_params: Dict[str, Any]
    enabled: bool = True
    label: Optional[str] = Field(default=None, max_length=255)

    @field_validator("site_id")
    @classmethod
    def site_uuid(cls, v: str) -> str:
        s = (v or "").strip()
        if not s:
            raise ValueError("site_id requis")
        return s


class PahekoCashSessionCloseMappingUpdateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination_params: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None
    label: Optional[str] = Field(default=None, max_length=255)


def mapping_row_to_public(row: Any) -> PahekoCashSessionCloseMappingPublic:
    return PahekoCashSessionCloseMappingPublic(
        id=str(row.id),
        site_id=str(row.site_id),
        register_id=str(row.register_id) if row.register_id else None,
        enabled=bool(row.enabled),
        destination_params=dict(row.destination_params or {}),
        label=row.label,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
