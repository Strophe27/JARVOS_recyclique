"""
Endpoints admin : santé, probes légères et monitoring (sans Telegram).

Le endpoint POST /admin/health/test-notifications reste dans admin.py (réponse
informative uniquement ; plus d'appel au service Telegram).
"""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status as http_status
from sqlalchemy.orm import Session
from slowapi import Limiter

from recyclic_api.core.auth import require_admin_role, require_admin_role_strict
from recyclic_api.core.database import get_db
from recyclic_api.models.user import User

logger = logging.getLogger(__name__)


def register_admin_health_routes(router: APIRouter, limiter: Limiter) -> None:
    """Enregistre les routes /admin/health* (sauf test-notifications)."""

    @router.get(
        "/health-test",
        summary="Test simple de l'endpoint admin",
    )
    @limiter.limit("10/minute")
    async def test_admin_endpoint(request: Request):
        """Test simple pour vérifier que l'endpoint admin fonctionne"""
        return {"message": "Admin endpoint accessible"}

    @router.get(
        "/health/public",
        summary="Health check public",
        description="Endpoint de health check public pour Docker et monitoring externe",
    )
    async def get_public_health():
        """Health check public - accessible sans authentification"""
        return {
            "status": "healthy",
            "service": "recyclic-api",
            "timestamp": datetime.utcnow().isoformat(),
        }

    @router.get(
        "/health/database",
        summary="Health check base de données",
        description="Vérifie la connectivité à la base de données",
    )
    async def get_database_health(db: Session = Depends(get_db)):
        """Health check de la base de données"""
        try:
            db.execute("SELECT 1")
            return {
                "status": "healthy",
                "database": "connected",
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    @router.get(
        "/health",
        summary="Métriques de santé du système",
        description="Expose les métriques de santé, anomalies détectées et recommandations",
    )
    @limiter.limit("20/minute")
    async def get_system_health(
        request: Request,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Récupère les métriques de santé du système"""
        try:
            from recyclic_api.services.anomaly_detection_service import (
                get_anomaly_detection_service,
            )
            from recyclic_api.services.scheduler_service import get_scheduler_service

            anomaly_service = get_anomaly_detection_service(db)
            anomalies = await anomaly_service.run_anomaly_detection()

            scheduler = get_scheduler_service()
            scheduler_status = scheduler.get_status()

            return {
                "status": "success",
                "system_health": {
                    "overall_status": "healthy"
                    if anomalies["summary"]["critical_anomalies"] == 0
                    else "degraded",
                    "anomalies_detected": anomalies["summary"]["total_anomalies"],
                    "critical_anomalies": anomalies["summary"]["critical_anomalies"],
                    "scheduler_running": scheduler_status["running"],
                    "active_tasks": scheduler_status["total_tasks"],
                    "timestamp": anomalies["timestamp"],
                },
                "anomalies": anomalies["anomalies"],
                "recommendations": anomalies["recommendations"],
                "scheduler_status": scheduler_status,
            }

        except Exception as e:
            logger.error(f"Erreur lors de la récupération des métriques de santé: {e}")
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération des métriques: {str(e)}",
            )

    @router.get(
        "/health/anomalies",
        summary="Anomalies détectées",
        description="Récupère uniquement les anomalies détectées sans réexécuter la détection",
    )
    @limiter.limit("15/minute")
    async def get_anomalies(
        request: Request,
        current_user: User = Depends(require_admin_role),
        db: Session = Depends(get_db),
    ):
        """Récupère les anomalies détectées"""
        try:
            from recyclic_api.services.anomaly_detection_service import (
                get_anomaly_detection_service,
            )

            anomaly_service = get_anomaly_detection_service(db)
            anomalies = await anomaly_service.run_anomaly_detection()

            return {
                "status": "success",
                "anomalies": anomalies["anomalies"],
                "summary": anomalies["summary"],
                "timestamp": anomalies["timestamp"],
            }

        except Exception as e:
            logger.error(f"Erreur lors de la récupération des anomalies: {e}")
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération des anomalies: {str(e)}",
            )

    @router.get(
        "/health/scheduler",
        summary="Statut du scheduler",
        description="Récupère le statut du scheduler de tâches planifiées",
    )
    @limiter.limit("10/minute")
    async def get_scheduler_status(
        request: Request,
        current_user: User = Depends(require_admin_role_strict()),
    ):
        """Récupère le statut du scheduler"""
        try:
            from recyclic_api.services.scheduler_service import get_scheduler_service

            scheduler = get_scheduler_service()
            status = scheduler.get_status()

            return {
                "status": "success",
                "scheduler": status,
            }

        except Exception as e:
            logger.error(f"Erreur lors de la récupération du statut du scheduler: {e}")
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération du statut: {str(e)}",
            )

