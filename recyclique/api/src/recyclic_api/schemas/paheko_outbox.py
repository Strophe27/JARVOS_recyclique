"""Schémas API lecture outbox Paheko (Story 8.1)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from recyclic_api.schemas.exploitation_live_snapshot import SyncStateCore


class PahekoOutboxItemPublic(BaseModel):
    """Vue admin / support — distingue persistance locale vs cycle outbox vs erreur distante."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: str
    operation_type: str
    idempotency_key: str
    cash_session_id: Optional[str] = None
    site_id: Optional[str] = None

    outbox_status: str = Field(
        description="Cycle technique : pending, processing, delivered, failed (distinct de sync_state_core)."
    )
    sync_state_core: SyncStateCore

    local_session_persisted: bool = Field(
        default=True,
        description="True : clôture locale enregistrée (présence de la ligne outbox liée à une session clôturée). "
        "Ne signifie pas « sync Paheko OK ».",
    )
    remote_attempt_count: int = 0
    last_remote_http_status: Optional[int] = Field(
        default=None,
        description="Statut HTTP de la dernière tentative Paheko ; null si aucune tentative réseau (ex. non configuré).",
    )
    last_error: Optional[str] = None
    next_retry_at: Optional[datetime] = Field(
        default=None,
        description="Prochain créneau éligible pour une tentative HTTP (backoff 8.2) ; null si immédiat ou N/A.",
    )
    rejection_reason: Optional[str] = Field(
        default=None,
        description="Renseigné si sync_state_core=rejete (décision explicite abandon / non-poussée Paheko).",
    )
    mapping_resolution_error: Optional[str] = Field(
        default=None,
        description=(
            "Story 8.3 — échec **avant** tout POST Paheko : résolution mapping (ex. mapping_missing, "
            "mapping_disabled, session_not_found). Distinct des erreurs HTTP Paheko (`last_remote_http_status`)."
        ),
    )

    correlation_id: str
    created_at: datetime
    updated_at: datetime


class PahekoOutboxSyncTransitionPublic(BaseModel):
    """Entrée d'audit append-only (Story 8.4, contrat §6)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: str
    transition_name: str
    from_sync_state: SyncStateCore
    to_sync_state: SyncStateCore
    from_outbox_status: str
    to_outbox_status: str
    actor_user_id: Optional[str] = None
    occurred_at: datetime
    reason: str
    correlation_id: str
    context_json: Dict[str, Any] = Field(default_factory=dict)


class PahekoOutboxSyncTransitionListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: List[PahekoOutboxSyncTransitionPublic]
    total: int
    skip: int
    limit: int


class PahekoOutboxItemDetail(PahekoOutboxItemPublic):
    payload: Dict[str, Any] = Field(default_factory=dict)
    last_response_snippet: Optional[str] = None
    recent_sync_transitions: List[PahekoOutboxSyncTransitionPublic] = Field(
        default_factory=list,
        description="Dernières transitions significatives (audit §6), les plus récentes en premier.",
    )


class PahekoOutboxListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: List[PahekoOutboxItemPublic]
    total: int
    skip: int
    limit: int


class PahekoOutboxCorrelationTimelineResponse(BaseModel):
    """Story 8.5 — agrégat support : lignes outbox + audit transitions pour un correlation_id."""

    model_config = ConfigDict(extra="forbid")

    correlation_id: str
    items: List[PahekoOutboxItemPublic]
    sync_transitions: List[PahekoOutboxSyncTransitionPublic]
    sync_transitions_total: int
    sync_transitions_skip: int
    sync_transitions_limit: int


class PahekoOutboxRejectBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=1, max_length=4000, description="Motif traçable du rejet (8.2).")

    @field_validator("reason")
    @classmethod
    def reason_not_blank(cls, v: str) -> str:
        s = (v or "").strip()
        if not s:
            raise ValueError("reason ne peut pas être vide")
        return s


def outbox_item_to_public(row: Any) -> PahekoOutboxItemPublic:
    local_ok = row.cash_session_id is not None
    return PahekoOutboxItemPublic(
        id=str(row.id),
        operation_type=row.operation_type,
        idempotency_key=row.idempotency_key,
        cash_session_id=str(row.cash_session_id) if row.cash_session_id else None,
        site_id=str(row.site_id) if row.site_id else None,
        outbox_status=row.outbox_status,
        sync_state_core=SyncStateCore(row.sync_state_core),
        local_session_persisted=local_ok,
        remote_attempt_count=row.attempt_count or 0,
        last_remote_http_status=row.last_http_status,
        last_error=row.last_error,
        next_retry_at=row.next_retry_at,
        rejection_reason=row.rejection_reason,
        mapping_resolution_error=getattr(row, "mapping_resolution_error", None),
        correlation_id=row.correlation_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def sync_transition_to_public(row: Any) -> PahekoOutboxSyncTransitionPublic:
    return PahekoOutboxSyncTransitionPublic(
        id=str(row.id),
        transition_name=row.transition_name,
        from_sync_state=SyncStateCore(row.from_sync_state),
        to_sync_state=SyncStateCore(row.to_sync_state),
        from_outbox_status=row.from_outbox_status,
        to_outbox_status=row.to_outbox_status,
        actor_user_id=str(row.actor_user_id) if row.actor_user_id else None,
        occurred_at=row.occurred_at,
        reason=row.reason,
        correlation_id=row.correlation_id,
        context_json=dict(row.context_json or {}),
    )


def outbox_item_to_detail(
    row: Any,
    *,
    recent_sync_transitions: Optional[List[Any]] = None,
) -> PahekoOutboxItemDetail:
    base = outbox_item_to_public(row).model_dump()
    base["payload"] = dict(row.payload or {})
    base["last_response_snippet"] = row.last_response_snippet
    base["recent_sync_transitions"] = [
        sync_transition_to_public(t) for t in (recent_sync_transitions or [])
    ]
    return PahekoOutboxItemDetail(**base)
