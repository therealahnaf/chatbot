"""Message repository."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message
from app.repositories.base import BaseRepository
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException


class MessageRepository(BaseRepository[Message]):
    """Repository for message operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        super().__init__(Message, db)

    async def get_by_conversation_id(
        self, conversation_id: UUID
    ) -> list[Message]:
        """Get messages by conversation ID.
        
        Args:
            conversation_id: Conversation UUID
            
        Returns:
            List of message instances ordered by creation time (ascending)
        """
        try:
            query = (
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.asc())
                .options(selectinload(Message.feedback))
            )
            result = await self.db.execute(query)
            messages = list(result.scalars().all())
            return messages
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    async def get_message_by_id(self, message_id: UUID) -> Message:
        """Get message by ID.
        
        Args:
            message_id: Message UUID
            
        Returns:
            Message instance
        """
        return await self.get(message_id)
    
    async def get_message_list(
        self,
        conversation_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Message]:
        """Get message list by conversation ID with pagination.
        
        Args:
            conversation_id: Conversation UUID
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            
        Returns:
            List of message instances ordered by creation time
        """
        return await self.get_multi(
            skip=skip,
            limit=limit,
            filters={"conversation_id": conversation_id},
            order_by="created_at",
        )

    async def create_message(self, message: Message) -> Message:
        """Create a new message.
        
        Args:
            message: Message instance
            
        Returns:
            Message instance
        """
        return await self.create(message)
    
    async def update_message(self, message: Message) -> Message:
        """Update a message.
        
        Args:
            message: Message instance
            
        Returns:
            Message instance
        """
        return await self.update(message)

    async def delete_message(self, message_id: UUID) -> bool:
        """Delete a message.
        
        Args:
            message_id: Message UUID
            
        Returns:
            True if message was deleted, False otherwise
        """
        return await self.delete(message_id)