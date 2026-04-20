from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import logging
import time
import os
import re

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from fastapi.openapi.utils import get_openapi

from recyclic_api.core.config import settings, get_cors_allow_origins
from recyclic_api.api.api_v1.api import api_router
from recyclic_api.api.api_v2.api import api_v2_router
from recyclic_api.services.sync_service import schedule_periodic_kdrive_sync
from recyclic_api.services.scheduler_service import get_scheduler_service
from recyclic_api.utils.rate_limit import limiter
from recyclic_api.middleware.request_correlation import RequestCorrelationMiddleware
from recyclic_api.schemas.recyclique_api_error import (
    RecycliqueApiError,
    recyclique_api_error_from_http_exception,
)
from recyclic_api.core import database
from recyclic_api.models import Base
from recyclic_api.initial_data import init_super_admin_and_dev_pin
# from recyclic_api.middleware.activity_tracker import ActivityTrackerMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Semver produit : même source que Settings.APP_VERSION (env APP_VERSION / Dockerfile)
PRODUCT_VERSION = settings.APP_VERSION

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestionnaire de cycle de vie de l'application"""
    logger.info("Starting up Recyclic API...")
    is_test_env = (os.getenv("TESTING") == "true") or (settings.ENVIRONMENT == "test")

    # Démarrer le scheduler de tâches planifiées (désactivé en test)
    scheduler = None
    sync_task = None
    if not is_test_env:
        scheduler = get_scheduler_service()
        await scheduler.start()
        # Démarrer la synchronisation kDrive (si nécessaire)
        sync_task = schedule_periodic_kdrive_sync()

    logger.info("API ready - use migrations for database setup")
    
    # Générer openapi.json pour les tests
    if is_test_env:
        import json
        try:
            openapi_schema = app.openapi()
            # Créer le répertoire si nécessaire
            os.makedirs("/app", exist_ok=True)
            with open("/app/openapi.json", "w") as f:
                json.dump(openapi_schema, f, indent=2)
            logger.info("openapi.json généré avec succès")
        except Exception as e:
            logger.warning(f"Could not generate openapi.json: {e}")

    # Initialisation applicative (création super-admin si configuré)
    db = None
    try:
        db = database.SessionLocal()
        init_super_admin_and_dev_pin(db)
    except Exception as e:
        logger.error(f"Startup initialization error: {e}")
    finally:
        if db is not None:
            try:
                db.close()
            except Exception:
                pass

    try:
        yield
    finally:
        # Arrêter le scheduler si actif
        if scheduler is not None:
            await scheduler.stop()

        # Annuler la tâche de sync kDrive
        if sync_task:
            sync_task.cancel()
            with suppress(asyncio.CancelledError):
                await sync_task

        logger.info("Shutting down Recyclic API...")

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=PRODUCT_VERSION,
    description="API pour la plateforme Recyclic - Gestion de recyclage intelligente",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    root_path=settings.ROOT_PATH,
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(HTTPException)
async def recyclique_http_exception_handler(request: Request, exc: HTTPException):
    """Enveloppe JSON stable (AR21 / Story 2.6) — corrélation via request.state.request_id."""
    rid = getattr(request.state, "request_id", None) or ""
    body = recyclique_api_error_from_http_exception(
        status_code=exc.status_code,
        detail=exc.detail,
        correlation_id=rid,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(body.model_dump()),
    )


def _validation_errors_for_log(errors: list) -> list:
    """Omet la clé « input » des erreurs Pydantic pour les logs (évite fuite de secrets)."""
    safe: list = []
    for err in errors:
        if isinstance(err, dict):
            safe.append({k: v for k, v in err.items() if k != "input"})
        else:
            safe.append(err)
    return safe


# B50-P2: Handler pour capturer les erreurs de validation Pydantic
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handler pour logger les erreurs de validation Pydantic en détail."""
    # Ne pas journaliser le corps brut (mots de passe, tokens, etc.)
    content_length = request.headers.get("content-length", "n/a")
    rid = getattr(request.state, "request_id", None)

    logger.error(
        f"Erreur de validation Pydantic sur {request.method} {request.url.path}. "
        f"request_id={rid!s}. "
        f"Erreurs (sans valeurs soumises): {_validation_errors_for_log(exc.errors())}. "
        f"Content-Length: {content_length} (corps non journalisé)"
    )
    rid = getattr(request.state, "request_id", None) or ""
    body = RecycliqueApiError(
        code="VALIDATION_ERROR",
        detail=_validation_errors_for_log(exc.errors()),
        retryable=False,
        state=None,
        correlation_id=rid,
    )
    return JSONResponse(
        status_code=422,
        content=jsonable_encoder(body.model_dump()),
    )

app.add_middleware(SlowAPIMiddleware)

# Story 2.4 : corrélation requête (X-Request-Id) pour audit / support
app.add_middleware(RequestCorrelationMiddleware)

# Add CORS middleware (BACKEND_CORS_ORIGINS / CORS_ALLOW_ORIGINS / repli dev via Settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware
# En développement local, autoriser tous les hôtes pour éviter les erreurs "Invalid host header"
if settings.ENVIRONMENT in ("development", "dev", "local"):
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]
    )
else:
    # Sinon, lire la variable d'environnement ALLOWED_HOSTS (valeurs séparées par virgules ou espaces)
    raw_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1")
    allowed_hosts = [h.strip() for h in re.split(r"[\s,]+", raw_hosts) if h.strip()]
    # Toujours ajouter localhost et 127.0.0.1 pour les healthchecks Docker internes
    for internal_host in ["localhost", "127.0.0.1"]:
        if internal_host not in allowed_hosts:
            allowed_hosts.append(internal_host)
    # En mode test, ajouter "testserver" pour les tests FastAPI TestClient
    is_test_env = (os.getenv("TESTING") == "true") or (settings.ENVIRONMENT == "test")
    if is_test_env and "testserver" not in allowed_hosts:
        allowed_hosts.append("testserver")
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=allowed_hosts
    )

# Add request timing middleware (development only)
# This middleware adds X-Process-Time header for debugging purposes
# It is NOT used by the user online status system (which uses ActivityService + Redis)
@app.middleware("http")
async def add_process_time_header(request, call_next):
    # Only add timing header in development environments
    if settings.ENVIRONMENT in ("development", "dev", "local"):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
    else:
        # In production, skip timing calculation for performance
        return await call_next(request)

# Add activity tracking middleware
# app.add_middleware(ActivityTrackerMiddleware, activity_threshold_minutes=15)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)
# Story 2.7 : surface v2 (bandeau live) — ne pas casser /v1/*
app.include_router(api_v2_router, prefix="/v2")


def custom_openapi():
    """Enrichit le schéma OpenAPI : cookie de session web v2 en complément du Bearer."""
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version="3.0.2",
        description=(
            (app.description or "")
            + "\n\nAuth : JWT via en-tête `Authorization: Bearer`, et pour les clients web same-origin,"
            + " cookie httpOnly `"
            + settings.WEB_SESSION_ACCESS_COOKIE_NAME
            + "` (session v2)."
        ),
        routes=app.routes,
    )
    comps = openapi_schema.setdefault("components", {}).setdefault("securitySchemes", {})
    comps.setdefault(
        "HTTPBearer",
        {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"},
    )
    comps["RecycliqueWebSessionCookie"] = {
        "type": "apiKey",
        "in": "cookie",
        "name": settings.WEB_SESSION_ACCESS_COOKIE_NAME,
        "description": "Session web v2 — alternative ou complément au Bearer pour les clients navigateur.",
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Bienvenue sur l'API Recyclic",
        "version": PRODUCT_VERSION,
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db = None
    try:
        # Test database session (fermer explicitement : next(get_db()) ne déclenchait pas le finally du générateur)
        db = database.SessionLocal()
        db.execute(text("SELECT 1"))

        # Test Redis connection
        from recyclic_api.core.redis import get_redis
        redis_client = get_redis()
        redis_client.ping()

        return {
            "status": "healthy",
            "database": "connected",
            "redis": "connected",
            "timestamp": time.time()
        }
    except Exception:
        logger.exception("Health check failed")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": time.time(),
            },
        )
    finally:
        if db is not None:
            with suppress(Exception):
                db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
