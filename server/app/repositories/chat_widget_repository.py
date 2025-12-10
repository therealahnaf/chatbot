"""Chat widget repository for data access operations."""

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_widget import ChatWidget
from app.repositories.base import BaseRepository


class ChatWidgetRepository(BaseRepository[ChatWidget]):
    """Repository for ChatWidget model with specialized query methods."""

    def __init__(self, db: AsyncSession):
        """Initialize chat widget repository.

        Args:
            db: Async database session
        """
        super().__init__(ChatWidget, db)

    async def get_by_user(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ChatWidget]:
        """Get all widgets for a specific user.

        Args:
            user_id: User UUID
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return

        Returns:
            List of ChatWidget instances
        """
        query = (
            select(ChatWidget)
            .where(ChatWidget.user_id == user_id)
            .order_by(ChatWidget.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_by_user(self, user_id: UUID) -> int:
        """Count widgets for a specific user.

        Args:
            user_id: User UUID

        Returns:
            Count of widgets for the user
        """
        query = select(func.count()).select_from(ChatWidget).where(ChatWidget.user_id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def list_widgets(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        enabled: bool | None = None,
        sort_by: str | None = None,
        sort_order: str = "desc",
    ) -> tuple[list[ChatWidget], int]:
        """List widgets with pagination, search, filter, and sort.

        Args:
            user_id: User UUID to filter by
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            search: Search term for name (case-insensitive, partial match)
            enabled: Filter by enabled status
            sort_by: Field name to sort by (defaults to created_at)
            sort_order: Sort order ('asc' or 'desc')

        Returns:
            Tuple of (list of widgets, total count)
        """
        # Build base query
        query = select(ChatWidget).where(ChatWidget.user_id == user_id)
        count_query = select(func.count()).select_from(ChatWidget).where(ChatWidget.user_id == user_id)

        # Apply search filter (case-insensitive partial match on name)
        if search:
            search_filter = ChatWidget.name.ilike(f"%{search}%")
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Apply enabled filter
        if enabled is not None:
            query = query.where(ChatWidget.enabled == enabled)
            count_query = count_query.where(ChatWidget.enabled == enabled)

        # Apply sorting
        sort_field = sort_by or "created_at"
        if hasattr(ChatWidget, sort_field):
            order_column = getattr(ChatWidget, sort_field)
            if sort_order == "desc":
                query = query.order_by(order_column.desc())
            else:
                query = query.order_by(order_column.asc())
        else:
            # Default sort by created_at desc
            query = query.order_by(ChatWidget.created_at.desc())

        # Apply pagination
        query = query.offset(skip).limit(limit)

        # Execute queries
        result = await self.db.execute(query)
        widgets = list(result.scalars().all())

        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        return widgets, total

    async def get_by_id_and_user(
        self, widget_id: UUID, user_id: UUID
    ) -> ChatWidget | None:
        """Get a widget by ID and user (to ensure user owns the widget).

        Args:
            widget_id: Widget UUID
            user_id: User UUID

        Returns:
            ChatWidget instance or None if not found
        """
        result = await self.db.execute(
            select(ChatWidget).where(
                ChatWidget.id == widget_id,
                ChatWidget.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()
