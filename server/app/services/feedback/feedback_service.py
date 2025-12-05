"""Feedback service for feedback management operations."""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError, ValidationError
from app.models.feedback import Feedback
from app.repositories.feedback_repository import FeedbackRepository
from app.schemas.feedback import FeedbackCreate

logger = logging.getLogger(__name__)


class FeedbackService:
    """Service for feedback management operations."""

    def __init__(self, db: AsyncSession):
        """Initialize feedback service.

        Args:
            db: Database session
        """
        self.db = db
        self.feedback_repository = FeedbackRepository(db)

    async def create_feedback(
        self, feedback_data: FeedbackCreate, user_id: UUID
    ) -> Feedback:
        """Create or update feedback for a message.

        Args:
            feedback_data: Feedback creation data
            user_id: User ID creating the feedback

        Returns:
            Created or updated feedback instance

        Raises:
            ValidationError: If validation fails
            ResourceNotFoundError: If message doesn't exist
        """
        # Verify message exists
        from app.repositories.message_repository import MessageRepository

        message_repo = MessageRepository(self.db)
        message = await message_repo.get_message_by_id(feedback_data.message_id)
        if not message:
            raise ResourceNotFoundError(
                resource=f"Message with id '{feedback_data.message_id}'"
            )

        # Check if feedback already exists for this message
        existing_feedback = await self.feedback_repository.get_by_message_id(
            feedback_data.message_id
        )

        try:
            if existing_feedback:
                # Update existing feedback
                update_dict = {
                    "rating": feedback_data.rating,
                    "comment": feedback_data.comment,
                }
                feedback = await self.feedback_repository.update(
                    existing_feedback.id, update_dict
                )
                await self.db.commit()
                await self.db.refresh(feedback)

                logger.info(
                    "Updated feedback: id=%s, message_id=%s, rating=%s",
                    feedback.id,
                    feedback.message_id,
                    feedback.rating,
                )
            else:
                # Create new feedback
                feedback_dict = feedback_data.model_dump()
                feedback_dict["user_id"] = user_id
                feedback = await self.feedback_repository.create(feedback_dict)
                await self.db.commit()
                await self.db.refresh(feedback)

                logger.info(
                    "Created feedback: id=%s, message_id=%s, rating=%s",
                    feedback.id,
                    feedback.message_id,
                    feedback.rating,
                )

            return feedback

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to create/update feedback: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to create/update feedback: {str(e)}",
                details={"error": str(e)},
            ) from e

    async def get_feedback_by_message_id(self, message_id: UUID) -> Feedback | None:
        """Get feedback by message ID.

        Args:
            message_id: Message UUID

        Returns:
            Feedback instance or None if not found
        """
        return await self.feedback_repository.get_by_message_id(message_id)

    async def delete_feedback(self, message_id: UUID) -> bool:
        """Delete feedback for a message.

        Args:
            message_id: Message UUID

        Returns:
            True if deleted, False if not found

        Raises:
            ResourceNotFoundError: If feedback not found
        """
        feedback = await self.feedback_repository.get_by_message_id(message_id)
        if not feedback:
            raise ResourceNotFoundError(
                resource=f"Feedback for message id '{message_id}'"
            )

        try:
            result = await self.feedback_repository.delete(feedback.id)
            await self.db.commit()

            logger.info("Deleted feedback: message_id=%s", message_id)

            return result

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to delete feedback: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to delete feedback: {str(e)}",
                details={"error": str(e)},
            ) from e

