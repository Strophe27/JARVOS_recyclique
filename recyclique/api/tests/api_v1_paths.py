"""
Chemins API version 1 pour les tests.

Doit rester aligné sur ``recyclic_api.core.config.Settings.API_V1_STR`` (défaut ``/v1``).
L'app monte le routeur sous ce préfixe dans ``main.py`` ; ``/api/v1/...`` n'existe pas
et renvoie 404 côté TestClient.
"""

from recyclic_api.core.config import settings

API_V1_PREFIX: str = settings.API_V1_STR.rstrip("/") or "/v1"


def v1(path: str) -> str:
    """Construit l'URL complète sous le préfixe v1 (ex. ``v1("/sales/")`` -> ``/v1/sales/``)."""
    suffix = path if path.startswith("/") else f"/{path}"
    return f"{API_V1_PREFIX}{suffix}"


def browser_api_to_testclient_path(path: str) -> str:
    """Convertit une URL relative navigateur (`/api/v1/...`) en chemin TestClient (`/v1/...`)."""
    if path.startswith("/api/"):
        return path[4:]
    if path == "/api":
        return "/"
    return path
