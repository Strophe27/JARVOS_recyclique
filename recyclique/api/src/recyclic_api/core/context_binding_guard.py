"""
Story 25.8 — liaison optionnelle client ↔ vérité serveur du ContextEnvelope.

Si le client envoie les en-têtes de contexte, ils doivent correspondre à l'enveloppe
autoritaire courante (refus explicite après bascule site / session observable côté UI).
Valeurs non UUID là où un UUID est attendu : **400** ``VALIDATION_ERROR`` (pas **409**
``CONTEXT_STALE``, réservé au désalignement avec des UUID bien formés).
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
CONTEXT_VALIDATION_CODE = "VALIDATION_ERROR"


def _norm_uuid_str(value: str) -> str:
    return value.strip().lower()


def _reject_malformed_uuid_header(raw: str, *, header_label: str) -> None:
    """Si la valeur est non vide, elle doit être un UUID — sinon 400 (Story 25.8 / QA2)."""
    if not raw:
        return
    try:
        uuid.UUID(raw.strip())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": CONTEXT_VALIDATION_CODE,
                "message": (
                    f"L'en-tête {header_label} doit contenir un UUID valide lorsqu'il est présent."
                ),
            },
        ) from exc


def enforce_optional_client_context_binding(request: Request, db: Session, user_id: uuid.UUID) -> None:
    """
    En-têtes optionnels (rétrocompat) : si présents, comparer à ``build_context_envelope``.

    Raises:
        HTTPException: 400 si en-tête mal formé (non-UUID) ; 409 avec ``detail`` dict
        ``code`` / ``message`` (enveloppe AR21) si désalignement.
    """
    raw_site = (request.headers.get(HEADER_CONTEXT_SITE_ID) or "").strip()
    raw_session = (request.headers.get(HEADER_CONTEXT_CASH_SESSION_ID) or "").strip()
    _reject_malformed_uuid_header(raw_site, header_label=HEADER_CONTEXT_SITE_ID)
    _reject_malformed_uuid_header(raw_session, header_label=HEADER_CONTEXT_CASH_SESSION_ID)
    if not raw_site and not raw_session:
        return

    env = build_context_envelope(db, user_id)
    ctx = env.context
    truth_site = _norm_uuid_str(str(ctx.site_id)) if ctx and ctx.site_id else ""
    truth_session = _norm_uuid_str(str(ctx.cash_session_id)) if ctx and ctx.cash_session_id else ""

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


def enforce_optional_client_context_binding_from_claim(request: Request, db: Session, user_id: str) -> None:
    """
    Comme ``enforce_optional_client_context_binding``, mais avec ``sub`` JWT en chaîne.

    Si des en-têtes ``X-Recyclique-Context-*`` sont envoyés et que ``sub`` n'est pas un UUID
    exploitable, **400** — le client ne peut pas corréler l'enveloppe serveur (Story 25.8 / QA2).
    Sans en-têtes, retour silencieux même si ``sub`` est atypique (les routes métier gèrent l'auth).
    """
    raw_site = (request.headers.get(HEADER_CONTEXT_SITE_ID) or "").strip()
    raw_session = (request.headers.get(HEADER_CONTEXT_CASH_SESSION_ID) or "").strip()
    if not raw_site and not raw_session:
        return
    try:
        uid = uuid.UUID(str(user_id).strip())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": CONTEXT_VALIDATION_CODE,
                "message": (
                    "Les en-têtes X-Recyclique-Context-Site-Id ou X-Recyclique-Context-Cash-Session-Id "
                    "exigent un identifiant utilisateur (sub JWT) au format UUID pour comparer "
                    "l'enveloppe serveur."
                ),
            },
        ) from exc
    enforce_optional_client_context_binding(request, db, uid)
