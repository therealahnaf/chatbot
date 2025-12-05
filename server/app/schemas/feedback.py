"""Feedback schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    """Request schema for creating feedback."""

    message_id: UUID = Field(..., description="Message ID to provide feedback for")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: str | None = Field(None, max_length=2000, description="Optional feedback comment")

    model_config = {
        "json_schema_extra": {
            "example": {"message_id": "123e4567-e89b-12d3-a456-426614174000", "rating": 5, "comment": "Very helpful!"}
        }
    }


class FeedbackResponse(BaseModel):
    """Response schema for feedback."""

    id: UUID = Field(..., description="Feedback ID")
    message_id: UUID = Field(..., description="Message ID")
    user_id: UUID = Field(..., description="User ID")
    rating: int = Field(..., description="Rating (1-5)")
    comment: str | None = Field(None, description="Feedback comment")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = {"from_attributes": True}
