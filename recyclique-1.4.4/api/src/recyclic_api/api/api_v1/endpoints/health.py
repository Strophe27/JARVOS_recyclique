import logging
import os
import time

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.database import get_db
from recyclic_api.core.redis import get_redis

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/")
async def health_check(db: Session = Depends(get_db)):
    """Health check for API v1. JSON `version` is route prefix "v1", not product semver."""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        
        # Test Redis connection
        redis_client = get_redis()
        redis_client.ping()
        
        return {
            "status": "healthy",
            "version": "v1",
            "database": "connected",
            "redis": "connected",
            "timestamp": time.time()
        }
    except Exception:
        logger.exception("Health check (v1) failed")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "version": "v1",
                "timestamp": time.time(),
            },
        )

@router.get("/version")
async def get_version():
    """Build info; `version` is product semver (APP_VERSION), not the API route prefix v1."""

    version = settings.APP_VERSION
    
    return {
        "version": version,
        "commitSha": os.getenv("COMMIT_SHA", "unknown"),
        "branch": os.getenv("BRANCH", "unknown"),
        "commitDate": os.getenv("COMMIT_DATE", "unknown"),
        "buildDate": os.getenv("BUILD_DATE", "unknown"),
        "environment": os.getenv("ENVIRONMENT", "development")
    }
