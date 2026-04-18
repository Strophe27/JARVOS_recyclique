"""Endpoint admin : métriques de sessions (B42-P4)."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status

from recyclic_api.core.auth import require_admin_role
from recyclic_api.models.user import User
from recyclic_api.utils.session_metrics import session_metrics

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)


@router.get("/sessions/metrics")
async def get_admin_session_metrics(
    hours: int = Query(
        default=24,
        ge=1,
        le=168,
        description="Number of hours to include in metrics (1-168)",
    ),
    current_user: User = Depends(require_admin_role),
):
    """
    Get session metrics for admin dashboard.

    Story B42-P4: Admin insights - AC2 - Endpoint backend /v1/admin/sessions/metrics.

    Returns:
        Session metrics including:
        - Active sessions count
        - Refresh success/failure rates
        - Top errors by IP/site
        - Logout statistics
    """
    try:
        metrics_summary = session_metrics.get_metrics_summary(hours=hours)
        return {
            "success": True,
            "metrics": metrics_summary,
        }
    except Exception as e:
        logger.error(f"Error getting session metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des métriques de session: {str(e)}",
        )
