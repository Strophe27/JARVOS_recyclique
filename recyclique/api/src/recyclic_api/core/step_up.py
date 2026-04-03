"""
Step-up security (Story 2.4) — preuve serveur (PIN) pour mutations sensibles.

Les valeurs secrètes ne sont jamais journalisées ; les clés de permission restent
alignées avec ``effective_permissions`` / ``require_permission`` quand une route
combine les deux garde-fous.
"""

from __future__ import annotations

import logging
from typing import Optional

import redis
from fastapi import HTTPException, status

from recyclic_api.core.security import verify_password
from recyclic_api.models.user import User

logger = logging.getLogger(__name__)

# En-têtes documentés (OpenAPI)
STEP_UP_PIN_HEADER = "X-Step-Up-Pin"
IDEMPOTENCY_KEY_HEADER = "Idempotency-Key"
REQUEST_ID_HEADER = "X-Request-Id"

# Lot v2 minimal — opérations protégées (référence audit / doc)
SENSITIVE_OPERATION_CASH_SESSION_CLOSE = "cash_session.close"

# Alignement approximatif avec le rate limit ``POST /auth/pin`` (5/min) : fenêtre Redis.
_STEP_UP_FAIL_WINDOW_SEC = 60
_STEP_UP_MAX_FAILS_PER_WINDOW = 5
_STEP_UP_LOCKOUT_SEC = 900  # 15 minutes après dépassement


def _redis_key_fail(user_id: str) -> str:
    return f"stepup:pin_fail:{user_id}"


def _redis_key_lockout(user_id: str) -> str:
    return f"stepup:pin_lockout:{user_id}"


def _is_locked_out(redis_client: redis.Redis, user_id: str) -> bool:
    try:
        return bool(redis_client.exists(_redis_key_lockout(user_id)))
    except Exception:
        return False


def _register_failed_attempt(redis_client: redis.Redis, user_id: str) -> None:
    """Incrémente les échecs dans la fenêtre ; applique lockout si seuil dépassé."""
    try:
        k = _redis_key_fail(user_id)
        n = redis_client.incr(k)
        if n == 1:
            redis_client.expire(k, _STEP_UP_FAIL_WINDOW_SEC)
        if n >= _STEP_UP_MAX_FAILS_PER_WINDOW:
            redis_client.setex(_redis_key_lockout(user_id), _STEP_UP_LOCKOUT_SEC, "1")
    except Exception as e:
        logger.warning("step_up redis fail counter error user_id=%s err=%s", user_id, type(e).__name__)


def _clear_fail_window(redis_client: redis.Redis, user_id: str) -> None:
    try:
        redis_client.delete(_redis_key_fail(user_id))
    except Exception:
        pass


def verify_step_up_pin_header(
    *,
    user: User,
    pin_header_value: Optional[str],
    redis_client: redis.Redis,
    operation: str,
) -> None:
    """
    Vérifie la preuve PIN step-up pour l'utilisateur courant (mutation).

    - Aucune valeur de PIN dans les logs.
    - Refus explicite si en-tête absent ou invalide (pas de confiance UI).
    """
    uid = str(user.id)
    if _is_locked_out(redis_client, uid):
        logger.warning(
            "step_up_pin_locked operation=%s user_id=%s",
            operation,
            uid,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "STEP_UP_LOCKED",
                "message": "Trop de tentatives PIN step-up ; réessayez plus tard.",
            },
        )

    if not pin_header_value or not pin_header_value.strip():
        logger.warning(
            "step_up_pin_missing operation=%s user_id=%s",
            operation,
            uid,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "STEP_UP_PIN_REQUIRED",
                "message": "En-tête X-Step-Up-Pin requis pour cette opération.",
            },
        )

    pin_plain = pin_header_value.strip()
    if not user.hashed_pin:
        logger.warning(
            "step_up_pin_not_configured operation=%s user_id=%s",
            operation,
            uid,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "STEP_UP_PIN_NOT_CONFIGURED",
                "message": "Aucun PIN défini pour cet utilisateur ; configurez un PIN avant cette opération.",
            },
        )

    if not verify_password(pin_plain, user.hashed_pin):
        _register_failed_attempt(redis_client, uid)
        logger.warning(
            "step_up_pin_invalid operation=%s user_id=%s",
            operation,
            uid,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "STEP_UP_PIN_INVALID",
                "message": "PIN step-up invalide.",
            },
        )

    _clear_fail_window(redis_client, uid)
    logger.info(
        "step_up_pin_ok operation=%s user_id=%s",
        operation,
        uid,
    )
