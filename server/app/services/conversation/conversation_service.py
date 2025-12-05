"""Conversation service."""

import logging
from typing import Any, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError, ValidationError
from app.models import Conversation
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.conversation import ConversationCreate, ConversationUpdate

logger = logging.getLogger(__name__)


class ConversationService:
    """Conversation service."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.conversation_repository = ConversationRepository(db)

    async def get_conversation_by_id(
        self, conversation_id: UUID, load_messages: bool = True
    ) -> Conversation:
        """Get conversation by ID.
        
        Args:
            conversation_id: Conversation UUID
            load_messages: If True, eager load messages relationship
            
        Returns:
            Conversation instance
            
        Raises:
            ResourceNotFoundError: If conversation not found
        """
        conversation = await self.conversation_repository.get(
            conversation_id, load_messages=load_messages
        )
        if not conversation:
            raise ResourceNotFoundError(
                resource=f"Conversation with id '{conversation_id}'"
            )
        return conversation

    async def get_all_conversations(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[dict[str, Any]] = None,
        order_by: Optional[str] = None,
        load_messages: bool = True,
    ) -> tuple[list[Conversation], int]:
        """Get all conversations.
        
        Args:
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            filters: Dictionary of field:value pairs for filtering
            order_by: Field name to order by (prefix with '-' for descending)
            load_messages: If True, eager load messages relationship
            
        Returns:
            Tuple of (list of conversations, total count)
        """
        conversations, total_count = await self.conversation_repository.get_all_conversations(
            skip=skip,
            limit=limit,
            filters=filters,
            order_by=order_by,
            load_messages=load_messages,
        )
        return conversations, total_count

    async def create_conversation(
        self, conversation_data: ConversationCreate, user_id: UUID | None = None
    ) -> Conversation:
        """Create a new conversation.

        Args:
            conversation_data: Conversation creation data
            user_id: Optional user UUID creating the conversation (None for anonymous SIP calls)

        Returns:
            Conversation instance

        Raises:
            ValidationError: If creation fails
        """
        conversation_dict = conversation_data.model_dump()
        conversation_dict["user_id"] = user_id  # Can be None for SIP calls
        
        # Map metadata to conv_metadata for database model
        if "metadata" in conversation_dict:
            conversation_dict["conv_metadata"] = conversation_dict.pop("metadata")

        try:
            conversation = await self.conversation_repository.create_conversation(
                conversation_dict
            )
            await self.db.commit()
            await self.db.refresh(conversation)

            logger.info(
                "Created conversation: id=%s, user_id=%s",
                conversation.id,
                conversation.user_id,
            )

            return conversation

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to create conversation: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to create conversation: {str(e)}",
                details={"error": str(e)},
            ) from e

    async def update_conversation(
        self, conversation_id: UUID, conversation_data: ConversationUpdate
    ) -> Conversation:
        """Update a conversation.
        
        Args:
            conversation_id: Conversation UUID
            conversation_data: Conversation update data
            
        Returns:
            Conversation instance
            
        Raises:
            ResourceNotFoundError: If conversation not found
            ValidationError: If update fails
        """
        conversation = await self.conversation_repository.get(conversation_id)
        if not conversation:
            raise ResourceNotFoundError(
                resource=f"Conversation with id '{conversation_id}'"
            )

        update_dict = conversation_data.model_dump(exclude_unset=True)
        
        # Map metadata to conv_metadata for database model
        if "metadata" in update_dict:
            update_dict["conv_metadata"] = update_dict.pop("metadata")

        try:
            updated_conversation = await self.conversation_repository.update_conversation(
                conversation_id, update_dict
            )
            await self.db.commit()
            await self.db.refresh(updated_conversation)

            logger.info("Updated conversation: id=%s", conversation_id)

            return updated_conversation

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to update conversation: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to update conversation: {str(e)}",
                details={"error": str(e)},
            ) from e

    async def delete_conversation(self, conversation_id: UUID) -> bool:
        """Delete a conversation.
        
        Args:
            conversation_id: Conversation UUID
            
        Returns:
            True if deleted, False if not found
            
        Raises:
            ResourceNotFoundError: If conversation not found
        """
        conversation = await self.conversation_repository.get(conversation_id)
        if not conversation:
            raise ResourceNotFoundError(
                resource=f"Conversation with id '{conversation_id}'"
            )

        try:
            result = await self.conversation_repository.delete_conversation(
                conversation_id
            )
            await self.db.commit()

            logger.info("Deleted conversation: id=%s", conversation_id)

            return result

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to delete conversation: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to delete conversation: {str(e)}",
                details={"error": str(e)},
            ) from e
