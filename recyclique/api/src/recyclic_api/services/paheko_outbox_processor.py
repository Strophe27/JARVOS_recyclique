"""Traitement at-least-once des lignes outbox Paheko (Stories 8.1–8.2)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Callable

from sqlalchemy import or_
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.models.paheko_outbox import PahekoOutboxItem, PahekoOutboxOperationType, PahekoOutboxStatus
from recyclic_api.services.paheko_accounting_client import PahekoAccountingClient, PahekoHttpResult
from recyclic_api.services.paheko_mapping_service import resolve_enriched_payload_for_item
from recyclic_api.services.paheko_transaction_payload_builder import build_cash_session_close_transaction_payload
from recyclic_api.services.paheko_outbox_transition_audit import (
    TRANSITION_AUTO_DELIVERED_RESOLU,
    TRANSITION_AUTO_QUARANTINE_HTTP,
    TRANSITION_AUTO_QUARANTINE_MAPPING,
    TRANSITION_AUTO_QUARANTINE_MAX_ATTEMPTS,
    TRANSITION_AUTO_QUARANTINE_UNSUPPORTED,
    append_paheko_outbox_transition,
)

logger = logging.getLogger(__name__)


def _classify_failure(http_status: int | None, error_message: str | None) -> str:
    """Mappe échec non retryable (4xx hors familles retry) → SyncStateCore."""
    if http_status is None:
        return "a_reessayer"
    if http_status >= 500:
        return "a_reessayer"
    if http_status in (401, 403):
        return "en_quarantaine"
    if http_status >= 400:
        return "en_quarantaine"
    return "a_reessayer"


def _is_retryable_http_status(http_status: int | None) -> bool:
    """Transitoire / charge — backoff Story 8.2."""
    if http_status is None:
        return True
    if http_status >= 500:
        return True
    if http_status in (408, 429):
        return True
    return False


def _retry_backoff_seconds(attempt_count: int) -> float:
    """Backoff exponentiel plafonné (tentatives déjà incrémentées côté item)."""
    base = float(settings.PAHEKO_OUTBOX_RETRY_BASE_SECONDS)
    cap = float(settings.PAHEKO_OUTBOX_RETRY_MAX_SECONDS)
    power = max(0, min((attempt_count or 1) - 1, 20))
    return min(cap, base * (2**power))


def _eligible_pending_query(db: Session):
    now = datetime.now(timezone.utc)
    return (
        db.query(PahekoOutboxItem)
        .filter(PahekoOutboxItem.outbox_status == PahekoOutboxStatus.pending.value)
        .filter(PahekoOutboxItem.sync_state_core != "rejete")
        .filter(
            or_(
                PahekoOutboxItem.next_retry_at.is_(None),
                PahekoOutboxItem.next_retry_at <= now,
            )
        )
        .order_by(PahekoOutboxItem.created_at.asc())
    )


def process_next_paheko_outbox_item(
    db: Session,
    *,
    client: PahekoAccountingClient | None = None,
    client_factory: Callable[[], PahekoAccountingClient] | None = None,
) -> PahekoOutboxItem | None:
    """
    Sélectionne la plus ancienne ligne ``pending`` éligible (respect ``next_retry_at``),
    passage ``processing``, appel HTTP avec ``Idempotency-Key``, mise à jour.
    """
    if client is None and client_factory is None and not (settings.PAHEKO_API_BASE_URL or "").strip():
        return None

    q = _eligible_pending_query(db)
    dialect = db.get_bind().dialect.name
    if dialect == "postgresql":
        item = q.with_for_update(skip_locked=True).first()
    else:
        item = q.first()
    if item is None:
        return None

    item.outbox_status = PahekoOutboxStatus.processing.value
    item.next_retry_at = None
    db.flush()

    http_client = (
        client_factory() if client_factory is not None else (client or PahekoAccountingClient())
    )

    if item.operation_type != PahekoOutboxOperationType.CASH_SESSION_CLOSE.value:
        fs, fo = item.sync_state_core, item.outbox_status
        item.outbox_status = PahekoOutboxStatus.failed.value
        item.sync_state_core = "en_quarantaine"
        item.last_error = f"unsupported_operation_type:{item.operation_type}"
        item.updated_at = datetime.now(timezone.utc)
        append_paheko_outbox_transition(
            db,
            item=item,
            transition_name=TRANSITION_AUTO_QUARANTINE_UNSUPPORTED,
            from_sync_state=fs,
            to_sync_state=item.sync_state_core,
            from_outbox_status=fo,
            to_outbox_status=item.outbox_status,
            reason=item.last_error or TRANSITION_AUTO_QUARANTINE_UNSUPPORTED,
            actor_user_id=None,
        )
        db.commit()
        return item

    now = datetime.now(timezone.utc)
    post_payload, map_code, map_msg = resolve_enriched_payload_for_item(
        db,
        base_payload=dict(item.payload or {}),
        cash_session_id=item.cash_session_id,
    )
    if map_code is not None or post_payload is None:
        _apply_mapping_resolution_failure(
            db,
            item,
            now=now,
            code=map_code or "mapping_missing",
            message=map_msg or "Résolution mapping Paheko impossible.",
        )
        db.commit()
        return item

    paheko_body, body_code, body_msg = build_cash_session_close_transaction_payload(post_payload)
    if body_code is not None or paheko_body is None:
        _apply_mapping_resolution_failure(
            db,
            item,
            now=now,
            code=body_code or "invalid_outbox_payload",
            message=body_msg or "Construction du body officiel Paheko impossible.",
        )
        db.commit()
        return item

    item.touch_attempt()
    db.flush()

    result = http_client.post_cash_session_close(
        paheko_body,
        correlation_id=item.correlation_id,
        idempotency_key=item.idempotency_key,
    )
    _apply_http_result(db, item, result)
    db.commit()
    return item


def _schedule_retry(item: PahekoOutboxItem, now: datetime) -> None:
    item.outbox_status = PahekoOutboxStatus.pending.value
    item.sync_state_core = "a_reessayer"
    delta = timedelta(seconds=_retry_backoff_seconds(item.attempt_count or 1))
    item.next_retry_at = now + delta
    item.updated_at = now


def _apply_mapping_resolution_failure(
    db: Session,
    item: PahekoOutboxItem,
    *,
    now: datetime,
    code: str,
    message: str,
) -> None:
    """Échec **sans** POST Paheko — pas d'incrément retry HTTP (Story 8.3)."""
    fs, fo = item.sync_state_core, item.outbox_status
    item.outbox_status = PahekoOutboxStatus.failed.value
    item.sync_state_core = "en_quarantaine"
    item.mapping_resolution_error = code[:64]
    item.last_error = message
    item.last_http_status = None
    item.last_response_snippet = None
    item.next_retry_at = None
    item.updated_at = now
    append_paheko_outbox_transition(
        db,
        item=item,
        transition_name=TRANSITION_AUTO_QUARANTINE_MAPPING,
        from_sync_state=fs,
        to_sync_state=item.sync_state_core,
        from_outbox_status=fo,
        to_outbox_status=item.outbox_status,
        reason=message or code,
        actor_user_id=None,
        context_extra={"mapping_resolution_code": code},
    )
    logger.info(
        "paheko_outbox_process outcome=mapping_failed correlation_id=%s id=%s code=%s",
        item.correlation_id,
        item.id,
        code,
    )


def _terminal_quarantine(db: Session, item: PahekoOutboxItem, now: datetime, extra: str | None = None) -> None:
    fs, fo = item.sync_state_core, item.outbox_status
    item.outbox_status = PahekoOutboxStatus.failed.value
    item.sync_state_core = "en_quarantaine"
    item.next_retry_at = None
    if extra and item.last_error:
        item.last_error = f"{item.last_error} | {extra}"
    elif extra:
        item.last_error = extra
    item.updated_at = now
    reason = (extra or "").strip() or "max_attempts_exceeded"
    append_paheko_outbox_transition(
        db,
        item=item,
        transition_name=TRANSITION_AUTO_QUARANTINE_MAX_ATTEMPTS,
        from_sync_state=fs,
        to_sync_state=item.sync_state_core,
        from_outbox_status=fo,
        to_outbox_status=item.outbox_status,
        reason=reason,
        actor_user_id=None,
    )


def _apply_http_result(db: Session, item: PahekoOutboxItem, result: PahekoHttpResult) -> None:
    now = datetime.now(timezone.utc)
    max_a = int(settings.PAHEKO_OUTBOX_MAX_ATTEMPTS)

    if result.error_message:
        item.last_http_status = result.http_status
        item.last_error = result.error_message
        item.last_response_snippet = (result.response_text or "")[:2000]
        retryable = _is_retryable_http_status(result.http_status)
        if retryable and (item.attempt_count or 0) < max_a:
            _schedule_retry(item, now)
            logger.info(
                "paheko_outbox_process outcome=retry_scheduled correlation_id=%s id=%s attempt=%s next_retry_at=%s",
                item.correlation_id,
                item.id,
                item.attempt_count,
                item.next_retry_at,
            )
            return
        if retryable:
            _terminal_quarantine(db, item, now, "max_attempts_exceeded")
        else:
            fs, fo = item.sync_state_core, item.outbox_status
            item.outbox_status = PahekoOutboxStatus.failed.value
            item.sync_state_core = _classify_failure(result.http_status, result.error_message)
            item.next_retry_at = None
            item.updated_at = now
            if item.sync_state_core == "en_quarantaine":
                append_paheko_outbox_transition(
                    db,
                    item=item,
                    transition_name=TRANSITION_AUTO_QUARANTINE_HTTP,
                    from_sync_state=fs,
                    to_sync_state=item.sync_state_core,
                    from_outbox_status=fo,
                    to_outbox_status=item.outbox_status,
                    reason=item.last_error or TRANSITION_AUTO_QUARANTINE_HTTP,
                    actor_user_id=None,
                    context_extra={"http_status": result.http_status},
                )
        logger.info(
            "paheko_outbox_process outcome=failed correlation_id=%s id=%s sync_state=%s",
            item.correlation_id,
            item.id,
            item.sync_state_core,
        )
        return

    status = result.http_status or 0
    item.last_http_status = status
    item.last_response_snippet = (result.response_text or "")[:2000]

    if 200 <= status < 300 or status == 409:
        fs, fo = item.sync_state_core, item.outbox_status
        item.outbox_status = PahekoOutboxStatus.delivered.value
        item.sync_state_core = "resolu"
        item.last_error = None
        item.mapping_resolution_error = None
        item.next_retry_at = None
        item.updated_at = now
        append_paheko_outbox_transition(
            db,
            item=item,
            transition_name=TRANSITION_AUTO_DELIVERED_RESOLU,
            from_sync_state=fs,
            to_sync_state=item.sync_state_core,
            from_outbox_status=fo,
            to_outbox_status=item.outbox_status,
            reason=f"http_delivered_status={status}",
            actor_user_id=None,
            context_extra={"http_status": status},
        )
        logger.info(
            "paheko_outbox_process outcome=delivered correlation_id=%s id=%s http_status=%s",
            item.correlation_id,
            item.id,
            status,
        )
        return

    item.last_error = f"http_status_{status}"
    retryable = _is_retryable_http_status(status)
    if retryable and (item.attempt_count or 0) < max_a:
        _schedule_retry(item, now)
        logger.info(
            "paheko_outbox_process outcome=retry_scheduled_http correlation_id=%s id=%s status=%s next_retry_at=%s",
            item.correlation_id,
            item.id,
            status,
            item.next_retry_at,
        )
        return
    if retryable:
        _terminal_quarantine(db, item, now, "max_attempts_exceeded")
    else:
        fs, fo = item.sync_state_core, item.outbox_status
        item.outbox_status = PahekoOutboxStatus.failed.value
        item.sync_state_core = _classify_failure(status, item.last_error)
        item.next_retry_at = None
        item.updated_at = now
        if item.sync_state_core == "en_quarantaine":
            append_paheko_outbox_transition(
                db,
                item=item,
                transition_name=TRANSITION_AUTO_QUARANTINE_HTTP,
                from_sync_state=fs,
                to_sync_state=item.sync_state_core,
                from_outbox_status=fo,
                to_outbox_status=item.outbox_status,
                reason=item.last_error or TRANSITION_AUTO_QUARANTINE_HTTP,
                actor_user_id=None,
                context_extra={"http_status": status},
            )
    logger.info(
        "paheko_outbox_process outcome=failed_http correlation_id=%s id=%s sync_state=%s status=%s",
        item.correlation_id,
        item.id,
        item.sync_state_core,
        status,
    )
