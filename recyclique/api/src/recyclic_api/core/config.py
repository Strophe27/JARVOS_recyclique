from pydantic_settings import BaseSettings
from pydantic import ConfigDict, Field, AliasChoices
import os
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    TEST_DATABASE_URL: str | None = None
    REDIS_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # API
    API_V1_STR: str = "/v1"
    ROOT_PATH: str = ""
    PROJECT_NAME: str = "Recyclic API"
    # Semver produit (Dockerfile ARG APP_VERSION, surcharge compose `environment`)
    APP_VERSION: str = "1.4.4"
    
    # Environment
    ENVIRONMENT: str = "development"
    ECOLOGIC_EXPORT_DIR: str = "/app/exports"

    # Origines CORS (comma-separated). Les deux noms d'env sont acceptés pour alignement compose / .env.
    BACKEND_CORS_ORIGINS: str = Field(
        default="",
        validation_alias=AliasChoices("BACKEND_CORS_ORIGINS", "CORS_ALLOW_ORIGINS"),
    )
    # Base URL du frontend (liens e-mail, reset mot de passe, etc.).
    # Pas de défaut localhost ici : en prod/staging, une valeur explicite est requise (voir get_effective_frontend_url).
    FRONTEND_URL: str = ""

    # Paheko — intégration comptable outbound (Epic 8, Story 8.1+). 12-factor : pas de secrets en dur.
    PAHEKO_API_BASE_URL: str = ""
    # Auth canonique alignée doc Paheko : HTTP Basic Auth (clé/login + secret/mot de passe).
    PAHEKO_API_USER: str | None = None
    PAHEKO_API_PASSWORD: str | None = None
    # Compat legacy : Bearer token encore accepté transitoirement si Basic n'est pas configuré.
    PAHEKO_API_TOKEN: str | None = None
    PAHEKO_HTTP_TIMEOUT_SECONDS: float = 15.0
    # Chemin relatif à PAHEKO_API_BASE_URL pour le slice clôture caisse.
    # Par défaut on vise l'endpoint officiel Paheko de création d'écriture comptable.
    PAHEKO_ACCOUNTING_CASH_SESSION_CLOSE_PATH: str = "/api/accounting/transaction"
    # Story 8.3 : fusion ``destination_params`` (table ``paheko_cash_session_close_mappings``) dans le POST — pas de secrets ici.
    # Outbox — retry / plafond (Story 8.2, AR11 at-least-once)
    PAHEKO_OUTBOX_MAX_ATTEMPTS: int = 8
    PAHEKO_OUTBOX_RETRY_BASE_SECONDS: float = 2.0
    PAHEKO_OUTBOX_RETRY_MAX_SECONDS: float = 900.0

    # kDrive Sync
    KDRIVE_WEBDAV_URL: str | None = None
    KDRIVE_WEBDAV_USERNAME: str | None = None
    KDRIVE_WEBDAV_PASSWORD: str | None = None
    KDRIVE_REMOTE_BASE_PATH: str = '/Recyclic/exports'
    KDRIVE_SYNC_ENABLED: bool = False
    KDRIVE_SYNC_INTERVAL_SECONDS: int = 3600
    KDRIVE_RETRY_DELAY_SECONDS: float = 5.0
    KDRIVE_MAX_RETRIES: int = 3

    # Cash Session Reports
    CASH_SESSION_REPORT_DIR: str = '/app/reports/cash_sessions'
    CASH_SESSION_REPORT_RECIPIENT: str | None = None
    CASH_SESSION_REPORT_TOKEN_TTL_SECONDS: int = 900
    CASH_SESSION_REPORT_RETENTION_DAYS: int = 30

    # Legacy Import - LLM Fallback (B47-P5)
    # Provider à utiliser pour le fallback LLM sur les catégories legacy.
    # Exemples : "openrouter", "none" (par défaut = désactivé).
    LEGACY_IMPORT_LLM_PROVIDER: str | None = None
    # Identifiant du modèle LLM à utiliser (dépend du provider).
    LEGACY_IMPORT_LLM_MODEL: str | None = None
    # Taille de batch maximale pour l'envoi de catégories non mappées au LLM.
    LEGACY_IMPORT_LLM_BATCH_SIZE: int = 20

    # Clé API OpenRouter (si LEGACY_IMPORT_LLM_PROVIDER = "openrouter").
    OPENROUTER_API_KEY: str | None = None
    # URL de base de l'API OpenRouter (surchargable pour tests / mocks).
    OPENROUTER_API_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Email Service

    BREVO_API_KEY: str | None = None
    BREVO_WEBHOOK_SECRET: str | None = None
    EMAIL_FROM_NAME: str = "Recyclic"
    EMAIL_FROM_ADDRESS: str = "noreply@recyclic.fr"

    # Reception Live Stats Feature Flag
    LIVE_RECEPTION_STATS_ENABLED: bool = True

    # Session web v2 (Epic 2.1) — cookies httpOnly same-origin ; Bearer JSON inchangé par défaut
    WEB_SESSION_ACCESS_COOKIE_NAME: str = "recyclique_access"
    WEB_SESSION_REFRESH_COOKIE_NAME: str = "recyclique_refresh"
    WEB_SESSION_COOKIE_PATH: str = "/"
    WEB_SESSION_COOKIE_SAMESITE: str = "lax"
    
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

# Repli CORS uniquement pour dev / test local quand aucune liste n'est fournie via l'environnement.
_DEV_CORS_FALLBACK_ORIGINS: tuple[str, ...] = (
    "http://localhost:3000",
    "http://frontend:3000",
    "http://localhost:4444",
)

# Repli FRONTEND_URL uniquement pour dev / test local (évite les liens localhost implicites en prod).
_DEV_FRONTEND_URL_FALLBACK: str = "http://localhost:4444"


def _is_dev_like_environment() -> bool:
    env_lower = (settings.ENVIRONMENT or "").lower()
    return env_lower in ("development", "dev", "local", "test")


def get_effective_frontend_url() -> str:
    """Base URL frontend sans slash final.

    Si FRONTEND_URL est vide : repli localhost uniquement pour development/dev/local/test.
    En production, staging, etc. : chaîne vide (pas de localhost silencieux).
    """
    raw = (settings.FRONTEND_URL or "").strip().rstrip("/")
    if raw:
        return raw
    if _is_dev_like_environment():
        return _DEV_FRONTEND_URL_FALLBACK.rstrip("/")
    return ""


def get_browser_api_v1_prefix() -> str:
    """Préfixe API relatif utilisable tel quel depuis le navigateur.

    En dev local, le front live (`localhost:4444`) ne proxifie que `/api/*`.
    Si l'API interne est configurée en `/v1`, on expose donc `/api/v1` aux clients
    navigateur pour éviter qu'une navigation sur `/v1/...` ne retombe sur la SPA.
    """
    prefix = settings.API_V1_STR.rstrip("/")
    if not prefix:
        return "/api"
    if prefix.startswith("/api/") or prefix == "/api":
        return prefix
    return f"/api{prefix}"


def get_cors_allow_origins() -> list[str]:
    """Liste des origines CORS effectives (Settings + repli dev/test si chaîne vide)."""
    raw = (settings.BACKEND_CORS_ORIGINS or "").strip()
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    if _is_dev_like_environment():
        return list(_DEV_CORS_FALLBACK_ORIGINS)
    base = get_effective_frontend_url()
    if base:
        return [base]
    logger.warning(
        "BACKEND_CORS_ORIGINS / CORS_ALLOW_ORIGINS vide en environnement %r : "
        "aucune origine CORS (configurez ces variables ou FRONTEND_URL).",
        settings.ENVIRONMENT,
    )
    return []


# Test-mode overrides to satisfy tests expectations
# IMPORTANT: Ne pas activer TESTING en production - cela force l'utilisation de la base de test
# TESTING doit être défini uniquement lors de l'exécution des tests pytest
if os.getenv("TESTING") == "true":
    logger = logging.getLogger(__name__)
    logger.warning("⚠️ TESTING mode activé - utilisation de la base de données de test!")
    settings.ENVIRONMENT = "test"
    if settings.TEST_DATABASE_URL:
        settings.DATABASE_URL = settings.TEST_DATABASE_URL




