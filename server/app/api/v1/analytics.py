"""Analytics API endpoints for dashboard data."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, require_admin
from app.db.session import get_db
from app.models.user import User
from app.services.analytics.analytics_service import AnalyticsService
from app.services.analytics.prometheus_analytics_service import PrometheusAnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def get_analytics_service(
    db: Annotated[AsyncSession, Depends(get_db)]
) -> AnalyticsService:
    """Get analytics service instance."""
    return AnalyticsService(db=db)


def get_prometheus_analytics_service() -> PrometheusAnalyticsService:
    """Get Prometheus analytics service instance."""
    return PrometheusAnalyticsService()


@router.get("/overview")
async def get_overview_stats(
    current_user: Annotated[User, Depends(require_admin())],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> dict:
    """
    Get overview dashboard statistics.
    
    Returns aggregated statistics from PostgreSQL:
    - Total users, active users (7d, 30d)
    - Total conversations with trend
    - Total documents by status
    
    Requires admin role.
    """
    try:
        stats = await analytics_service.get_overview_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching overview stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch overview statistics"
        ) from e


@router.get("/system")
async def get_system_stats(
    current_user: Annotated[User, Depends(require_admin())],
    prometheus_service: Annotated[
        PrometheusAnalyticsService, Depends(get_prometheus_analytics_service)
    ],
) -> dict:
    """
    Get system statistics from Prometheus.
    
    Returns:
    - CPU and memory usage
    - Request rates and error rates
    - Response times
    - Database and Redis connections
    - Uptime
    - Trends over time
    
    Requires admin role.
    """
    try:
        stats = await prometheus_service.get_system_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching system stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system statistics"
        ) from e

