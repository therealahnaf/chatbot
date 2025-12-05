"""Conversation repository."""

from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Conversation
from app.models.message import Message
from app.repositories.base import BaseRepository

class ConversationRepository(BaseRepository[Conversation]):
    """Repository for conversation operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        super().__init__(Conversation, db)

    async def get(self, record_id: UUID, load_messages: bool = False) -> Conversation | None:
        """Get a conversation by ID.
        
        Args:
            record_id: Conversation UUID
            load_messages: If True, eager load messages relationship
            
        Returns:
            Conversation instance or None if not found
        """
        query = select(Conversation).where(Conversation.id == record_id)
        if load_messages:
            # Eagerly load messages and their feedback relationships
            query = query.options(
                selectinload(Conversation.messages).selectinload(Message.feedback)
            )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: UUID) -> Conversation | None:
        """Get conversation by user ID.
        
        Args:
            user_id: User UUID
            
        Returns:
            Conversation instance or None if not found
        """
        return await self.get(user_id)
    
    async def get_all_conversations(self, skip: int = 0, limit: int = 100, filters: Optional[dict[str, Any]] = None, order_by: Optional[str] = None, load_messages: bool = False) -> tuple[list[Conversation], int]:
        """Get all conversations.
        
        Args:
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            filters: Dictionary of field:value pairs for filtering
            order_by: Field name to order by (prefix with '-' for descending)
            load_messages: If True, eager load messages relationship
        
        Returns:
            Tuple of (list of Conversation instances, total count)
        """

        query = select(Conversation).order_by(Conversation.created_at.desc())
        if load_messages:
            # Eagerly load messages and their feedback relationships
            query = query.options(
                selectinload(Conversation.messages).selectinload(Message.feedback)
            )
        count_query = select(func.count()).select_from(Conversation)

        if filters:
            for field, value in filters.items():
                if hasattr(Conversation, field):
                    query = query.where(getattr(Conversation, field) == value)
                    count_query = count_query.where(getattr(Conversation, field) == value)

        if order_by:
            if order_by.startswith("-"):
                field_name = order_by[1:]
                if hasattr(Conversation, field_name):
                    query = query.order_by(getattr(Conversation, field_name).desc())

        # Get total count before pagination
        total_count = await self.db.scalar(count_query) or 0

        # Apply pagination
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        conversations = list(result.scalars().all())
        return conversations, total_count

    async def create_conversation(self, conversation_data: dict[str, Any]) -> Conversation:
        """Create a new conversation.
        
        Args:
            conversation_data: Dictionary of conversation data
            
        Returns:
            Conversation instance
        """
        return await self.create(conversation_data)
    
    async def update_conversation(self, conversation_id: UUID, conversation_data: dict[str, Any]) -> Conversation:
        """Update a conversation.
        
        Args:
            conversation_id: Conversation UUID
            conversation_data: Dictionary of conversation data to update
            
        Returns:
            Conversation instance
        """
        return await self.update(conversation_id, conversation_data)

    async def delete_conversation(self, conversation_id: UUID) -> bool:
        """Delete a conversation.
        
        Args:
            conversation_id: Conversation UUID
            
        Returns:
            True if deleted, False if not found
        """
        return await self.delete(conversation_id)