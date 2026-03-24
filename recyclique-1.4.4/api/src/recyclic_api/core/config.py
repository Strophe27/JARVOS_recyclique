from pydantic_settings import BaseSettings
from pydantic import ConfigDict
import os
import logging
from typing import Optional

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
    
    # Telegram
    TELEGRAM_BOT_URL: str | None = None
    TELEGRAM_BOT_TOKEN: str | None = None  # For validating bot requests
    ADMIN_TELEGRAM_IDS: str | None = None

    # Environment
    ENVIRONMENT: str = "development"
    ECOLOGIC_EXPORT_DIR: str = "/app/exports"

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
    
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

# Test-mode overrides to satisfy tests expectations
# IMPORTANT: Ne pas activer TESTING en production - cela force l'utilisation de la base de test
# TESTING doit être défini uniquement lors de l'exécution des tests pytest
if os.getenv("TESTING") == "true":
    logger = logging.getLogger(__name__)
    logger.warning("⚠️ TESTING mode activé - utilisation de la base de données de test!")
    settings.ENVIRONMENT = "test"
    if settings.TEST_DATABASE_URL:
        settings.DATABASE_URL = settings.TEST_DATABASE_URL
    # In tests, always use a fixed bot token to ensure deterministic behavior
    settings.TELEGRAM_BOT_TOKEN = "test_bot_token_123"






