"""Enveloppe d'erreur JSON stable (AR21) — alignée sur contracts/openapi/recyclique-api.yaml."""

from __future__ import annotations

import json
from typing import Any

from typing import Any, List, Union

from pydantic import BaseModel, Field


def http_status_to_error_code(status_code: int) -> str:
    return {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT",
    }.get(status_code, f"HTTP_{status_code}")


def retryable_for_status(status_code: int) -> bool:
    return status_code in (429, 502, 503, 504)


def normalize_http_exception_detail(detail: Any) -> str:
    if isinstance(detail, str):
        return detail
    try:
        return json.dumps(detail, ensure_ascii=False)
    except (TypeError, ValueError):
        return str(detail)


def recyclique_api_error_from_http_exception(
    *,
    status_code: int,
    detail: Any,
    correlation_id: str,
) -> RecycliqueApiError:
    """
    Construit l'enveloppe à partir d'une HTTPException Starlette/FastAPI.

    Si ``detail`` est un dict avec une clé ``code`` (step-up, idempotence, etc.),
    ce code devient le champ ``code`` de l'enveloppe et ``message`` le ``detail`` texte.
    Sinon : ``code`` dérivé du statut HTTP et ``detail`` normalisé en chaîne.
    """
    if isinstance(detail, dict) and "code" in detail:
        msg = detail.get("message")
        if msg is None:
            msg = normalize_http_exception_detail(detail)
        elif not isinstance(msg, str):
            msg = str(msg)
        return RecycliqueApiError(
            code=str(detail["code"]),
            detail=msg,
            retryable=retryable_for_status(status_code),
            state=None,
            correlation_id=correlation_id,
        )
    return RecycliqueApiError(
        code=http_status_to_error_code(status_code),
        detail=normalize_http_exception_detail(detail),
        retryable=retryable_for_status(status_code),
        state=None,
        correlation_id=correlation_id,
    )


class RecycliqueApiError(BaseModel):
    """Corps JSON pour HTTPException, validation et erreurs métier (snake_case, AR21)."""

    code: str = Field(..., description="Code machine stable")
    detail: Union[str, List[Any]] = Field(
        ...,
        description="Message principal (string) ou liste d'erreurs Pydantic (422)",
    )
    retryable: bool = Field(..., description="Indique si un nouvel essai peut réussir")
    state: str | None = Field(None, description="État opérationnel optionnel")
    correlation_id: str = Field(..., description="Aligné sur X-Request-Id")

    model_config = {"json_schema_extra": {"example": {
        "code": "UNAUTHORIZED",
        "detail": "Not authenticated",
        "retryable": False,
        "state": None,
        "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
    }}}
