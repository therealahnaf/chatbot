"""Feedback repository."""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback
from app.repositories.base import BaseRepository


class FeedbackRepository(BaseRepository[Feedback]):
    """Repository for feedback operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        super().__init__(Feedback, db)

    async def get_by_message_id(self, message_id: UUID) -> Optional[Feedback]:
        """Get feedback by message ID.
        
        Args:
            message_id: Message UUID
            
        Returns:
            Feedback instance or None if not found
        """
        result = await self.db.execute(
            select(Feedback).where(Feedback.message_id == message_id)
        )
        return result.scalar_one_or_none()
