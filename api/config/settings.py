# RecyClique API — Configuration (Pydantic Settings).
# Pas de secrets en dur : variables d'environnement ou .env à la racine du repo.
# NFR-S2 : config JWT (secret, durées) via env.
# Story 4.1 : canal push Paheko (endpoint, secret, résilience) — NFR-S1, NFR-S2, FR19.

from functools import lru_cache
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str | None = None
    redis_url: str | None = None

    # JWT (NFR-S2 — secrets en env)
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # Bootstrap premier admin (onboarding local v1)
    first_admin_username: str | None = None
    first_admin_email: str | None = None
    first_admin_password: SecretStr | None = None
    first_admin_first_name: str = "Admin"
    first_admin_last_name: str = "System"

    # OIDC / BFF session (Story 12.2)
    oidc_enabled: bool = False
    oidc_issuer: str | None = None
    oidc_client_id: str | None = None
    oidc_client_secret: SecretStr | None = None
    oidc_redirect_uri: str | None = None
    oidc_audience: str | None = None
    oidc_scope: str = "openid profile email"
    oidc_authorization_endpoint: str | None = None
    oidc_token_endpoint: str | None = None
    oidc_jwks_uri: str | None = None
    oidc_end_session_endpoint: str | None = None
    oidc_allowed_algs_csv: str = "RS256"
    oidc_allowed_tenants_csv: str | None = None
    oidc_http_timeout_seconds: float = 10.0
    oidc_fail_closed_strict: bool = True

    # Cookie de session applicative BFF
    auth_session_cookie_name: str = "recyclique_session"
    auth_session_cookie_secure: bool = False
    auth_session_cookie_samesite: str = "lax"
    auth_session_cookie_max_age_seconds: int = 28800

    # Canal push Paheko (Story 4.1 — NFR-S1, NFR-S2)
    # URL du plugin Paheko (ex. https://paheko.example/plugin/recyclic/push)
    paheko_plugin_url: str | None = None
    # URL optionnelle de la surface IAM plugin (sinon derivee de paheko_plugin_url).
    paheko_iam_plugin_url: str | None = None
    # Secret partagé pour signer/authentifier les requêtes ; ne pas mettre de valeur par défaut en prod.
    paheko_plugin_secret: SecretStr | None = None
    # Résilience (FR19) : nombre max de tentatives d'envoi d'un message vers Paheko.
    paheko_push_max_retries: int = 5
    # Délai initial (secondes) avant la première retentative.
    paheko_push_backoff_seconds: float = 1.0
    # Facteur d'exponentiel entre chaque retentative (délai = backoff_seconds * factor^tentative).
    paheko_push_backoff_factor: float = 2.0

    # Story 4.2 : nom du stream Redis pour la file push caisse (événements pos.ticket.created, etc.).
    redis_stream_push_caisse: str = "recyclic:push:caisse"

    # Story 12.3 : sync membres Paheko -> extension locale RecyClique (phase 1).
    paheko_api_base_url: str | None = None
    paheko_api_token: SecretStr | None = None
    paheko_members_endpoint: str = "/api/members"
    paheko_members_page_size: int = 100
    paheko_members_max_retries: int = 3
    paheko_members_backoff_seconds: float = 1.0
    paheko_members_backoff_factor: float = 2.0
    paheko_members_sync_scheduler_enabled: bool = False
    paheko_members_sync_interval_seconds: int = 300

    # Story 9.2 : chemin optionnel vers le fichier modules.toml (env MODULES_CONFIG_PATH)
    modules_config_path: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
