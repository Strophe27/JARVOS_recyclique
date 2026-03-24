"""Verrouillages ciblés : FRONTEND_URL / CORS (pas de localhost implicite hors dev)."""

from recyclic_api.core.config import (
    _DEV_CORS_FALLBACK_ORIGINS,
    get_cors_allow_origins,
    get_effective_frontend_url,
    settings,
)


def test_effective_frontend_url_dev_fallback_when_empty(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    assert get_effective_frontend_url() == "http://localhost:4444"


def test_effective_frontend_url_prod_empty_no_localhost(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert get_effective_frontend_url() == ""


def test_effective_frontend_url_explicit_always_used(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://app.example.com/")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert get_effective_frontend_url() == "https://app.example.com"


def test_cors_dev_empty_list_uses_fallback_origins(monkeypatch):
    monkeypatch.setattr(settings, "BACKEND_CORS_ORIGINS", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "FRONTEND_URL", "")
    assert get_cors_allow_origins() == list(_DEV_CORS_FALLBACK_ORIGINS)


def test_cors_production_empty_no_silent_localhost_from_frontend(monkeypatch):
    monkeypatch.setattr(settings, "BACKEND_CORS_ORIGINS", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "FRONTEND_URL", "")
    assert get_cors_allow_origins() == []
