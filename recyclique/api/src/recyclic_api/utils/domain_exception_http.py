"""
Traduction des exceptions métier (domaine) vers FastAPI HTTPException.

Les codes HTTP sont fournis par l'appelant pour respecter les contrats par route
(ex. réception : Conflict → 409 ; caisse : Conflict → 400).
"""

from __future__ import annotations

from typing import NoReturn

from fastapi import HTTPException

from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError


def raise_domain_exception_as_http(
    exc: NotFoundError | ConflictError | ValidationError,
    *,
    not_found_status: int,
    conflict_status: int,
    validation_status: int,
) -> NoReturn:
    """Lève HTTPException avec le bon statut et le même détail qu'aujourd'hui en routes."""
    if isinstance(exc, NotFoundError):
        raise HTTPException(status_code=not_found_status, detail=str(exc)) from exc
    if isinstance(exc, ConflictError):
        raise HTTPException(status_code=conflict_status, detail=exc.detail) from exc
    if isinstance(exc, ValidationError):
        raise HTTPException(status_code=validation_status, detail=str(exc)) from exc
    raise TypeError(f"Exception métier non prise en charge: {type(exc)!r}")  # pragma: no cover
