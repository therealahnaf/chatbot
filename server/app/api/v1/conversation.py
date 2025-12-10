"""Conversation API endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.feedback import FeedbackResponse

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.common import PaginatedResponse
from app.schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    ConversationWithDetails,
    MessageResponse,
)
from app.services.conversation.conversation_service import ConversationService
from app.services.messages.message_service import MessageService

router = APIRouter(prefix="/conversations", tags=["Conversations"])


def get_conversation_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationService:
    """Dependency to get conversation service instance."""
    return ConversationService(db=db)


def get_message_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageService:
    """Dependency to get message service instance."""
    return MessageService(db=db)


@router.get("/{conversation_id}", response_model=ConversationWithDetails)
async def get_conversation(
    conversation_id: UUID,
    _current_user: Annotated[User, Depends(get_current_user)],
    conversation_service: Annotated[
        ConversationService, Depends(get_conversation_service)
    ],
) -> ConversationWithDetails:
    """Get conversation by ID with messages."""
    try:
        conversation = await conversation_service.get_conversation_by_id(
            conversation_id, load_messages=True
        )
        return ConversationWithDetails.model_validate(conversation)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("", response_model=PaginatedResponse[ConversationWithDetails])
async def get_all_conversations(
    _current_user: Annotated[User, Depends(get_current_user)],
    conversation_service: Annotated[
        ConversationService, Depends(get_conversation_service)
    ],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    order_by: Annotated[str | None, Query()] = None,
) -> PaginatedResponse[ConversationWithDetails]:
    """Get all conversations without messages."""
    try:
        conversations, total_count = await conversation_service.get_all_conversations(
            skip=skip, limit=limit, filters=None, order_by=order_by, load_messages=False
        )
        
        # Construct conversation responses without messages
        conversation_responses = []
        for conv in conversations:
            conversation_responses.append(
                ConversationWithDetails(
                    id=conv.id,
                    user_id=conv.user_id,
                    title=conv.title,
                    created_at=conv.created_at,
                    updated_at=conv.updated_at,
                    messages=[],  # Empty messages list for list endpoint
                )
            )
        
        return PaginatedResponse(
            items=conversation_responses,
            total=total_count,
            skip=skip,
            limit=limit,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages_by_conversation(
    conversation_id: UUID,
    _current_user: Annotated[User, Depends(get_current_user)],
    message_service: Annotated[MessageService, Depends(get_message_service)],
) -> list[MessageResponse]:
    """Get all messages by conversation ID."""
    try:
        messages = await message_service.get_messages_by_conversation_id(
            conversation_id
        )
        # Manually construct response to avoid SQLAlchemy MetaData conflict
         
        
        message_responses = []
        for msg in messages:
            # Get feedback if it exists
            feedback = None
            if msg.feedback:
                feedback = FeedbackResponse.model_validate(msg.feedback)
            
            # Get metadata - ensure it's a dict or None
            metadata = msg.msg_metadata
            if metadata is not None and not isinstance(metadata, dict):
                metadata = None
            
            message_responses.append(
                MessageResponse(
                    id=msg.id,
                    conversation_id=msg.conversation_id,
                    role=msg.role,
                    content=msg.content,
                    metadata=metadata,
                    created_at=msg.created_at,
                    feedback=feedback,
                )
            )
        return message_responses
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

@router.post("", response_model=ConversationWithDetails, status_code=201)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    conversation_service: Annotated[
        ConversationService, Depends(get_conversation_service)
    ],
) -> ConversationWithDetails:
    """Create a new conversation."""
    try:
        conversation = await conversation_service.create_conversation(
            conversation_data, user_id=current_user.id
        )
        # Load messages for the response
        conversation = await conversation_service.get_conversation_by_id(
            conversation.id, load_messages=True
        )
        return ConversationWithDetails.model_validate(conversation)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{conversation_id}", response_model=ConversationWithDetails)
async def update_conversation(
    conversation_id: UUID,
    conversation_data: ConversationUpdate,
    _current_user: Annotated[User, Depends(get_current_user)],
    conversation_service: Annotated[
        ConversationService, Depends(get_conversation_service)
    ],
) -> ConversationWithDetails:
    """Update a conversation."""
    try:
        conversation = await conversation_service.update_conversation(
            conversation_id, conversation_data
        )
        # Load messages for the response
        conversation = await conversation_service.get_conversation_by_id(
            conversation.id, load_messages=True
        )
        return ConversationWithDetails.model_validate(conversation)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{conversation_id}", response_model=bool)
async def delete_conversation(
    conversation_id: UUID,
    _current_user: Annotated[User, Depends(get_current_user)],
    conversation_service: Annotated[
        ConversationService, Depends(get_conversation_service)
    ],
) -> bool:
    """Delete a conversation."""
    try:
        return await conversation_service.delete_conversation(conversation_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e)) from e