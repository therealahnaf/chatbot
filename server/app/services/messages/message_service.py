"""Message service for message management operations."""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError, ValidationError
from app.models.message import Message
from app.repositories.message_repository import MessageRepository
from app.schemas.conversation import MessageCreate, MessageUpdate

logger = logging.getLogger(__name__)


class MessageService:
    """Service for message management operations."""

    def __init__(self, db: AsyncSession):
        """Initialize message service.

        Args:
            db: Database session
        """
        self.db = db
        self.message_repository = MessageRepository(db)

    async def create_message(self, message_data: MessageCreate) -> Message:
        """Create a new message.

        Args:
            message_data: Message creation data

        Returns:
            Created message instance

        Raises:
            ValidationError: If validation fails
            ResourceNotFoundError: If conversation doesn't exist
        """
        # Verify conversation exists
        from app.repositories.conversation_repository import ConversationRepository

        conversation_repo = ConversationRepository(self.db)
        conversation = await conversation_repo.get(message_data.conversation_id)
        if not conversation:
            raise ResourceNotFoundError(
                resource=f"Conversation with id '{message_data.conversation_id}'"
            )

        # Prepare message data
        message_dict = message_data.model_dump()
        # Map metadata to msg_metadata for the model
        if "metadata" in message_dict:
            message_dict["msg_metadata"] = message_dict.pop("metadata")

        try:
            message = await self.message_repository.create(message_dict)
            await self.db.commit()
            await self.db.refresh(message)

            logger.info(
                "Created message: id=%s, conversation_id=%s, role=%s",
                message.id,
                message.conversation_id,
                message.role,
            )

            return message

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to create message: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to create message: {str(e)}",
                details={"error": str(e)},
            ) from e

    async def get_message_by_id(self, message_id: UUID) -> Message:
        """Get message by ID.

        Args:
            message_id: Message UUID

        Returns:
            Message instance

        Raises:
            ResourceNotFoundError: If message not found
        """
        message = await self.message_repository.get_message_by_id(message_id)
        if not message:
            raise ResourceNotFoundError(resource=f"Message with id '{message_id}'")
        return message

    async def get_messages_by_conversation_id(
        self, conversation_id: UUID
    ) -> list[Message]:
        """Get messages by conversation ID with pagination.

        Args:
            conversation_id: Conversation UUID
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return

        Returns:
            List of message instances ordered by creation time
        """
        return await self.message_repository.get_by_conversation_id(
            conversation_id
        )

    async def update_message(
        self, message_id: UUID, message_data: MessageUpdate
    ) -> Message:
        """Update a message.

        Args:
            message_id: Message UUID
            message_data: Message update data

        Returns:
            Updated message instance

        Raises:
            ResourceNotFoundError: If message not found
            ValidationError: If update fails
        """
        message = await self.message_repository.get_message_by_id(message_id)
        if not message:
            raise ResourceNotFoundError(resource=f"Message with id '{message_id}'")

        # Prepare update data
        update_dict = message_data.model_dump(exclude_unset=True)
        # Map metadata to msg_metadata for the model
        if "metadata" in update_dict:
            update_dict["msg_metadata"] = update_dict.pop("metadata")

        try:
            updated_message = await self.message_repository.update(message_id, update_dict)
            await self.db.commit()
            await self.db.refresh(updated_message)

            logger.info("Updated message: id=%s", message_id)

            return updated_message

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to update message: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to update message: {str(e)}",
                details={"error": str(e)},
            ) from e

    async def delete_message(self, message_id: UUID) -> bool:
        """Delete a message.

        Args:
            message_id: Message UUID

        Returns:
            True if deleted, False if not found

        Raises:
            ResourceNotFoundError: If message not found
        """
        message = await self.message_repository.get_message_by_id(message_id)
        if not message:
            raise ResourceNotFoundError(resource=f"Message with id '{message_id}'")

        try:
            result = await self.message_repository.delete_message(message_id)
            await self.db.commit()

            logger.info("Deleted message: id=%s", message_id)

            return result

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to delete message: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to delete message: {str(e)}",
                details={"error": str(e)},
            ) from e

