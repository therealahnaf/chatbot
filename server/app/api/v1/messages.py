"""Message API endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.common import PaginatedResponse
from app.schemas.conversation import MessageCreate, MessageResponse, MessageUpdate
from app.services.messages.message_service import MessageService

router = APIRouter(prefix="/messages", tags=["Messages"])


def get_message_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageService:
    """Dependency to get message service instance."""
    return MessageService(db=db)


@router.post("", response_model=MessageResponse, status_code=201)
async def create_message(
    message_data: MessageCreate,
    _current_user: Annotated[User, Depends(get_current_user)],
    message_service: Annotated[MessageService, Depends(get_message_service)],
) -> MessageResponse:
    """Create a new message."""
    try:
        message = await message_service.create_message(message_data)
        return MessageResponse.model_validate(message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: UUID,
    _current_user: Annotated[User, Depends(get_current_user)],
    message_service: Annotated[MessageService, Depends(get_message_service)],
) -> MessageResponse:
    """Get message by ID."""
    try:
        message = await message_service.get_message_by_id(message_id)
        return MessageResponse.model_validate(message)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("", response_model=PaginatedResponse[MessageResponse])
async def get_messages_by_conversation(
    conversation_id: Annotated[UUID, Query(..., description="Conversation ID")],
    _current_user: Annotated[User, Depends(get_current_user)],
    message_service: Annotated[MessageService, Depends(get_message_service)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> PaginatedResponse[MessageResponse]:
    """Get messages by conversation ID with pagination."""
    try:
        messages = await message_service.get_messages_by_conversation_id(
            conversation_id, skip=skip, limit=limit
        )
        # Get total count for pagination
        from app.repositories.message_repository import MessageRepository

        message_repo = MessageRepository(message_service.db)
        total_count = await message_repo.count(filters={"conversation_id": conversation_id})

        return PaginatedResponse(
            items=[MessageResponse.model_validate(msg) for msg in messages],
            total=total_count,
            skip=skip,
            limit=limit,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: UUID,
    message_data: MessageUpdate,
    _current_user: Annotated[User, Depends(get_current_user)],
    message_service: Annotated[MessageService, Depends(get_message_service)],
) -> MessageResponse:
    """Update a message."""
    try:
        message = await message_service.update_message(message_id, message_data)
        return MessageResponse.model_validate(message)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{message_id}", response_model=bool)
async def delete_message(
    message_id: UUID,
    _current_user: Annotated[User, Depends(get_current_user)],
    message_service: Annotated[MessageService, Depends(get_message_service)],
) -> bool:
    """Delete a message."""
    try:
        return await message_service.delete_message(message_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

