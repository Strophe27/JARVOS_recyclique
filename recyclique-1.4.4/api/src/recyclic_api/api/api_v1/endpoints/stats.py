"""
Statistics and analytics endpoints.
"""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, List, Literal
from datetime import date, datetime
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

from recyclic_api.core.database import get_db
from recyclic_api.core.auth import get_current_user, require_admin_role, require_role_strict
from recyclic_api.models.user import User, UserRole
from recyclic_api.services.stats_service import StatsService
from recyclic_api.services.reception_stats_service import ReceptionLiveStatsService
from recyclic_api.schemas.stats import (
    ReceptionSummaryStats,
    CategoryStats,
    UnifiedLiveStatsResponse,
)

router = APIRouter(tags=["stats"])
logger = logging.getLogger(__name__)

# Rate limiting configuration
limiter = Limiter(key_func=get_remote_address)


@router.get(
    "/reception/summary",
    response_model=ReceptionSummaryStats,
    summary="Get reception summary statistics",
    description="Retrieve summary statistics (total weight, items, categories) for reception data. "
                "Optionally filter by date range. Available to all authenticated users."
)
@limiter.limit("60/minute")
def get_reception_summary(
    request: Request,
    start_date: Optional[datetime] = Query(
        None,
        description="Start date (inclusive) in ISO 8601 format"
    ),
    end_date: Optional[datetime] = Query(
        None,
        description="End date (inclusive) in ISO 8601 format"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Changed: Allow all authenticated users
) -> ReceptionSummaryStats:
    """
    Get summary statistics for reception data.

    This endpoint aggregates data from ligne_depot and provides:
    - Total weight in kg
    - Total number of items
    - Number of unique categories

    Available to all authenticated users.
    """
    logger.info(
        f"User {current_user.id} requesting reception summary stats "
        f"(start_date={start_date}, end_date={end_date})"
    )

    stats_service = StatsService(db)
    return stats_service.get_reception_summary(
        start_date=start_date,
        end_date=end_date
    )


@router.get(
    "/reception/by-category",
    response_model=List[CategoryStats],
    summary="Get reception statistics by category",
    description="Retrieve reception statistics grouped by category. "
                "Optionally filter by date range. Available to all authenticated users."
)
@limiter.limit("60/minute")
def get_reception_by_category(
    request: Request,
    start_date: Optional[datetime] = Query(
        None,
        description="Start date (inclusive) in ISO 8601 format"
    ),
    end_date: Optional[datetime] = Query(
        None,
        description="End date (inclusive) in ISO 8601 format"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Changed: Allow all authenticated users
) -> List[CategoryStats]:
    """
    Get reception statistics grouped by category.

    This endpoint aggregates data from ligne_depot by category and provides:
    - Category name
    - Total weight in kg for that category
    - Total number of items for that category

    Results are sorted by total weight (descending).

    Available to all authenticated users.
    """
    logger.info(
        f"User {current_user.id} requesting reception by category stats "
        f"(start_date={start_date}, end_date={end_date})"
    )

    stats_service = StatsService(db)
    return stats_service.get_reception_by_category(
        start_date=start_date,
        end_date=end_date
    )


@router.get(
    "/sales/by-category",
    response_model=List[CategoryStats],
    summary="Get sales statistics by category",
    description="Retrieve sales statistics grouped by main category. "
                "Optionally filter by date range. Available to all authenticated users."
)
@limiter.limit("60/minute")
def get_sales_by_category(
    request: Request,
    start_date: Optional[datetime] = Query(
        None,
        description="Start date (inclusive) in ISO 8601 format"
    ),
    end_date: Optional[datetime] = Query(
        None,
        description="End date (inclusive) in ISO 8601 format"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Allow all authenticated users
) -> List[CategoryStats]:
    """
    Get sales statistics grouped by main category.

    This endpoint aggregates data from sale_items by category and provides:
    - Category name (main categories only)
    - Total weight in kg for that category
    - Total number of items for that category

    Results are sorted by total weight (descending).

    Available to all authenticated users.
    """
    logger.info(
        f"User {current_user.id} requesting sales by category stats "
        f"(start_date={start_date}, end_date={end_date})"
    )

    stats_service = StatsService(db)
    return stats_service.get_sales_by_category(
        start_date=start_date,
        end_date=end_date
    )


@router.get("/live", response_model=UnifiedLiveStatsResponse)
async def get_unified_live_stats(
    period_type: Literal["24h", "daily"] = Query("daily", description="Type de période (daily=minuit-minuit, 24h=24h glissantes)"),
    site_id: Optional[str] = Query(None, description="Filtrer par ID de site (optionnel)"),
    db: Session = Depends(get_db),
    current_user=Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Get unified live statistics for all modules (caisse + réception).
    
    Returns consistent KPIs with same period (daily by default).
    
    **Stats incluses :**
    - Caisse : tickets_count, last_ticket_amount, ca, donations, weight_out_sales
    - Réception : tickets_open, tickets_closed_24h, items_received
    - Matière : weight_in (entrées), weight_out (sorties)
    
    **Période :**
    - `daily` (défaut) : Journée complète (minuit-minuit UTC)
    - `24h` : 24 heures glissantes (rétrocompatibilité)
    
    **Permissions :** Admin ou Super Admin uniquement
    """
    service = ReceptionLiveStatsService(db)
    stats = await service.get_unified_live_stats(
        period_type=period_type,
        site_id=site_id
    )
    return UnifiedLiveStatsResponse(**stats)
