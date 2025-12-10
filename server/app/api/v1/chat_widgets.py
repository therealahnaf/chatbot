"""Chat widget API endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import timedelta

from app.api.deps import get_current_active_user
from app.core.exceptions import (
    AuthorizationError,
    ResourceNotFoundError,
    ValidationError,
)
from app.core.security import create_widget_session_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import WidgetSessionTokenResponse
from app.schemas.chat_widget import (
    ChatWidgetCreate,
    ChatWidgetListResponse,
    ChatWidgetResponse,
    ChatWidgetUpdate,
)
from app.services.chat_widget_service import ChatWidgetService

router = APIRouter(prefix="/chat-widgets", tags=["Chat Widgets"])


def get_chat_widget_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatWidgetService:
    """Dependency to get chat widget service instance."""
    return ChatWidgetService(db=db)


@router.post("", response_model=ChatWidgetResponse, status_code=status.HTTP_201_CREATED)
async def create_widget(
    widget_data: ChatWidgetCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    widget_service: Annotated[ChatWidgetService, Depends(get_chat_widget_service)],
) -> ChatWidgetResponse:
    """
    Create a new chat widget.

    Authenticated users can create chat widgets.

    Args:
        widget_data: Widget creation data
        current_user: Current authenticated user
        widget_service: Chat widget service instance

    Returns:
        Created widget information

    Raises:
        HTTPException: 422 if validation fails
        HTTPException: 401 if not authenticated
    """
    try:
        widget = await widget_service.create_widget(
            widget_data=widget_data,
            current_user=current_user,
        )

        return ChatWidgetResponse.model_validate(widget)

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating chat widget: {str(e)}",
        ) from e


@router.get("", response_model=ChatWidgetListResponse)
async def list_widgets(
    current_user: Annotated[User, Depends(get_current_active_user)],
    widget_service: Annotated[ChatWidgetService, Depends(get_chat_widget_service)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=255)] = None,
    enabled: Annotated[bool | None, Query()] = None,
    sort_by: Annotated[str | None, Query()] = None,
    sort_order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
) -> ChatWidgetListResponse:
    """
    List chat widgets for the current user.

    Args:
        current_user: Current authenticated user
        widget_service: Chat widget service instance
        page: Page number (1-indexed)
        page_size: Number of items per page (max 100)
        search: Search term for widget name
        enabled: Filter by enabled status
        sort_by: Field name to sort by
        sort_order: Sort order ('asc' or 'desc')

    Returns:
        Paginated list of widgets

    Raises:
        HTTPException: 401 if not authenticated
    """
    skip = (page - 1) * page_size
    widgets, total = await widget_service.list_widgets(
        current_user=current_user,
        skip=skip,
        limit=page_size,
        search=search,
        enabled=enabled,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total_pages = (total + page_size - 1) // page_size

    return ChatWidgetListResponse(
        items=[ChatWidgetResponse.model_validate(w) for w in widgets],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{widget_id}", response_model=ChatWidgetResponse)
async def get_widget(
    widget_id: UUID,
    widget_service: Annotated[ChatWidgetService, Depends(get_chat_widget_service)],
) -> ChatWidgetResponse:
    """
    Get a chat widget by ID (public endpoint).

    This endpoint is public and doesn't require authentication.
    Only enabled widgets are returned.

    Args:
        widget_id: The widget UUID
        widget_service: Chat widget service instance

    Returns:
        Widget information

    Raises:
        HTTPException: 404 if widget not found or disabled
    """
    try:
        widget = await widget_service.get_widget_public(widget_id=widget_id)

        return ChatWidgetResponse.model_validate(widget)

    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message or "Widget not found",
        ) from e


@router.patch("/{widget_id}", response_model=ChatWidgetResponse)
async def update_widget(
    widget_id: UUID,
    widget_data: ChatWidgetUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    widget_service: Annotated[ChatWidgetService, Depends(get_chat_widget_service)],
) -> ChatWidgetResponse:
    """
    Update a chat widget.

    Users can only update their own widgets.

    Args:
        widget_id: The widget UUID
        widget_data: Widget update data
        current_user: Current authenticated user
        widget_service: Chat widget service instance

    Returns:
        Updated widget information

    Raises:
        HTTPException: 404 if widget not found
        HTTPException: 403 if user doesn't own the widget
        HTTPException: 422 if validation fails
        HTTPException: 401 if not authenticated
    """
    try:
        widget = await widget_service.update_widget(
            widget_id=widget_id,
            widget_data=widget_data,
            current_user=current_user,
        )

        return ChatWidgetResponse.model_validate(widget)

    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=e.message,
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        ) from e


@router.delete("/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_widget(
    widget_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    widget_service: Annotated[ChatWidgetService, Depends(get_chat_widget_service)],
) -> None:
    """
    Delete a chat widget.

    Users can only delete their own widgets.

    Args:
        widget_id: The widget UUID
        current_user: Current authenticated user
        widget_service: Chat widget service instance

    Raises:
        HTTPException: 404 if widget not found
        HTTPException: 403 if user doesn't own the widget
        HTTPException: 401 if not authenticated
    """
    try:
        await widget_service.delete_widget(
            widget_id=widget_id,
            current_user=current_user,
        )

    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=e.message,
        ) from e


@router.post("/{widget_id}/session-token", response_model=WidgetSessionTokenResponse)
async def get_widget_session_token(
    widget_id: UUID,
    widget_service: Annotated[ChatWidgetService, Depends(get_chat_widget_service)],
) -> WidgetSessionTokenResponse:
    """
    Get a short-lived session token for a chat widget (public endpoint).

    This endpoint allows widgets to obtain a JWT token for authenticated API calls.
    The token expires in 5 minutes and should be refreshed automatically.

    Args:
        widget_id: The widget UUID
        widget_service: Chat widget service instance

    Returns:
        Widget session token with expiration info

    Raises:
        HTTPException: 404 if widget not found or disabled
    """
    try:
        # Verify widget exists and is enabled
        widget = await widget_service.get_widget_public(widget_id=widget_id)

        # Create a short-lived token (5 minutes)
        expires_delta = timedelta(minutes=5)
        token = create_widget_session_token(str(widget_id), expires_delta)

        return WidgetSessionTokenResponse(
            token=token,
            expires_in=int(expires_delta.total_seconds()),
            token_type="bearer",
        )

    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message or "Widget not found",
        ) from e
