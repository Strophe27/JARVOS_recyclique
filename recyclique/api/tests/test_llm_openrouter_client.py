"""
Tests unitaires pour OpenRouterCategoryMappingClient (B47-P5).

On mocke httpx pour éviter tout appel réseau réel.
"""

from __future__ import annotations

from typing import Any, Dict

import httpx
import pytest

from recyclic_api.services.llm_openrouter_client import OpenRouterCategoryMappingClient


class DummyResponse:
    """Réponse factice pour simuler httpx.Response.json()."""

    def __init__(self, payload: Dict[str, Any]) -> None:
        self._payload = payload

    def json(self) -> Dict[str, Any]:  # type: ignore[override]
        return self._payload


class DummyHTTPXClient:
    """Client httpx factice pour tester la logique sans réseau."""

    def __init__(self, response_payload: Dict[str, Any]) -> None:
        self._response_payload = response_payload
        self.last_request: Dict[str, Any] | None = None

    def post(self, url: str, json: Dict[str, Any], headers: Dict[str, str]) -> DummyResponse:  # type: ignore[override]
        self.last_request = {"url": url, "json": json, "headers": headers}
        # Simuler un schéma OpenAI-like
        return DummyResponse(self._response_payload)

    def __enter__(self) -> "DummyHTTPXClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
        return None


def test_openrouter_client_nominal(monkeypatch: pytest.MonkeyPatch) -> None:
    """Cas nominal : le client retourne des mappings correctement parsés."""

    payload = {
        "choices": [
            {
                "message": {
                    "content": {
                        "mappings": {
                            "Vaisselle cassée": {
                                "target_name": "Vaisselle",
                                "confidence": 92.5,
                            }
                        }
                    }
                }
            }
        ]
    }

    dummy_client = DummyHTTPXClient(payload)

    def fake_client(*args: Any, **kwargs: Any) -> DummyHTTPXClient:  # type: ignore[override]
        return dummy_client

    monkeypatch.setattr(httpx, "Client", fake_client)  # type: ignore[arg-type]

    client = OpenRouterCategoryMappingClient(
        api_key="test-key",
        model="mistral-7b-instruct",
        base_url="https://openrouter.ai/api/v1",
    )

    result = client.suggest_mappings(
        unmapped=["Vaisselle cassée"],
        known_categories=["Vaisselle", "DEEE"],
    )

    assert "Vaisselle cassée" in result
    mapping = result["Vaisselle cassée"]
    assert mapping["target_name"] == "Vaisselle"
    assert 0 <= mapping["confidence"] <= 100


def test_openrouter_client_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    """Réponse mal formée : le client doit retourner un dict vide."""

    class BadResponse:
        def json(self) -> Dict[str, Any]:  # type: ignore[override]
            raise ValueError("invalid json")

    class BadClient:
        def post(self, *args: Any, **kwargs: Any) -> BadResponse:  # type: ignore[override]
            return BadResponse()

        def __enter__(self) -> "BadClient":
            return self

        def __exit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
            return None

    def fake_client(*args: Any, **kwargs: Any) -> BadClient:  # type: ignore[override]
        return BadClient()

    monkeypatch.setattr(httpx, "Client", fake_client)  # type: ignore[arg-type]

    client = OpenRouterCategoryMappingClient(
        api_key="test-key",
        model="mistral-7b-instruct",
        base_url="https://openrouter.ai/api/v1",
    )

    result = client.suggest_mappings(
        unmapped=["Catégorie inconnue"],
        known_categories=["Vaisselle"],
    )

    assert result == {}



