"""Analytics repository."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsEvent
from app.repositories.base import BaseRepository


class AnalyticsRepository(BaseRepository[AnalyticsEvent]):
    """Repository for analytics operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        super().__init__(AnalyticsEvent, db)

    async def create_event(
        self, event_type: str, event_data: dict[str, Any], user_id: Optional[UUID] = None
    ) -> AnalyticsEvent:
        """Create an analytics event.
        
        Args:
            event_type: Type of event (e.g., 'agent_query', 'document_upload')
            event_data: Event data as dictionary
            user_id: Optional user UUID
            
        Returns:
            Created analytics event instance
        """
        return await self.create(
            {"event_type": event_type, "event_data": event_data, "user_id": user_id}
        )

    async def aggregate(
        self,
        event_type: Optional[str] = None,
        user_id: Optional[UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        group_by_field: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Aggregate analytics events with optional filtering and grouping.
        
        Args:
            event_type: Filter by event type
            user_id: Filter by user ID
            start_date: Filter events after this date
            end_date: Filter events before this date
            group_by_field: Field to group by (e.g., 'event_type', 'user_id')
            
        Returns:
            List of aggregated results with count and optional grouping
        """
        # Build base query
        if group_by_field and hasattr(AnalyticsEvent, group_by_field):
            group_field = getattr(AnalyticsEvent, group_by_field)
            query = select(group_field, func.count().label("count")).group_by(group_field)
        else:
            query = select(func.count().label("count"))
        
        # Apply filters
        if event_type:
            query = query.where(AnalyticsEvent.event_type == event_type)
        
        if user_id:
            query = query.where(AnalyticsEvent.user_id == user_id)
        
        if start_date:
            query = query.where(AnalyticsEvent.created_at >= start_date)
        
        if end_date:
            query = query.where(AnalyticsEvent.created_at <= end_date)
        
        result = await self.db.execute(query)
        
        # Format results
        if group_by_field:
            return [
                {group_by_field: row[0], "count": row[1]} for row in result.all()
            ]
        else:
            count = result.scalar_one()
            return [{"count": count}]
