"""
Stockage Redis des réponses idempotentes (Story 2.4) — mutations sensibles.

Clé : utilisateur + périmètre métier + Idempotency-Key ; TTL limité.
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any, Dict, Optional, Tuple

import redis
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

_IDEMPOTENCY_TTL_SEC = 86400
_MAX_IDEMPOTENCY_KEY_LEN = 128


def _norm_key_part(s: str) -> str:
    return s.strip()[:_MAX_IDEMPOTENCY_KEY_LEN]


def body_fingerprint_close_json(payload: Dict[str, Any]) -> str:
    """Empreinte stable du corps de fermeture de session (ordre de clés fixe)."""
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def redis_key_idempotent_close(user_id: str, session_id: str, idempotency_key: str) -> str:
    ik = _norm_key_part(idempotency_key)
    return f"idem:v1:close:{user_id}:{session_id}:{ik}"


def get_cached_idempotent_close(
    redis_client: redis.Redis, redis_key: str
) -> Optional[Dict[str, Any]]:
    try:
        raw = redis_client.get(redis_key)
        if not raw:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.warning("idempotency get failed key=%s err=%s", redis_key, type(e).__name__)
        return None


def validate_or_raise_idempotency_conflict(
    cached: Dict[str, Any], body_fp: str
) -> Tuple[int, Dict[str, Any]]:
    """
    Si une entrée existe déjà, exige la même empreinte de corps ; sinon 409.
    Retourne (status_code, body) à rejouer.
    """
    prev_fp = cached.get("body_fingerprint")
    if prev_fp != body_fp:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "IDEMPOTENCY_KEY_CONFLICT",
                "message": "Idempotency-Key déjà utilisé avec un corps différent.",
            },
        )
    return int(cached["status_code"]), cached["body"]


def store_idempotent_close(
    redis_client: redis.Redis,
    redis_key: str,
    body_fp: str,
    status_code: int,
    response_body: Dict[str, Any],
) -> None:
    try:
        payload = {
            "body_fingerprint": body_fp,
            "status_code": status_code,
            "body": response_body,
        }
        redis_client.setex(redis_key, _IDEMPOTENCY_TTL_SEC, json.dumps(payload))
    except Exception as e:
        logger.warning("idempotency set failed key=%s err=%s", redis_key, type(e).__name__)
