"""Schémas ContextEnvelope minimal (Story 2.2) — alignés sur contracts/openapi/recyclique-api.yaml."""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ContextRuntimeState(str, Enum):
    """États runtime UI — noms figés contrat OpenAPI (spec 1.3 §4.2)."""

    ok = "ok"
    degraded = "degraded"
    forbidden = "forbidden"


class ExploitationContextIdsOut(BaseModel):
    """Identifiants de contexte visibles ; champs optionnels (brownfield)."""

    model_config = ConfigDict(extra="forbid")

    site_id: Optional[str] = None
    cash_register_id: Optional[str] = None
    cash_session_id: Optional[str] = None
    reception_post_id: Optional[str] = None


class ContextEnvelopeResponse(BaseModel):
    """
    Enveloppe autoritaire serveur.
    `permission_keys` : sous-ensemble effectif minimal (Story 2.2) ; union rôles + groupes exhaustive en Story 2.3.
    """

    model_config = ConfigDict(extra="forbid")

    runtime_state: ContextRuntimeState
    context: Optional[ExploitationContextIdsOut] = None
    permission_keys: List[str] = Field(default_factory=list)
    computed_at: datetime
    restriction_message: Optional[str] = Field(
        default=None,
        description="Précision serveur pour degraded / forbidden (pas de logique métier côté client).",
    )
