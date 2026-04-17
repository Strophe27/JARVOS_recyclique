"""Service outbox Paheko — enqueue (clôture caisse), lecture admin (Story 8.1)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional, Sequence, Tuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.paheko_outbox import (
    PahekoOutboxItem,
    PahekoOutboxOperationType,
    PahekoOutboxStatus,
)
from recyclic_api.services.paheko_outbox_transition_audit import (
    TRANSITION_MANUAL_CONFIRM_RESOLU,
    TRANSITION_MANUAL_LIFT,
    TRANSITION_MANUAL_REJECT,
    append_paheko_outbox_transition,
)

logger = logging.getLogger(__name__)

OPERATION_CASH_SESSION_CLOSE = PahekoOutboxOperationType.CASH_SESSION_CLOSE.value


def idempotency_key_cash_session_close(session_id: uuid.UUID | str) -> str:
    return f"{OPERATION_CASH_SESSION_CLOSE}:{session_id}"


def enqueue_cash_session_close_outbox(
    db: Session,
    *,
    closed_session: CashSession,
    correlation_id: str,
    accounting_close_snapshot: Optional[dict[str, Any]] = None,
) -> PahekoOutboxItem:
    """
    Insère une ligne outbox pour une session déjà passée à **closed** en mémoire ;
    appeler **avant** le ``commit`` métier pour atomicité avec la clôture.
    """
    sid = closed_session.id
    ikey = idempotency_key_cash_session_close(sid)
    existing = db.query(PahekoOutboxItem).filter(PahekoOutboxItem.idempotency_key == ikey).one_or_none()
    if existing is not None:
        logger.info(
            "paheko_outbox_enqueue skip duplicate idempotency_key=%s correlation_id=%s",
            ikey,
            correlation_id,
        )
        return existing

    payload: dict[str, Any] = {
        "cash_session_id": str(sid),
        "site_id": str(closed_session.site_id) if closed_session.site_id else None,
        "operator_id": str(closed_session.operator_id) if closed_session.operator_id else None,
        "closed_at": closed_session.closed_at.isoformat() if closed_session.closed_at else None,
        "actual_amount": closed_session.actual_amount,
        "theoretical_amount": closed_session.closing_amount,
        "variance": closed_session.variance,
        # Remarques Paheko : décomposer fond de caisse vs ventes nettes (≠ encaissements bruts par moyen).
        "session_initial_amount": closed_session.initial_amount,
        "session_total_sales_rollups": closed_session.total_sales,
    }
    # Story 22.6 — charge figée pour le builder Paheko (22.7) sans relire le legacy vente.
    if accounting_close_snapshot is not None:
        payload["accounting_close_snapshot_frozen"] = accounting_close_snapshot

    row = PahekoOutboxItem(
        operation_type=OPERATION_CASH_SESSION_CLOSE,
        idempotency_key=ikey,
        cash_session_id=sid,
        site_id=closed_session.site_id,
        payload=payload,
        outbox_status=PahekoOutboxStatus.pending.value,
        sync_state_core="a_reessayer",
        correlation_id=correlation_id,
    )
    try:
        with db.begin_nested():
            db.add(row)
            db.flush()
    except IntegrityError:
        # Course rare : deux flux voient one_or_none() vide puis insèrent — contrainte unique gagne.
        raced = db.query(PahekoOutboxItem).filter(PahekoOutboxItem.idempotency_key == ikey).one()
        logger.info(
            "paheko_outbox_enqueue skip duplicate after race idempotency_key=%s correlation_id=%s",
            ikey,
            correlation_id,
        )
        return raced
    logger.info(
        "paheko_outbox_enqueue created id=%s correlation_id=%s session_id=%s",
        row.id,
        correlation_id,
        sid,
    )
    return row


def list_outbox_items(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
    operation_type: Optional[str] = None,
    cash_session_id: Optional[uuid.UUID] = None,
    outbox_status: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> Tuple[Sequence[PahekoOutboxItem], int]:
    q = db.query(PahekoOutboxItem)
    if operation_type:
        q = q.filter(PahekoOutboxItem.operation_type == operation_type)
    if cash_session_id is not None:
        q = q.filter(PahekoOutboxItem.cash_session_id == cash_session_id)
    if outbox_status:
        q = q.filter(PahekoOutboxItem.outbox_status == outbox_status)
    if correlation_id:
        cid = correlation_id.strip()
        if cid:
            q = q.filter(PahekoOutboxItem.correlation_id == cid)
    total = q.count()
    rows = (
        q.order_by(PahekoOutboxItem.created_at.desc())
        .offset(skip)
        .limit(min(limit, 200))
        .all()
    )
    return rows, total


def get_outbox_item(db: Session, item_id: uuid.UUID) -> PahekoOutboxItem | None:
    return db.get(PahekoOutboxItem, item_id)


def get_outbox_item_for_cash_session(
    db: Session,
    cash_session_id: uuid.UUID,
) -> PahekoOutboxItem | None:
    """Ligne outbox liée à une session clôturée (slice clôture = typiquement une ligne)."""
    return (
        db.query(PahekoOutboxItem)
        .filter(PahekoOutboxItem.cash_session_id == cash_session_id)
        .order_by(PahekoOutboxItem.created_at.desc())
        .first()
    )


def list_outbox_items_by_correlation_id(
    db: Session,
    correlation_id: str,
) -> Sequence[PahekoOutboxItem]:
    cid = (correlation_id or "").strip()
    if not cid:
        return []
    return (
        db.query(PahekoOutboxItem)
        .filter(PahekoOutboxItem.correlation_id == cid)
        .order_by(PahekoOutboxItem.created_at.asc())
        .all()
    )


def reject_paheko_outbox_item(
    db: Session,
    item_id: uuid.UUID,
    *,
    reason: str,
    actor_user_id: uuid.UUID,
) -> tuple[PahekoOutboxItem | None, str | None]:
    """
    Décision explicite **rejete** (Story 8.2) : pas de retry identique sans changement de contexte.

    Retourne ``(item, None)`` en succès ou si déjà ``rejete`` (idempotent, sans nouvelle ligne d'audit).
    ``(None, 'not_found')`` ou ``(None, 'terminal_sync')`` si la ligne est déjà livrée / résolue
    (interdit de repasser en rejet — évite de fausser l'audit).
    """
    item = get_outbox_item(db, item_id)
    if item is None:
        return None, "not_found"
    if item.sync_state_core == "rejete":
        return item, None
    if (
        item.outbox_status == PahekoOutboxStatus.delivered.value
        or item.sync_state_core == "resolu"
    ):
        return None, "terminal_sync"
    fs, fo = item.sync_state_core, item.outbox_status
    item.outbox_status = PahekoOutboxStatus.failed.value
    item.sync_state_core = "rejete"
    item.rejection_reason = (reason or "").strip()[:4000] or None
    item.next_retry_at = None
    item.updated_at = datetime.now(timezone.utc)
    append_paheko_outbox_transition(
        db,
        item=item,
        transition_name=TRANSITION_MANUAL_REJECT,
        from_sync_state=fs,
        to_sync_state=item.sync_state_core,
        from_outbox_status=fo,
        to_outbox_status=item.outbox_status,
        reason=(reason or "").strip()[:8000],
        actor_user_id=actor_user_id,
    )
    db.flush()
    return item, None


def lift_paheko_quarantine_to_retry(
    db: Session,
    item_id: uuid.UUID,
    *,
    reason: str,
    actor_user_id: uuid.UUID,
) -> tuple[PahekoOutboxItem | None, str | None]:
    """Story 8.4 — ``en_quarantaine`` → ``a_reessayer``, file technique ``pending`` (ré-éligibilité processor)."""
    item = get_outbox_item(db, item_id)
    if item is None:
        return None, "not_found"
    if item.sync_state_core != "en_quarantaine":
        return None, "invalid_state"
    fs, fo = item.sync_state_core, item.outbox_status
    item.sync_state_core = "a_reessayer"
    item.outbox_status = PahekoOutboxStatus.pending.value
    item.next_retry_at = None
    item.mapping_resolution_error = None
    # Quarantaine après épuisement des tentatives HTTP retryables (8.2) : la levée manuelle
    # redonne un plafond/backoff complets (AC2 — reprise contrôlée, sans masquer l'historique).
    if item.last_error and "max_attempts_exceeded" in item.last_error:
        item.attempt_count = 0
    item.updated_at = datetime.now(timezone.utc)
    append_paheko_outbox_transition(
        db,
        item=item,
        transition_name=TRANSITION_MANUAL_LIFT,
        from_sync_state=fs,
        to_sync_state=item.sync_state_core,
        from_outbox_status=fo,
        to_outbox_status=item.outbox_status,
        reason=(reason or "").strip()[:8000],
        actor_user_id=actor_user_id,
    )
    db.flush()
    return item, None


def confirm_paheko_delivered_resolved(
    db: Session,
    item_id: uuid.UUID,
    *,
    reason: str,
    actor_user_id: uuid.UUID,
) -> tuple[PahekoOutboxItem | None, str | None]:
    """
    Story 8.4 — aligne ``sync_state_core=resolu`` **uniquement** si preuve 8.2 : ``outbox_status=delivered``.
    Idempotent si déjà ``resolu``.
    """
    item = get_outbox_item(db, item_id)
    if item is None:
        return None, "not_found"
    if item.outbox_status != PahekoOutboxStatus.delivered.value:
        return None, "not_delivered"
    if item.sync_state_core == "resolu":
        return item, None
    fs, fo = item.sync_state_core, item.outbox_status
    item.sync_state_core = "resolu"
    item.updated_at = datetime.now(timezone.utc)
    append_paheko_outbox_transition(
        db,
        item=item,
        transition_name=TRANSITION_MANUAL_CONFIRM_RESOLU,
        from_sync_state=fs,
        to_sync_state=item.sync_state_core,
        from_outbox_status=fo,
        to_outbox_status=item.outbox_status,
        reason=(reason or "").strip()[:8000],
        actor_user_id=actor_user_id,
    )
    db.flush()
    return item, None
