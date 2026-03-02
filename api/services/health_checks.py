# Checks sante reutilisables — GET /health et GET /v1/admin/health (Story 8.4, 17.7).

from __future__ import annotations

from api.config import get_settings
from api.services.resilience import get_resilience_snapshot
from api.workers.push_consumer import get_push_worker_state


def _anomaly(code: str, component: str, message: str, severity: str = "error") -> dict:
    return {"code": code, "component": component, "message": message, "severity": severity}


def collect_anomalies() -> list[dict]:
    """
    Agregation des anomalies depuis checks reels et resilience.
    Une anomalie = check != 'ok' ou dependance avec alert_triggered.
    """
    items: list[dict] = []
    db_status = check_database()
    redis_status = check_redis()
    push_worker_status = check_push_worker()
    oidc_runtime = check_oidc_runtime()
    resilience = get_resilience_snapshot()

    if db_status != "ok":
        items.append(_anomaly("database_error", "database", f"Base de donnees: {db_status}", "error"))
    if redis_status != "ok":
        items.append(_anomaly("redis_error", "redis", f"Redis: {redis_status}", "error"))
    if push_worker_status != "ok":
        items.append(_anomaly("push_worker_error", "push_worker", f"Scheduler: {push_worker_status}", "error"))
    if oidc_runtime.get("status") not in ("ok", "disabled"):
        items.append(_anomaly("oidc_degraded", "oidc", f"OIDC: {oidc_runtime.get('status')}", "warning"))
    for dep, state in (resilience.get("dependencies") or {}).items():
        if state.get("alert_triggered"):
            items.append(
                _anomaly(
                    f"resilience_{dep}_alert",
                    dep,
                    f"Alert: {state.get('last_reason') or 'consecutive failures'}",
                    "error",
                )
            )
    return items


def check_database() -> str:
    """Retourne 'ok', 'unconfigured' ou 'error'."""
    settings = get_settings()
    if not settings.database_url:
        return "unconfigured"
    try:
        from sqlalchemy import text
        from api.db.session import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return "ok"
    except Exception:
        return "error"


def check_redis() -> str:
    """Retourne 'ok', 'unconfigured' ou 'error'."""
    settings = get_settings()
    if not settings.redis_url:
        return "unconfigured"
    try:
        import redis
        r = redis.from_url(settings.redis_url)
        r.ping()
        return "ok"
    except Exception:
        return "error"


def check_push_worker() -> str:
    """Retourne 'ok', 'unconfigured' ou 'error' (scheduler = push worker)."""
    state = get_push_worker_state()
    if not state["configured"]:
        return "unconfigured"
    if not state.get("running", False):
        return "error"
    if state.get("last_error") is not None:
        return "error"
    return "ok"


def check_oidc_runtime() -> dict:
    """OIDC desactive (story 14.6 : retour auth simple JWT/PIN)."""
    return {
        "enabled": False,
        "status": "disabled",
        "loaded_in_process": True,
    }
