# Story 8.4, 17.7 — GET /v1/admin/health (agrégé), /health/database, /health/scheduler, /health/anomalies.
# Protégé par permission super_admin.

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.core.deps import require_permissions
from api.db import get_db
from api.models import User
from api.services.email_test import send_test_email
from api.services.health_checks import (
    check_database,
    check_redis,
    check_push_worker,
    check_oidc_runtime,
    collect_anomalies,
)
from api.services.resilience import get_resilience_snapshot
from api.workers.push_consumer import get_push_worker_state

router = APIRouter(prefix="/health", tags=["admin-health"])
_SuperAdmin = Depends(require_permissions("super_admin"))


@router.get("")
def admin_health(current_user: User = _SuperAdmin) -> dict:
    """GET /v1/admin/health — agrégé (status, database, redis, push_worker)."""
    db = check_database()
    redis_status = check_redis()
    push_worker_status = check_push_worker()
    auth_runtime = check_oidc_runtime()
    resilience = get_resilience_snapshot()
    status = (
        "ok"
        if (
            db == "ok"
            and redis_status == "ok"
            and resilience.get("mode") == "ok"
            and auth_runtime.get("status") in ("ok", "disabled")
        )
        else "degraded"
    )
    return {
        "status": status,
        "database": db,
        "redis": redis_status,
        "push_worker": push_worker_status,
        "iam_mode": resilience.get("mode"),
        "dependencies": resilience.get("dependencies"),
        "iam_counters": resilience.get("counters"),
        "auth_runtime": auth_runtime,
    }


@router.get("/database")
def admin_health_database(current_user: User = _SuperAdmin) -> dict:
    """GET /v1/admin/health/database."""
    return {"status": check_database()}


@router.get("/scheduler")
def admin_health_scheduler(current_user: User = _SuperAdmin) -> dict:
    """GET /v1/admin/health/scheduler — état du worker push (scheduler)."""
    s = check_push_worker()
    state = get_push_worker_state()
    return {
        "status": s,
        "configured": state.get("configured", False),
        "running": state.get("running", False),
        "last_error": state.get("last_error"),
        "last_success_at": state.get("last_success_at"),
    }


@router.get("/anomalies")
def admin_health_anomalies(current_user: User = _SuperAdmin) -> dict:
    """GET /v1/admin/health/anomalies — liste reelle des anomalies."""
    items = collect_anomalies()
    return {"items": items, "count": len(items)}


@router.get("/auth")
def admin_health_auth(current_user: User = _SuperAdmin) -> dict:
    """GET /v1/admin/health/auth — état runtime OIDC fail-closed (sanitisé)."""
    return check_oidc_runtime()


@router.post("/test-notifications")
def admin_health_test_notifications(
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> dict:
    """POST /v1/admin/health/test-notifications — envoi email de test selon config admin."""
    return send_test_email(db)
