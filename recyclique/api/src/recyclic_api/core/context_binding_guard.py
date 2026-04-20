"""
Story 25.8 — liaison optionnelle client ↔ vérité serveur du ContextEnvelope.

Si le client envoie les en-têtes de contexte, ils doivent correspondre à l'enveloppe
autoritaire courante (refus explicite après bascule site / session observable côté UI).
Hors périmètre : file offline PWA, matrice step-up complète (stories 25.14 / 13.8).
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from recyclic_api.services.context_envelope_service import build_context_envelope

HEADER_CONTEXT_SITE_ID = "X-Recyclique-Context-Site-Id"
HEADER_CONTEXT_CASH_SESSION_ID = "X-Recyclique-Context-Cash-Session-Id"

CONTEXT_STALE_CODE = "CONTEXT_STALE"


def _norm_uuid_str(value: str) -> str:
    return value.strip().lower()


def enforce_optional_client_context_binding(request: Request, db: Session, user_id: uuid.UUID) -> None:
    """
    En-têtes optionnels (rétrocompat) : si présents, comparer à ``build_context_envelope``.

    Raises:
        HTTPException: 409 avec ``detail`` dict ``code`` / ``message`` (enveloppe AR21).
    """
    raw_site = (request.headers.get(HEADER_CONTEXT_SITE_ID) or "").strip()
    raw_session = (request.headers.get(HEADER_CONTEXT_CASH_SESSION_ID) or "").strip()
    if not raw_site and not raw_session:
        return

    env = build_context_envelope(db, user_id)
    ctx = env.context
    truth_site = _norm_uuid_str(ctx.site_id) if ctx and ctx.site_id else ""
    truth_session = _norm_uuid_str(ctx.cash_session_id) if ctx and ctx.cash_session_id else ""

    if raw_site:
        if _norm_uuid_str(raw_site) != truth_site:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": CONTEXT_STALE_CODE,
                    "message": (
                        "Le site annoncé par le client ne correspond plus au contexte serveur — "
                        "rafraîchir l'enveloppe (POST /v1/users/me/context/refresh) puis réessayer."
                    ),
                },
            )
    if raw_session:
        if _norm_uuid_str(raw_session) != truth_session:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": CONTEXT_STALE_CODE,
                    "message": (
                        "La session caisse annoncée par le client ne correspond plus au contexte serveur — "
                        "rafraîchir l'enveloppe puis réessayer."
                    ),
                },
            )
