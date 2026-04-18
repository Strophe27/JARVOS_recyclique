"""Lecture outbox Paheko — admin / support (Story 8.1)."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from recyclic_api.core.auth import require_role_strict
from recyclic_api.core.database import get_db
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.paheko_outbox import (
    PahekoOutboxCorrelationTimelineResponse,
    PahekoOutboxItemDetail,
    PahekoOutboxListResponse,
    PahekoOutboxRejectBody,
    PahekoResolvedTransactionPreview,
    PahekoOutboxSyncTransitionListResponse,
    outbox_item_to_detail,
    outbox_item_to_public,
    sync_transition_to_public,
)
from recyclic_api.services.paheko_close_batch_builder import build_cash_session_close_batch_from_enriched_payload
from recyclic_api.services.paheko_mapping_service import resolve_enriched_payload_for_item
from recyclic_api.services.paheko_outbox_service import (
    confirm_paheko_delivered_resolved,
    delete_paheko_outbox_item_failed,
    get_outbox_item,
    lift_paheko_quarantine_to_retry,
    list_outbox_items,
    list_outbox_items_by_correlation_id,
    reject_paheko_outbox_item,
)
from recyclic_api.services.paheko_transaction_payload_builder import build_cash_session_close_transaction_payload
from recyclic_api.services.paheko_outbox_transition_audit import (
    list_transitions_for_correlation,
    list_transitions_for_item,
)

router = APIRouter()


def _build_transaction_preview(db: Session, row: object) -> PahekoResolvedTransactionPreview | None:
    operation_type = getattr(row, "operation_type", None)
    if operation_type != "cash_session_close":
        return None
    payload = getattr(row, "payload", None)
    cash_session_id = getattr(row, "cash_session_id", None)
    enriched_payload, err, _msg = resolve_enriched_payload_for_item(
        db,
        base_payload=dict(payload or {}),
        cash_session_id=cash_session_id,
    )
    if err is not None or enriched_payload is None:
        return None
    if isinstance(enriched_payload.get("accounting_close_snapshot_frozen"), dict):
        ikey = getattr(row, "idempotency_key", "") or ""
        planned, perr, _ = build_cash_session_close_batch_from_enriched_payload(
            enriched_payload,
            batch_idempotency_key=str(ikey),
            db=db,
        )
        if perr or not planned:
            return None
        body = None
        for _p, b in planned:
            if b is not None:
                body = b
                break
        if body is None:
            return None
        body_code, _body_msg = None, None
    else:
        body, body_code, _body_msg = build_cash_session_close_transaction_payload(enriched_payload)
    if body_code is not None or body is None:
        return None
    id_year = body.get("id_year")
    try:
        id_year_value = int(id_year)
    except (TypeError, ValueError):
        return None
    label = body.get("label")
    reference = body.get("reference")
    if body.get("type") == "ADVANCED" and isinstance(body.get("lines"), list):
        lines = body["lines"]
        td = sum(float(x.get("debit") or 0) for x in lines if isinstance(x, dict))
        tc = sum(float(x.get("credit") or 0) for x in lines if isinstance(x, dict))
        amount_value = max(td, tc)
        return PahekoResolvedTransactionPreview(
            amount=float(amount_value),
            debit="(ADVANCED)",
            credit="(ADVANCED)",
            id_year=id_year_value,
            label=label if isinstance(label, str) else None,
            reference=reference if isinstance(reference, str) else None,
            body_type="ADVANCED",
            advanced_line_count=len(lines),
        )
    amount = body.get("amount")
    debit = body.get("debit")
    credit = body.get("credit")
    if not isinstance(debit, str) or not isinstance(credit, str):
        return None
    try:
        amount_value = float(amount)
    except (TypeError, ValueError):
        return None
    return PahekoResolvedTransactionPreview(
        amount=amount_value,
        debit=debit,
        credit=credit,
        id_year=id_year_value,
        label=label if isinstance(label, str) else None,
        reference=reference if isinstance(reference, str) else None,
        body_type="REVENUE",
        advanced_line_count=None,
    )


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
        data=[outbox_item_to_public(r, transaction_preview=_build_transaction_preview(db, r)) for r in rows],
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
        items=[outbox_item_to_public(r, transaction_preview=_build_transaction_preview(db, r)) for r in items],
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
    return outbox_item_to_detail(
        row,
        recent_sync_transitions=recent,
        transaction_preview=_build_transaction_preview(db, row),
    )


@router.delete(
    "/items/{item_id}",
    status_code=204,
    operation_id="recyclique_pahekoOutbox_deleteItemFailed",
    summary="Supprimer une ligne outbox en erreur (failed uniquement, super-admin)",
)
async def paheko_outbox_delete_item_failed(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([UserRole.SUPER_ADMIN])),
):
    """
    Efface la ligne **uniquement** si ``outbox_status=failed`` (quarantaine, rejet, échec HTTP).
    Permet de nettoyer des envois de développement ou abandons sans relance. Interdit si la ligne
    est encore ``pending``, ``processing`` ou ``delivered``.
    """
    _ = current_user
    err = delete_paheko_outbox_item_failed(db, item_id)
    if err == "not_found":
        raise HTTPException(status_code=404, detail="Élément outbox introuvable")
    if err == "delete_blocked_batch":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "DELETE_BLOCKED_BATCH_CLOSE_STATE",
                "message": (
                    "Suppression refusée : état batch clôture présent avec livraison partielle Paheko, sous-écritures "
                    "livré(es), ou payload batch illisible — suppression manuelle trop risquée sans arbitrage "
                    "(DEL-01)."
                ),
                "policy_reason_code": "PAHEKO_DELETE_BLOCKED_PARTIAL_OR_AMBIGUOUS_BATCH",
            },
        )
    if err == "not_deletable":
        raise HTTPException(
            status_code=409,
            detail="Suppression refusée : la ligne n'est pas en statut d'échec (failed) — arrêtez le traitement ou utilisez les autres actions support.",
        )
    db.commit()
    return Response(status_code=204)


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
    return outbox_item_to_detail(
        row,
        recent_sync_transitions=recent,
        transaction_preview=_build_transaction_preview(db, row),
    )


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
    return outbox_item_to_detail(
        row,
        recent_sync_transitions=recent,
        transaction_preview=_build_transaction_preview(db, row),
    )


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
    return outbox_item_to_detail(
        row,
        recent_sync_transitions=recent,
        transaction_preview=_build_transaction_preview(db, row),
    )
