"""
Tests d'intégration pour l'endpoint de découverte des modèles LLM OpenRouter
utilisé par l'import legacy.
"""

from __future__ import annotations

from typing import Any, Dict

import httpx
import pytest


def test_llm_models_requires_admin(client) -> None:
    """L'endpoint doit être protégé par rôle ADMIN / SUPER_ADMIN."""
    response = client.get("/api/v1/admin/import/legacy/llm-models")

    # 401 (non authentifié) ou 403 (auth mais pas admin) sont acceptables.
    assert response.status_code in {401, 403}


def test_llm_models_nominal(admin_client, monkeypatch: pytest.MonkeyPatch) -> None:
    """Cas nominal : OpenRouter retourne une liste de modèles texte."""

    class DummyResponse:
        def __init__(self, payload: Dict[str, Any]) -> None:
            self._payload = payload

        def json(self) -> Dict[str, Any]:  # type: ignore[override]
            return self._payload

        def raise_for_status(self) -> None:  # type: ignore[override]
            return None

    class DummyClient:
        def __init__(self, payload: Dict[str, Any]) -> None:
            self._payload = payload
            self.last_url: str | None = None

        def get(self, url: str, headers: Dict[str, str]) -> DummyResponse:  # type: ignore[override]
            self.last_url = url
            return DummyResponse(self._payload)

        def __enter__(self) -> "DummyClient":
            return self

        def __exit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
            return None

    payload = {
        "data": [
            {
                "id": "mistralai/mistral-7b-instruct:free",
                "name": "Mistral 7B Instruct",
                "pricing": {"prompt": "0", "completion": "0"},
                "context_length": 8192,
                "architecture": {"modality": "text"},
            },
            {
                # Modèle non texte, ne doit pas apparaître dans la réponse.
                "id": "some/vision-model",
                "name": "Vision Model",
                "pricing": {"prompt": "0.01", "completion": "0.02"},
                "context_length": 4096,
                "architecture": {"modality": "vision"},
            },
        ]
    }

    dummy_client = DummyClient(payload)

    def fake_client(*args: Any, **kwargs: Any) -> DummyClient:  # type: ignore[override]
        return dummy_client

    monkeypatch.setattr(httpx, "Client", fake_client)  # type: ignore[arg-type]

    response = admin_client.get("/api/v1/admin/import/legacy/llm-models")

    assert response.status_code == 200, response.text
    data = response.json()

    assert "models" in data
    assert data.get("error") is None
    assert len(data["models"]) == 1

    model = data["models"][0]
    assert model["id"] == "mistralai/mistral-7b-instruct:free"
    # Le nom doit être enrichi avec le suffixe (Free)
    assert "Mistral 7B Instruct" in model["name"]
    assert "(Free)" in model["name"]
    assert model["is_free"] is True
    assert model["provider"] == "mistralai"


def test_llm_models_openrouter_unavailable_returns_error(
    admin_client, monkeypatch: pytest.MonkeyPatch
) -> None:
    """En cas d'erreur réseau, l'endpoint doit retourner une liste vide et un message d'erreur."""

    class FailingClient:
        def __init__(self) -> None:
            self.called = False

        def get(self, *args: Any, **kwargs: Any) -> httpx.Response:  # type: ignore[override]
            self.called = True
            raise httpx.RequestError("network down")

        def __enter__(self) -> "FailingClient":
            return self

        def __exit__(self, exc_type, exc, tb) -> None:  # type: ignore[override]
            return None

    def fake_client(*args: Any, **kwargs: Any) -> FailingClient:  # type: ignore[override]
        return FailingClient()

    monkeypatch.setattr(httpx, "Client", fake_client)  # type: ignore[arg-type]

    response = admin_client.get("/api/v1/admin/import/legacy/llm-models")

    assert response.status_code == 200, response.text
    data = response.json()

    assert data["models"] == []
    assert data["error"] is not None







