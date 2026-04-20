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
from recyclic_api.services.paheko_close_batch_builder import (
    PAHEKO_CLOSE_BATCH_STATE_KEY,
    amounts_from_frozen_snapshot,
    build_cash_session_close_batch_from_enriched_payload,
    merge_state_with_planned,
    parse_remote_transaction_id,
)
from recyclic_api.services.paheko_mapping_service import resolve_enriched_payload_for_item
from recyclic_api.services.paheko_transaction_payload_builder import build_cash_session_close_transaction_payload
from recyclic_api.services.paheko_outbox_transition_audit import (
    TRANSITION_AUTO_DELIVERED_RESOLU,
    TRANSITION_AUTO_QUARANTINE_BUILDER,
    TRANSITION_AUTO_QUARANTINE_HTTP,
    TRANSITION_AUTO_QUARANTINE_MAPPING,
    TRANSITION_AUTO_QUARANTINE_MAX_ATTEMPTS,
    TRANSITION_AUTO_QUARANTINE_UNSUPPORTED,
    append_paheko_outbox_transition,
)

logger = logging.getLogger(__name__)

# Story 25.9 (spec 25.4 §4) — corrélation supervision 25.10 : domaine d'échec *avant* transport HTTP.
_FAILURE_DOMAIN_MAPPING = "mapping"
_FAILURE_DOMAIN_BUILDER = "builder"


def _infer_preparation_failure_domain(code: str) -> str:
    """Codes issus de ``resolve_enriched_payload_for_item`` / 8.3 vs builder batch / mono-ligne."""
    mapping_codes = {
        "session_not_found",
        "site_missing",
        "mapping_missing",
        "mapping_disabled",
        "invalid_destination_params",
    }
    c = (code or "").strip()
    if c in mapping_codes:
        return _FAILURE_DOMAIN_MAPPING
    return _FAILURE_DOMAIN_BUILDER


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

    Spec **25.4 §4** (story 25.9) : aucun état **delivered** / succès terminal tant que le mapping
    Paheko obligatoire ou la construction builder (snapshot → sous-écritures) n'est pas résolu ;
    échecs → quarantaine / trace ``preparation_trace_v1``, jamais succès silencieux sur transport HTTP seul.
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
            failure_domain=_FAILURE_DOMAIN_MAPPING,
        )
        db.commit()
        return item

    if isinstance(post_payload.get("accounting_close_snapshot_frozen"), dict):
        _process_cash_session_close_batch(
            db,
            item,
            post_payload,
            http_client,
            now=now,
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
            failure_domain=_FAILURE_DOMAIN_BUILDER,
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


def _persist_payload_state(item: PahekoOutboxItem, state: dict) -> None:
    pl = dict(item.payload or {})
    pl[PAHEKO_CLOSE_BATCH_STATE_KEY] = state
    item.payload = pl


def _process_cash_session_close_batch(
    db: Session,
    item: PahekoOutboxItem,
    post_payload: dict,
    http_client: PahekoAccountingClient,
    *,
    now: datetime,
) -> None:
    """
    Story 22.7 — N POST idempotents avec sous-clés ; reprise des seuls échecs (resume_failed_sub_writes_v1).

    Transport Epic 8 inchangé (un seul enregistrement outbox par session ; états dans ``payload`` JSON).

    Spec **25.4 §4** (story 25.9) : ne pas marquer **delivered** au niveau ligne ou agrégat tant que le
    batch planifié (builder depuis snapshot figé + mapping résolu) est invalide ; pas de sous-écriture
    ``delivered`` sans réponse HTTP Paheko valide pour cette sous-clé.
    """
    planned_rows, bcode, bmsg = build_cash_session_close_batch_from_enriched_payload(
        post_payload,
        batch_idempotency_key=item.idempotency_key,
        db=db,
    )
    if bcode is not None or planned_rows is None:
        _apply_mapping_resolution_failure(
            db,
            item,
            now=now,
            code=bcode or "batch_build_failed",
            message=bmsg or "Construction batch Paheko (snapshot figé) impossible.",
            failure_domain=_FAILURE_DOMAIN_BUILDER,
        )
        return

    item.touch_attempt()
    db.flush()

    prev_state = None
    if isinstance(item.payload, dict):
        prev_state = item.payload.get(PAHEKO_CLOSE_BATCH_STATE_KEY)
    state = merge_state_with_planned(
        prev_state if isinstance(prev_state, dict) else None,
        batch_idempotency_key=item.idempotency_key,
        planned=planned_rows,
    )

    any_retryable_failure = False
    any_terminal_failure = False
    last_summary: str | None = None
    last_batch_http_status: int | None = None
    last_success_line_http: int | None = None

    for planned, body in planned_rows:
        idx = planned["index"]
        sw = next((s for s in state["sub_writes"] if int(s["index"]) == idx), None)
        if sw is None:
            continue
        if sw.get("status") in ("delivered", "skipped_zero"):
            continue
        if body is None:
            sw["status"] = "skipped_zero"
            continue

        sub_key = sw["idempotency_sub_key"]
        result = http_client.post_cash_session_close(
            body,
            correlation_id=item.correlation_id,
            idempotency_key=sub_key,
        )

        if result.error_message:
            sw["last_http_status"] = result.http_status
            sw["last_error"] = result.error_message
            retryable = _is_retryable_http_status(result.http_status)
            if retryable:
                sw["status"] = "failed"
                any_retryable_failure = True
            else:
                sw["status"] = "failed"
                any_terminal_failure = True
            if result.http_status is not None:
                last_batch_http_status = result.http_status
            last_summary = result.error_message
            continue

        status = result.http_status or 0
        sw["last_http_status"] = status
        if 200 <= status < 300 or status == 409:
            rid = parse_remote_transaction_id(result.response_text or "")
            sw["status"] = "delivered"
            # Story 25.9 — distingue transport HTTP réussi vs échecs mapping (transition) / builder (batch).
            sw["delivery_domain"] = "outbox_http"
            sw["last_error"] = None
            last_success_line_http = status
            if rid:
                sw["remote_transaction_id"] = rid
            elif status == 409:
                sw["remote_transaction_id"] = sw.get("remote_transaction_id") or "idempotent_duplicate"
            continue

        sw["last_error"] = f"http_status_{status}"
        last_batch_http_status = status
        retryable = _is_retryable_http_status(status)
        if retryable:
            sw["status"] = "failed"
            any_retryable_failure = True
        else:
            sw["status"] = "failed"
            any_terminal_failure = True
        last_summary = sw["last_error"]

    subs = state["sub_writes"]
    all_done = all(s.get("status") in ("delivered", "skipped_zero") for s in subs)
    any_delivered = any(s.get("status") == "delivered" for s in subs)
    state["all_delivered"] = bool(all_done)
    state["partial_success"] = bool(any_delivered and not all_done)

    _persist_payload_state(item, state)

    if all_done and not any_delivered:
        snap = post_payload.get("accounting_close_snapshot_frozen")
        if isinstance(snap, dict):
            s_tot, rc_tot, rp_tot = amounts_from_frozen_snapshot(snap)
            if (s_tot + rc_tot + rp_tot) > 0.004:
                item.last_error = "batch_all_skipped_nonzero_snapshot"
                item.last_http_status = None
                fs, fo = item.sync_state_core, item.outbox_status
                item.outbox_status = PahekoOutboxStatus.failed.value
                item.sync_state_core = "en_quarantaine"
                item.next_retry_at = None
                item.updated_at = now
                append_paheko_outbox_transition(
                    db,
                    item=item,
                    transition_name=TRANSITION_AUTO_QUARANTINE_HTTP,
                    from_sync_state=fs,
                    to_sync_state=item.sync_state_core,
                    from_outbox_status=fo,
                    to_outbox_status=item.outbox_status,
                    reason=item.last_error or "batch_all_skipped_nonzero_snapshot",
                    actor_user_id=None,
                    context_extra={
                        "batch": True,
                        "cause": "all_sub_writes_skipped",
                        "snapshot_totals": {"s": s_tot, "rc": rc_tot, "rp": rp_tot},
                    },
                )
                return

    if all_done:
        final_http = last_success_line_http if last_success_line_http is not None else 200
        ok = PahekoHttpResult(http_status=final_http, response_text="{}", error_message=None)
        _apply_http_result(db, item, ok)
        return

    if any_terminal_failure:
        item.last_error = last_summary or "batch_sub_write_terminal_failure"
        item.last_http_status = last_batch_http_status
        fs, fo = item.sync_state_core, item.outbox_status
        item.outbox_status = PahekoOutboxStatus.failed.value
        item.sync_state_core = "en_quarantaine"
        item.next_retry_at = None
        item.updated_at = now
        append_paheko_outbox_transition(
            db,
            item=item,
            transition_name=TRANSITION_AUTO_QUARANTINE_HTTP,
            from_sync_state=fs,
            to_sync_state=item.sync_state_core,
            from_outbox_status=fo,
            to_outbox_status=item.outbox_status,
            reason=item.last_error or "batch_partial_terminal",
            actor_user_id=None,
            context_extra={"batch": True, "partial": state.get("partial_success")},
        )
        return

    if any_retryable_failure:
        item.last_error = last_summary or "batch_sub_write_retryable"
        item.last_http_status = last_batch_http_status
        max_a = int(settings.PAHEKO_OUTBOX_MAX_ATTEMPTS)
        if (item.attempt_count or 0) >= max_a:
            _terminal_quarantine(db, item, now, "max_attempts_exceeded")
            return
        _schedule_retry(item, now)
        return


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
    failure_domain: str | None = None,
) -> None:
    """
    Échec **sans** POST Paheko — pas d'incrément retry HTTP (Story 8.3).

    Story **25.9** : inclut les échecs **builder** (snapshot / ventilation / corps) — nom historique
    conservé ; le champ ``failure_domain`` + transition distinguent mapping **8.3** vs préparation batch.
    """
    fs, fo = item.sync_state_core, item.outbox_status
    domain = (failure_domain or _infer_preparation_failure_domain(code)).strip()
    if domain not in (_FAILURE_DOMAIN_MAPPING, _FAILURE_DOMAIN_BUILDER):
        domain = _FAILURE_DOMAIN_BUILDER
    transition = (
        TRANSITION_AUTO_QUARANTINE_MAPPING if domain == _FAILURE_DOMAIN_MAPPING else TRANSITION_AUTO_QUARANTINE_BUILDER
    )
    item.outbox_status = PahekoOutboxStatus.failed.value
    item.sync_state_core = "en_quarantaine"
    item.mapping_resolution_error = code[:64]
    item.last_error = message
    item.last_http_status = None
    item.last_response_snippet = None
    item.next_retry_at = None
    item.updated_at = now
    pl = dict(item.payload or {})
    pl["preparation_trace_v1"] = {
        "failure_domain": domain,
        "code": code[:128],
        "message": (message or "")[:2000],
    }
    item.payload = pl
    append_paheko_outbox_transition(
        db,
        item=item,
        transition_name=transition,
        from_sync_state=fs,
        to_sync_state=item.sync_state_core,
        from_outbox_status=fo,
        to_outbox_status=item.outbox_status,
        reason=message or code,
        actor_user_id=None,
        context_extra={
            "mapping_resolution_code": code,
            "failure_domain": domain,
        },
    )
    logger.info(
        "paheko_outbox_process outcome=preparation_failed correlation_id=%s id=%s failure_domain=%s code=%s",
        item.correlation_id,
        item.id,
        domain,
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
        pl_ok = dict(item.payload or {})
        pl_ok.pop("preparation_trace_v1", None)
        item.payload = pl_ok
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
