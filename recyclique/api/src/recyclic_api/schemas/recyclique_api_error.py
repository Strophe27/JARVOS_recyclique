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


_POLICY_DETAIL_KEYS = frozenset(
    {
        "policy_reason_code",
        "policy_version",
        "cash_session_id",
        "site_id",
        "blocking_outbox_item_id",
        "mapping_resolution_code",
    }
)


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

    Story 8.6 : champs optionnels ``policy_*`` / ``blocking_*`` / ``mapping_resolution_code``
    propagés depuis le dict HTTPException pour le refus politique A1.
    """
    if isinstance(detail, dict) and "code" in detail:
        msg = detail.get("message")
        if msg is None:
            msg = normalize_http_exception_detail(detail)
        elif not isinstance(msg, str):
            msg = str(msg)
        rid = (correlation_id or "").strip() or str(detail.get("correlation_id") or "").strip()
        kwargs: dict[str, Any] = {
            "code": str(detail["code"]),
            "detail": msg,
            "retryable": retryable_for_status(status_code),
            "state": None,
            "correlation_id": rid,
        }
        for k in _POLICY_DETAIL_KEYS:
            if k in detail:
                kwargs[k] = detail[k]
        return RecycliqueApiError(**kwargs)
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
    policy_reason_code: str | None = Field(
        None,
        description="Story 8.6 — sous-code stable si refus politique sync (A1)",
    )
    policy_version: str | None = Field(None, description="Version documentée de la politique 8.6")
    cash_session_id: str | None = Field(None, description="Session caisse concernée (A1)")
    site_id: str | None = Field(None, description="Site concerné (A1)")
    blocking_outbox_item_id: str | None = Field(
        None,
        description="Ligne outbox bloquante si quarantaine (A1)",
    )
    mapping_resolution_code: str | None = Field(
        None,
        description="Code résolution mapping 8.3 si refus pour mapping (A1)",
    )

    model_config = {"json_schema_extra": {"example": {
        "code": "UNAUTHORIZED",
        "detail": "Not authenticated",
        "retryable": False,
        "state": None,
        "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
    }}}
