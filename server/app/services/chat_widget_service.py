"""Chat widget service for widget management operations."""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AuthorizationError,
    ResourceNotFoundError,
    ValidationError,
)
from app.models.chat_widget import ChatWidget
from app.models.user import User
from app.repositories.chat_widget_repository import ChatWidgetRepository
from app.schemas.chat_widget import ChatWidgetCreate, ChatWidgetUpdate

logger = logging.getLogger(__name__)


class ChatWidgetService:
    """Service for chat widget management operations."""

    def __init__(self, db: AsyncSession):
        """Initialize chat widget service.

        Args:
            db: Database session
        """
        self.db = db
        self.widget_repo = ChatWidgetRepository(db)

    async def create_widget(
        self,
        widget_data: ChatWidgetCreate,
        current_user: User,
    ) -> ChatWidget:
        """Create a new chat widget.

        Args:
            widget_data: Widget creation data
            current_user: Authenticated user creating the widget

        Returns:
            Created widget instance

        Raises:
            ValidationError: If validation fails
        """
        # Prepare widget data
        widget_dict = widget_data.model_dump()
        widget_dict["user_id"] = current_user.id

        # Convert nested models to dict for JSONB storage
        if "colors" in widget_dict and hasattr(widget_dict["colors"], "model_dump"):
            widget_dict["colors"] = widget_dict["colors"].model_dump(by_alias=True)
        if "radius" in widget_dict and hasattr(widget_dict["radius"], "model_dump"):
            widget_dict["radius"] = widget_dict["radius"].model_dump(by_alias=True)
        if "init_page" in widget_dict and hasattr(widget_dict["init_page"], "model_dump"):
            widget_dict["init_page"] = widget_dict["init_page"].model_dump(by_alias=True)

        try:
            widget = await self.widget_repo.create(widget_dict)
            await self.db.commit()
            await self.db.refresh(widget)

            logger.info(
                "Created chat widget: id=%s, name=%s, user_id=%s",
                widget.id,
                widget.name,
                widget.user_id,
            )

            return widget

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to create chat widget: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to create chat widget: {str(e)}",
                details={"error": str(e)},
            ) from e

    async def get_widget(
        self,
        widget_id: UUID,
        current_user: User,
    ) -> ChatWidget:
        """Get widget by UUID.

        Args:
            widget_id: The widget UUID
            current_user: Authenticated user

        Returns:
            Widget instance

        Raises:
            ResourceNotFoundError: If widget not found
            AuthorizationError: If user doesn't own the widget
        """
        widget = await self.widget_repo.get(widget_id)
        if not widget:
            raise ResourceNotFoundError(
                resource="ChatWidget",
                resource_id=str(widget_id),
            )

        # Check if user owns the widget
        if widget.user_id != current_user.id:
            raise AuthorizationError(
                message="You don't have permission to access this widget"
            )

        return widget

    async def get_widget_public(
        self,
        widget_id: UUID,
    ) -> ChatWidget:
        """Get widget by UUID for public access (no authentication required).

        This method is used for public widget embeds. It only returns widgets
        that are enabled.

        Args:
            widget_id: The widget UUID

        Returns:
            Widget instance

        Raises:
            ResourceNotFoundError: If widget not found or disabled
        """
        widget = await self.widget_repo.get(widget_id)
        if not widget:
            raise ResourceNotFoundError(
                resource="ChatWidget",
                resource_id=str(widget_id),
            )

        # Only return enabled widgets for public access
        if not widget.enabled:
            raise ResourceNotFoundError(
                resource="ChatWidget",
                resource_id=str(widget_id),
                details={"reason": "Widget is disabled"},
            )

        return widget

    async def list_widgets(
        self,
        current_user: User,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        enabled: bool | None = None,
        sort_by: str | None = None,
        sort_order: str = "desc",
    ) -> tuple[list[ChatWidget], int]:
        """List widgets for current user with pagination and filters.

        Args:
            current_user: Authenticated user
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search term for name
            enabled: Filter by enabled status
            sort_by: Field name to sort by
            sort_order: Sort order ('asc' or 'desc')

        Returns:
            Tuple of (list of widgets, total count)
        """
        return await self.widget_repo.list_widgets(
            user_id=current_user.id,
            skip=skip,
            limit=limit,
            search=search,
            enabled=enabled,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    async def update_widget(
        self,
        widget_id: UUID,
        widget_data: ChatWidgetUpdate,
        current_user: User,
    ) -> ChatWidget:
        """Update a chat widget.

        Args:
            widget_id: Widget UUID
            widget_data: Widget update data
            current_user: Authenticated user

        Returns:
            Updated widget instance

        Raises:
            ResourceNotFoundError: If widget not found
            AuthorizationError: If user doesn't own the widget
            ValidationError: If update fails
        """
        # Get and verify ownership
        widget = await self.get_widget(widget_id, current_user)

        # Prepare update data (exclude unset fields)
        update_dict = widget_data.model_dump(exclude_unset=True)

        # Convert nested models to dict for JSONB storage
        if "colors" in update_dict and update_dict["colors"] is not None:
            if hasattr(update_dict["colors"], "model_dump"):
                update_dict["colors"] = update_dict["colors"].model_dump(by_alias=True)
        if "radius" in update_dict and update_dict["radius"] is not None:
            if hasattr(update_dict["radius"], "model_dump"):
                update_dict["radius"] = update_dict["radius"].model_dump(by_alias=True)
        if "init_page" in update_dict and update_dict["init_page"] is not None:
            if hasattr(update_dict["init_page"], "model_dump"):
                update_dict["init_page"] = update_dict["init_page"].model_dump(by_alias=True)

        try:
            updated_widget = await self.widget_repo.update(widget_id, update_dict)
            await self.db.commit()
            await self.db.refresh(updated_widget)

            logger.info(
                "Updated chat widget: id=%s, name=%s",
                updated_widget.id,
                updated_widget.name,
            )

            return updated_widget

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to update chat widget: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to update chat widget: {str(e)}",
                details={"error": str(e)},
            ) from e

    async def delete_widget(
        self,
        widget_id: UUID,
        current_user: User,
    ) -> bool:
        """Delete a chat widget.

        Args:
            widget_id: Widget UUID
            current_user: Authenticated user

        Returns:
            True if deleted successfully

        Raises:
            ResourceNotFoundError: If widget not found
            AuthorizationError: If user doesn't own the widget
        """
        # Get and verify ownership
        widget = await self.get_widget(widget_id, current_user)

        try:
            await self.widget_repo.delete(widget_id)
            await self.db.commit()

            logger.info(
                "Deleted chat widget: id=%s, name=%s",
                widget_id,
                widget.name,
            )

            return True

        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to delete chat widget: %s", e, exc_info=True)
            raise ValidationError(
                message=f"Failed to delete chat widget: {str(e)}",
                details={"error": str(e)},
            ) from e
