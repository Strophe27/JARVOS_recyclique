import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from api.services.audit import write_audit_event

logger = logging.getLogger(__name__)

DEPENDENCY_IDP = "idp"
DEPENDENCY_PAHEKO = "paheko"
DEPENDENCIES = (DEPENDENCY_IDP, DEPENDENCY_PAHEKO)
ALERT_CONSECUTIVE_FAILURES = 3


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _iso_utc(dt: datetime | None = None) -> str:
    value = dt or _now_utc()
    return value.astimezone(timezone.utc).isoformat()


@dataclass
class DependencyRuntimeState:
    status: str = "ok"
    consecutive_failures: int = 0
    last_reason: str | None = None
    last_incident_at: datetime | None = None
    last_transition_at: datetime | None = None
    last_request_id: str | None = None


_state_lock = Lock()
_states: dict[str, DependencyRuntimeState] = {
    DEPENDENCY_IDP: DependencyRuntimeState(),
    DEPENDENCY_PAHEKO: DependencyRuntimeState(),
}
_counters: dict[str, int] = {
    "fail_closed_total": 0,
    "mode_transition_total": 0,
}


def _mode_from_states(states: dict[str, DependencyRuntimeState]) -> str:
    return "degraded" if any(s.status == "degraded" for s in states.values()) else "ok"


def reset_runtime_state_for_tests() -> None:
    with _state_lock:
        for dep in DEPENDENCIES:
            _states[dep] = DependencyRuntimeState()
        _counters["fail_closed_total"] = 0
        _counters["mode_transition_total"] = 0


def record_dependency_result(
    *,
    dependency: str,
    ok: bool,
    reason: str | None,
    request_id: str,
) -> None:
    if dependency not in DEPENDENCIES:
        return
    with _state_lock:
        before_mode = _mode_from_states(_states)
        state = _states[dependency]
        now = _now_utc()
        if ok:
            state.consecutive_failures = 0
            state.last_request_id = request_id
            if state.status == "degraded":
                state.status = "ok"
                state.last_transition_at = now
                state.last_reason = "recovered"
                _counters["mode_transition_total"] += 1
        else:
            state.consecutive_failures += 1
            state.status = "degraded"
            state.last_reason = reason
            state.last_incident_at = now
            state.last_request_id = request_id
            if state.last_transition_at is None or state.consecutive_failures == 1:
                state.last_transition_at = now
                _counters["mode_transition_total"] += 1
        after_mode = _mode_from_states(_states)
    if before_mode != after_mode:
        logger.warning(
            json.dumps(
                {
                    "event": "DEPENDENCY_MODE_TRANSITION",
                    "request_id": request_id,
                    "dependency": dependency,
                    "before_mode": before_mode,
                    "after_mode": after_mode,
                    "reason": reason,
                    "timestamp": _iso_utc(),
                },
                ensure_ascii=True,
            )
        )


def record_fail_closed_counter() -> None:
    with _state_lock:
        _counters["fail_closed_total"] += 1


def get_resilience_snapshot() -> dict[str, Any]:
    with _state_lock:
        states_copy = {
            dep: DependencyRuntimeState(
                status=state.status,
                consecutive_failures=state.consecutive_failures,
                last_reason=state.last_reason,
                last_incident_at=state.last_incident_at,
                last_transition_at=state.last_transition_at,
                last_request_id=state.last_request_id,
            )
            for dep, state in _states.items()
        }
        counters_copy = dict(_counters)
    mode = _mode_from_states(states_copy)
    return {
        "mode": mode,
        "dependencies": {
            dep: {
                "status": state.status,
                "consecutive_failures": state.consecutive_failures,
                "alert_triggered": state.consecutive_failures >= ALERT_CONSECUTIVE_FAILURES,
                "alert_threshold": ALERT_CONSECUTIVE_FAILURES,
                "last_reason": state.last_reason,
                "last_incident_at": _iso_utc(state.last_incident_at) if state.last_incident_at else None,
                "last_transition_at": _iso_utc(state.last_transition_at) if state.last_transition_at else None,
                "last_request_id": state.last_request_id,
            }
            for dep, state in states_copy.items()
        },
        "counters": counters_copy,
    }


def write_resilience_audit_event(
    db: Session,
    *,
    user_id: UUID | None,
    request_id: str,
    dependency: str,
    decision: str,
    reason: str,
    route: str | None,
    status_code: int,
    action: str = "FAIL_CLOSED_TRIGGERED",
) -> None:
    payload = {
        "request_id": request_id,
        "dependency": dependency,
        "decision": decision,
        "reason": reason,
        "route": route,
        "status_code": status_code,
        "timestamp": _iso_utc(),
    }
    write_audit_event(
        db,
        user_id=user_id,
        action=action,
        resource_type="iam_resilience",
        resource_id=request_id,
        details=json.dumps(payload, ensure_ascii=True),
    )
    db.commit()
