"""Tests unitaires pour la traduction exceptions métier → HTTP."""

import pytest
from fastapi import HTTPException

from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.utils.domain_exception_http import raise_domain_exception_as_http


def test_not_found_maps_status_string_detail_and_chains_cause():
    exc = NotFoundError("ressource absente")
    with pytest.raises(HTTPException) as ctx:
        raise_domain_exception_as_http(
            exc,
            not_found_status=404,
            conflict_status=409,
            validation_status=400,
        )
    assert ctx.value.status_code == 404
    assert ctx.value.detail == "ressource absente"
    assert ctx.value.__cause__ is exc


def test_conflict_preserves_exc_detail_for_http_payload():
    with pytest.raises(HTTPException) as ctx:
        raise_domain_exception_as_http(
            ConflictError({"detail": "structured"}),
            not_found_status=404,
            conflict_status=400,
            validation_status=400,
        )
    assert ctx.value.status_code == 400
    assert ctx.value.detail == {"detail": "structured"}


def test_validation_status_is_configurable_per_route():
    with pytest.raises(HTTPException) as ctx:
        raise_domain_exception_as_http(
            ValidationError("entrée invalide"),
            not_found_status=404,
            conflict_status=409,
            validation_status=422,
        )
    assert ctx.value.status_code == 422
    assert ctx.value.detail == "entrée invalide"
