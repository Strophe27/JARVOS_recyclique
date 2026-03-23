# Schemas Pydantic — Ticket dépôt (Story 6.1). snake_case.

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from api.schemas.ligne_depot import LigneDepotResponse


class TicketDepotCreateRequest(BaseModel):
    """Body optionnel pour POST /v1/reception/tickets (poste_id optionnel, déduit du poste courant)."""

    poste_id: UUID | None = None


class TicketDepotResponse(BaseModel):
    """Réponse détail / création ticket. Optionnellement avec lignes (Story 6.2)."""

    id: UUID
    poste_id: UUID
    benevole_user_id: UUID | None
    benevole_user_name: str | None = None
    created_at: datetime
    closed_at: datetime | None = None
    status: str
    updated_at: datetime
    lignes: list[LigneDepotResponse] | None = None

    model_config = {"from_attributes": True}


class TicketDepotListResponse(BaseModel):
    """GET /v1/reception/tickets — pagination (items, total, page, page_size)."""

    items: list[TicketDepotResponse]
    total: int
    page: int
    page_size: int
