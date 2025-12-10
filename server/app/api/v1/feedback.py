"""Feedback API endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services.feedback.feedback_service import FeedbackService

router = APIRouter(prefix="/feedback", tags=["Feedback"])


def get_feedback_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FeedbackService:
    """Dependency to get feedback service instance."""
    return FeedbackService(db=db)


@router.post("", response_model=FeedbackResponse, status_code=201)
async def create_feedback(
    feedback_data: FeedbackCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    feedback_service: Annotated[FeedbackService, Depends(get_feedback_service)],
) -> FeedbackResponse:
    """Create or update feedback for a message."""
    try:
        feedback = await feedback_service.create_feedback(
            feedback_data, current_user.id
        )
        return FeedbackResponse.model_validate(feedback)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/message/{message_id}", response_model=FeedbackResponse | None)
async def get_feedback_by_message(
    message_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    feedback_service: Annotated[FeedbackService, Depends(get_feedback_service)],
) -> FeedbackResponse | None:
    """Get feedback for a specific message."""
    try:
        feedback = await feedback_service.get_feedback_by_message_id(message_id)
        if feedback:
            return FeedbackResponse.model_validate(feedback)
        return None
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("/message/{message_id}", status_code=204)
async def delete_feedback(
    message_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    feedback_service: Annotated[FeedbackService, Depends(get_feedback_service)],
) -> None:
    """Delete feedback for a message."""
    try:
        await feedback_service.delete_feedback(message_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

