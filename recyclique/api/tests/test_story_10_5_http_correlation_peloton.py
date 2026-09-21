"""Story 10.5 — corrélation HTTP exploitable sur les routes du peloton 10.4 (NFR8)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from recyclic_api.core.config import settings

_V1 = settings.API_V1_STR.rstrip("/")


def _assert_peloton_error_correlation(response, request_id: str) -> None:
    assert response.status_code >= 400
    assert response.headers.get("X-Request-Id") == request_id
    body = response.json()
    assert isinstance(body.get("correlation_id"), str)
    assert body["correlation_id"] == request_id
    assert "code" in body
    assert "detail" in body
    assert "retryable" in body


@pytest.mark.parametrize(
    ("label", "method", "path", "json_body"),
    [
        ("module_chain", "GET", f"{_V1}/users/me/context", None),
        (
            "caisse_nominal",
            "POST",
            f"{_V1}/sales/",
            {
                "cash_session_id": str(uuid.uuid4()),
                "items": [],
                "total_amount": 0.0,
            },
        ),
        ("reception_nominal", "POST", f"{_V1}/reception/postes/open", None),
    ],
)
def test_peloton_routes_error_envelope_correlates_request_id(
    client: TestClient,
    label: str,
    method: str,
    path: str,
    json_body: dict | None,
) -> None:
    """Erreurs contrôlées (non authentifié) : correlation_id == X-Request-Id."""
    request_id = f"peloton-10-5-{label}-{uuid.uuid4()}"
    headers = {"X-Request-Id": request_id}
    if method == "GET":
        response = client.get(path, headers=headers)
    else:
        response = client.post(path, json=json_body or {}, headers=headers)
    _assert_peloton_error_correlation(response, request_id)


def test_sync_sensitive_admin_timeline_unauthenticated_correlates_request_id(
    client: TestClient,
) -> None:
    """sync_sensitive : timeline admin sans auth → enveloppe + corrélation."""
    request_id = f"peloton-10-5-sync-{uuid.uuid4()}"
    response = client.get(
        f"{_V1}/admin/paheko-outbox/by-correlation/corr-10-5-deny",
        headers={"X-Request-Id": request_id},
    )
    assert response.status_code in (401, 403)
    _assert_peloton_error_correlation(response, request_id)
