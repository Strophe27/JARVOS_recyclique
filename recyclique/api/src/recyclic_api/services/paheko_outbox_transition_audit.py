"""Append-only : transitions sync outbox Paheko (Story 8.4, audit contrat §6)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Sequence, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from recyclic_api.models.paheko_outbox import PahekoOutboxItem
from recyclic_api.models.paheko_outbox_sync_transition import PahekoOutboxSyncTransition

# Noms de transition stables (observabilité / support)
TRANSITION_AUTO_QUARANTINE_MAPPING = "auto_quarantine_mapping_resolution"
# Story 25.9 — échec snapshot / builder / corps Paheko (distinct du mapping site/caisse).
TRANSITION_AUTO_QUARANTINE_BUILDER = "auto_quarantine_builder_preparation"
TRANSITION_AUTO_QUARANTINE_UNSUPPORTED = "auto_quarantine_unsupported_operation_type"
TRANSITION_AUTO_QUARANTINE_MAX_ATTEMPTS = "auto_quarantine_max_attempts_exceeded"
TRANSITION_AUTO_QUARANTINE_HTTP = "auto_quarantine_http_non_retryable"
TRANSITION_AUTO_DELIVERED_RESOLU = "auto_sync_delivered_resolu"
TRANSITION_MANUAL_LIFT = "manual_lift_quarantine_to_retry"
TRANSITION_MANUAL_REJECT = "manual_reject"
TRANSITION_MANUAL_CONFIRM_RESOLU = "manual_confirm_resolu_from_delivered"


def minimal_transition_context(item: PahekoOutboxItem) -> dict[str, Any]:
    return {
        "operation_type": item.operation_type,
        "cash_session_id": str(item.cash_session_id) if item.cash_session_id else None,
        "site_id": str(item.site_id) if item.site_id else None,
        "idempotency_key": item.idempotency_key,
        "last_error": item.last_error,
        "mapping_resolution_error": getattr(item, "mapping_resolution_error", None),
        "last_http_status": item.last_http_status,
    }


def append_paheko_outbox_transition(
    db: Session,
    *,
    item: PahekoOutboxItem,
    transition_name: str,
    from_sync_state: str,
    to_sync_state: str,
    from_outbox_status: str,
    to_outbox_status: str,
    reason: str,
    actor_user_id: uuid.UUID | None,
    occurred_at: datetime | None = None,
    context_extra: dict[str, Any] | None = None,
) -> PahekoOutboxSyncTransition:
    when = occurred_at or datetime.now(timezone.utc)
    ctx = minimal_transition_context(item)
    if context_extra:
        ctx = {**ctx, **context_extra}
    row = PahekoOutboxSyncTransition(
        outbox_item_id=item.id,
        transition_name=transition_name[:128],
        from_sync_state=from_sync_state[:32],
        to_sync_state=to_sync_state[:32],
        from_outbox_status=from_outbox_status[:32],
        to_outbox_status=to_outbox_status[:32],
        actor_user_id=actor_user_id,
        occurred_at=when,
        reason=(reason or "").strip()[:8000] or "(no reason)",
        correlation_id=(item.correlation_id or "")[:128],
        context_json=ctx,
    )
    db.add(row)
    db.flush()
    return row


def list_transitions_for_item(
    db: Session,
    item_id: uuid.UUID,
    *,
    skip: int = 0,
    limit: int = 50,
    order: str = "desc",
) -> Tuple[Sequence[PahekoOutboxSyncTransition], int]:
    q = db.query(PahekoOutboxSyncTransition).filter(
        PahekoOutboxSyncTransition.outbox_item_id == item_id
    )
    total = q.count()
    col = PahekoOutboxSyncTransition.occurred_at
    order_clause = col.asc() if order == "asc" else col.desc()
    rows = q.order_by(order_clause).offset(skip).limit(min(limit, 200)).all()
    return rows, total


def list_recent_transitions_for_items(
    db: Session,
    item_ids: Sequence[uuid.UUID],
    *,
    per_item_limit: int = 10,
) -> Dict[uuid.UUID, Tuple[Sequence[PahekoOutboxSyncTransition], int]]:
    """
    Charge en une fois les ``per_item_limit`` transitions les plus récentes par item
    (équivalent à ``list_transitions_for_item(..., skip=0, limit=per_item_limit, order='desc')``).

    Utilisé par les listes admin pour éviter un appel N+1 à ``list_transitions_for_item`` par ligne.
    Retourne une entrée pour chaque identifiant demandé (total 0 et liste vide si aucune transition).
    """
    item_ids_list = list(item_ids)
    if not item_ids_list:
        return {}

    T = PahekoOutboxSyncTransition
    count_rows = (
        db.query(T.outbox_item_id, func.count())
        .filter(T.outbox_item_id.in_(item_ids_list))
        .group_by(T.outbox_item_id)
        .all()
    )
    totals: dict[uuid.UUID, int] = {row[0]: row[1] for row in count_rows}

    rn = (
        func.row_number()
        .over(partition_by=T.outbox_item_id, order_by=T.occurred_at.desc())
        .label("rn")
    )
    ranked = (
        select(T.id, rn)
        .where(T.outbox_item_id.in_(item_ids_list))
        .subquery("ranked_transitions")
    )
    stmt = select(T).where(
        T.id.in_(select(ranked.c.id).where(ranked.c.rn <= per_item_limit))
    )
    rows = list(db.scalars(stmt).all())

    by_item: dict[uuid.UUID, list[PahekoOutboxSyncTransition]] = {}
    for tr in rows:
        by_item.setdefault(tr.outbox_item_id, []).append(tr)
    for lst in by_item.values():
        lst.sort(key=lambda r: r.occurred_at, reverse=True)

    out: Dict[uuid.UUID, Tuple[Sequence[PahekoOutboxSyncTransition], int]] = {}
    for iid in item_ids_list:
        seq = tuple(by_item.get(iid, ()))
        out[iid] = (seq, totals.get(iid, 0))
    return out


def list_transitions_for_correlation(
    db: Session,
    correlation_id: str,
    *,
    skip: int = 0,
    limit: int = 200,
    order: str = "asc",
) -> Tuple[Sequence[PahekoOutboxSyncTransition], int]:
    """Story 8.5 — toutes les entrées d'audit partageant le même correlation_id (plusieurs items possibles)."""
    cid = (correlation_id or "").strip()
    q = db.query(PahekoOutboxSyncTransition).filter(
        PahekoOutboxSyncTransition.correlation_id == cid
    )
    total = q.count()
    col = PahekoOutboxSyncTransition.occurred_at
    order_clause = col.asc() if order == "asc" else col.desc()
    rows = q.order_by(order_clause).offset(skip).limit(min(limit, 200)).all()
    return rows, total


