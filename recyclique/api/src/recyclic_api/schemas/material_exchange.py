"""Story 24.6 — échange matière (API orchestrée)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from recyclic_api.schemas.sale import SaleCreate, SaleReversalCreate


class MaterialExchangeCreate(BaseModel):
    """Corps POST : delta en centimes ; branche monétaire selon le signe."""

    delta_amount_cents: int = Field(
        ...,
        description="Positif = complément à encaisser ; négatif = remboursement (total vente source) ; 0 = matière seule.",
    )
    material_trace: dict[str, Any] = Field(default_factory=dict)
    complement_sale: Optional[SaleCreate] = None
    reversal: Optional[SaleReversalCreate] = None
    idempotency_key: Optional[str] = Field(None, max_length=128)

    @model_validator(mode="after")
    def _branch_consistency(self) -> "MaterialExchangeCreate":
        d = self.delta_amount_cents
        if d == 0:
            if self.complement_sale is not None or self.reversal is not None:
                raise ValueError("Échange sans flux monétaire : ne pas fournir complement_sale ni reversal.")
        elif d > 0:
            if self.complement_sale is None:
                raise ValueError("Complément : le corps complement_sale (vente canonique) est requis.")
            if self.reversal is not None:
                raise ValueError("Complément : ne pas fournir reversal.")
        else:
            if self.reversal is None:
                raise ValueError("Sortie caisse : le corps reversal (remboursement canonique total) est requis.")
            if self.complement_sale is not None:
                raise ValueError("Sortie caisse : ne pas fournir complement_sale.")
        return self


class MaterialExchangeResponse(BaseModel):
    id: str
    cash_session_id: str
    delta_amount_cents: int
    material_trace: dict[str, Any]
    complement_sale_id: Optional[str] = None
    sale_reversal_id: Optional[str] = None
    paheko_accounting_sync_hint: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": False}
