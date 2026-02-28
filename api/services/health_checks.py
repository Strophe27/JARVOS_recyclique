# Checks sante reutilisables — GET /health et GET /v1/admin/health (Story 8.4).

from api.config import get_settings
from api.workers.push_consumer import get_push_worker_state


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
    settings = get_settings()
    if not settings.oidc_enabled:
        return {
            "enabled": False,
            "status": "disabled",
            "loaded_in_process": True,
            "strict_fail_closed": settings.oidc_fail_closed_strict,
            "http_timeout_seconds": settings.oidc_http_timeout_seconds,
            "issuer_configured": False,
            "client_id_configured": False,
            "redirect_uri_configured": False,
            "client_secret_configured": False,
            "audience_configured": False,
            "missing_required": [],
        }
    missing_required: list[str] = []
    if not (settings.oidc_issuer or "").strip():
        missing_required.append("missing_oidc_issuer")
    if not (settings.oidc_client_id or "").strip():
        missing_required.append("missing_oidc_client_id")
    if not (settings.oidc_redirect_uri or "").strip():
        missing_required.append("missing_oidc_redirect_uri")
    secret = settings.oidc_client_secret
    if secret is None or not secret.get_secret_value().strip():
        missing_required.append("missing_oidc_client_secret")
    if settings.oidc_http_timeout_seconds <= 0:
        missing_required.append("invalid_oidc_http_timeout_seconds")
    if not settings.oidc_fail_closed_strict:
        missing_required.append("oidc_fail_closed_not_strict")
    return {
        "enabled": True,
        "status": "ok" if not missing_required else "degraded",
        "loaded_in_process": True,
        "strict_fail_closed": settings.oidc_fail_closed_strict,
        "http_timeout_seconds": settings.oidc_http_timeout_seconds,
        "issuer_configured": bool((settings.oidc_issuer or "").strip()),
        "client_id_configured": bool((settings.oidc_client_id or "").strip()),
        "redirect_uri_configured": bool((settings.oidc_redirect_uri or "").strip()),
        "client_secret_configured": bool(secret and secret.get_secret_value().strip()),
        "audience_configured": bool((settings.oidc_audience or "").strip()),
        "missing_required": missing_required,
    }
