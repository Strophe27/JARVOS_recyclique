"""Lecture outbox Paheko — admin / support (Story 8.1)."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from recyclic_api.core.auth import require_role_strict
from recyclic_api.core.database import get_db
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.paheko_outbox import (
    PahekoOutboxCorrelationTimelineResponse,
    PahekoOutboxItemDetail,
    PahekoOutboxListResponse,
    PahekoOutboxRejectBody,
    PahekoOutboxSyncTransitionListResponse,
    outbox_item_to_detail,
    outbox_item_to_public,
    sync_transition_to_public,
)
from recyclic_api.services.paheko_outbox_service import (
    confirm_paheko_delivered_resolved,
    get_outbox_item,
    lift_paheko_quarantine_to_retry,
    list_outbox_items,
    list_outbox_items_by_correlation_id,
    reject_paheko_outbox_item,
)
from recyclic_api.services.paheko_outbox_transition_audit import (
    list_transitions_for_correlation,
    list_transitions_for_item,
)

router = APIRouter()


@router.get(
    "/items",
    response_model=PahekoOutboxListResponse,
    operation_id="recyclique_pahekoOutbox_listItems",
    summary="Lister les éléments d'outbox Paheko",
)
async def paheko_outbox_list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    operation_type: Optional[str] = Query(None),
    cash_session_id: Optional[str] = Query(None),
    outbox_status: Optional[str] = Query(None, description="pending, processing, delivered, failed"),
    correlation_id: Optional[str] = Query(
        None,
        description="Story 8.5 — filtre exact sur correlation_id (clôture / X-Correlation-ID Paheko).",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    _ = current_user
    cs_uuid = None
    if cash_session_id:
        try:
            cs_uuid = uuid.UUID(cash_session_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="cash_session_id invalide") from exc

    rows, total = list_outbox_items(
        db,
        skip=skip,
        limit=limit,
        operation_type=operation_type,
        cash_session_id=cs_uuid,
        outbox_status=outbox_status,
        correlation_id=correlation_id,
    )
    return PahekoOutboxListResponse(
        data=[outbox_item_to_public(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/by-correlation/{correlation_id}",
    response_model=PahekoOutboxCorrelationTimelineResponse,
    operation_id="recyclique_pahekoOutbox_getCorrelationTimeline",
    summary="Vue agrégée outbox + audit par correlation_id (Story 8.5)",
)
async def paheko_outbox_get_correlation_timeline(
    correlation_id: str,
    transitions_skip: int = Query(0, ge=0),
    transitions_limit: int = Query(200, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    _ = current_user
    cid = (correlation_id or "").strip()
    if not cid:
        raise HTTPException(status_code=400, detail="correlation_id requis")
    items = list_outbox_items_by_correlation_id(db, cid)
    if not items:
        raise HTTPException(
            status_code=404,
            detail="Aucune ligne outbox pour ce correlation_id",
        )
    trans_rows, trans_total = list_transitions_for_correlation(
        db,
        cid,
        skip=transitions_skip,
        limit=transitions_limit,
        order="asc",
    )
    return PahekoOutboxCorrelationTimelineResponse(
        correlation_id=cid,
        items=[outbox_item_to_public(r) for r in items],
        sync_transitions=[sync_transition_to_public(t) for t in trans_rows],
        sync_transitions_total=trans_total,
        sync_transitions_skip=transitions_skip,
        sync_transitions_limit=transitions_limit,
    )


@router.get(
    "/items/{item_id}",
    response_model=PahekoOutboxItemDetail,
    operation_id="recyclique_pahekoOutbox_getItem",
    summary="Détail d'un élément d'outbox Paheko",
)
async def paheko_outbox_get_item(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    _ = current_user
    row = get_outbox_item(db, item_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Élément outbox introuvable")
    recent, _ = list_transitions_for_item(db, item_id, skip=0, limit=10, order="desc")
    return outbox_item_to_detail(row, recent_sync_transitions=recent)


@router.post(
    "/items/{item_id}/reject",
    response_model=PahekoOutboxItemDetail,
    operation_id="recyclique_pahekoOutbox_rejectItem",
    summary="Rejeter explicitement une ligne outbox Paheko (sync_state_core=rejete)",
)
async def paheko_outbox_reject_item(
    item_id: uuid.UUID,
    body: PahekoOutboxRejectBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    _ = current_user
    row, err = reject_paheko_outbox_item(
        db,
        item_id,
        reason=body.reason,
        actor_user_id=current_user.id,
    )
    if err == "not_found":
        raise HTTPException(status_code=404, detail="Élément outbox introuvable")
    if err == "terminal_sync":
        raise HTTPException(
            status_code=409,
            detail="Ligne déjà synchronisée (delivered / resolu) ; rejet impossible sans correction métier.",
        )
    assert row is not None
    db.commit()
    db.refresh(row)
    recent, _ = list_transitions_for_item(db, item_id, skip=0, limit=10, order="desc")
    return outbox_item_to_detail(row, recent_sync_transitions=recent)


@router.get(
    "/items/{item_id}/sync-transitions",
    response_model=PahekoOutboxSyncTransitionListResponse,
    operation_id="recyclique_pahekoOutbox_listItemSyncTransitions",
    summary="Piste d'audit des transitions sync d'une ligne outbox (Story 8.4)",
)
async def paheko_outbox_list_sync_transitions(
    item_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    _ = current_user
    if get_outbox_item(db, item_id) is None:
        raise HTTPException(status_code=404, detail="Élément outbox introuvable")
    rows, total = list_transitions_for_item(db, item_id, skip=skip, limit=limit, order="asc")
    return PahekoOutboxSyncTransitionListResponse(
        data=[sync_transition_to_public(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/items/{item_id}/lift-quarantine",
    response_model=PahekoOutboxItemDetail,
    operation_id="recyclique_pahekoOutbox_liftQuarantineToRetry",
    summary="Levée de quarantaine — repasse en file pour traitement (Story 8.4)",
)
async def paheko_outbox_lift_quarantine(
    item_id: uuid.UUID,
    body: PahekoOutboxRejectBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    row, err = lift_paheko_quarantine_to_retry(
        db,
        item_id,
        reason=body.reason,
        actor_user_id=current_user.id,
    )
    if err == "not_found":
        raise HTTPException(status_code=404, detail="Élément outbox introuvable")
    if err == "invalid_state":
        raise HTTPException(
            status_code=409,
            detail="Transition refusée : la ligne doit être en_quarantaine pour une levée contrôlée.",
        )
    assert row is not None
    db.commit()
    db.refresh(row)
    recent, _ = list_transitions_for_item(db, item_id, skip=0, limit=10, order="desc")
    return outbox_item_to_detail(row, recent_sync_transitions=recent)


@router.post(
    "/items/{item_id}/confirm-resolved",
    response_model=PahekoOutboxItemDetail,
    operation_id="recyclique_pahekoOutbox_confirmResolvedFromDelivered",
    summary="Constater resolu — uniquement si outbox delivered (critère 8.2, Story 8.4)",
)
async def paheko_outbox_confirm_resolved(
    item_id: uuid.UUID,
    body: PahekoOutboxRejectBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    row, err = confirm_paheko_delivered_resolved(
        db,
        item_id,
        reason=body.reason,
        actor_user_id=current_user.id,
    )
    if err == "not_found":
        raise HTTPException(status_code=404, detail="Élément outbox introuvable")
    if err == "not_delivered":
        raise HTTPException(
            status_code=409,
            detail="Transition refusée : resolu manuel exige outbox_status=delivered (preuve livraison 8.2).",
        )
    assert row is not None
    db.commit()
    db.refresh(row)
    recent, _ = list_transitions_for_item(db, item_id, skip=0, limit=10, order="desc")
    return outbox_item_to_detail(row, recent_sync_transitions=recent)
