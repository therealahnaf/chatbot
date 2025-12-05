"""Conversation and message schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.feedback import FeedbackResponse
     


class MessageCreate(BaseModel):
    """Request schema for creating a message."""

    conversation_id: UUID = Field(..., description="Conversation ID")
    role: str = Field(..., description="Message role (user/assistant)")
    content: str = Field(..., min_length=1, description="Message content")
    metadata: dict[str, Any] | None = Field(None, description="Message metadata")

    model_config = {"from_attributes": True}


class MessageUpdate(BaseModel):
    """Request schema for updating a message."""

    content: str | None = Field(None, min_length=1, description="Message content")
    metadata: dict[str, Any] | None = Field(None, description="Message metadata")

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """Response schema for a message."""

    id: UUID = Field(..., description="Message ID")
    conversation_id: UUID = Field(..., description="Conversation ID")
    role: str = Field(..., description="Message role (user/assistant)")
    content: str = Field(..., description="Message content")
    metadata: dict[str, Any] | None = Field(None, description="Message metadata")
    created_at: datetime = Field(..., description="Message creation timestamp")
    feedback: "FeedbackResponse | None" = Field(None, description="Feedback for this message")

    @model_validator(mode="before")
    @classmethod
    def map_msg_metadata(cls, data: Any) -> Any:
        """Map msg_metadata to metadata when loading from model."""
        if isinstance(data, dict):
            if "msg_metadata" in data and "metadata" not in data:
                data["metadata"] = data.pop("msg_metadata")
        elif hasattr(data, "msg_metadata") and not hasattr(data, "metadata"):
            # For SQLAlchemy model instances
            data_dict = {
                "id": getattr(data, "id", None),
                "conversation_id": getattr(data, "conversation_id", None),
                "role": getattr(data, "role", None),
                "content": getattr(data, "content", None),
                "metadata": getattr(data, "msg_metadata", None),
                "created_at": getattr(data, "created_at", None),
                "feedback": getattr(data, "feedback", None),
            }
            return data_dict
        return data

    model_config = {"from_attributes": True}


class ConversationCreate(BaseModel):
    """Request schema for creating a conversation."""

    title: str | None = Field(None, max_length=500, description="Conversation title")
    metadata: dict[str, Any] | None = Field(None, description="Conversation metadata")
    # SIP-specific fields (optional, for SIP calls)
    phone_number: str | None = Field(None, max_length=50, description="Phone number for SIP calls")


class ConversationUpdate(BaseModel):
    """Request schema for updating a conversation."""

    title: str | None = Field(None, max_length=500, description="Conversation title")
    metadata: dict[str, Any] | None = Field(None, description="Conversation metadata")
    


class ConversationResponse(BaseModel):
    """Response schema for a conversation."""

    id: UUID = Field(..., description="Conversation ID")
    user_id: UUID | None = Field(None, description="User ID")
    title: str | None = Field(None, description="Conversation title")
    metadata: dict[str, Any] | None = Field(None, description="Conversation metadata")
    # SIP-specific fields
    phone_number: str | None = Field(None, description="Phone number for SIP calls")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    @model_validator(mode="before")
    @classmethod
    def map_conv_metadata(cls, data: Any) -> Any:
        """Map conv_metadata to metadata when loading from model."""
        if isinstance(data, dict):
            if "conv_metadata" in data and "metadata" not in data:
                data["metadata"] = data.pop("conv_metadata")
        elif hasattr(data, "conv_metadata") and not hasattr(data, "metadata"):
            # For SQLAlchemy model instances
            data_dict = {
                "id": getattr(data, "id", None),
                "user_id": getattr(data, "user_id", None),
                "title": getattr(data, "title", None),
                "metadata": getattr(data, "conv_metadata", None),
                "phone_number": getattr(data, "phone_number", None),
                "created_at": getattr(data, "created_at", None),
                "updated_at": getattr(data, "updated_at", None),
            }
            return data_dict
        return data

    model_config = {"from_attributes": True}


class ConversationWithDetails(ConversationResponse):
    """Conversation with messages and feedback."""

    messages: list[MessageResponse] = Field(default_factory=list, description="Conversation messages")

    model_config = {"from_attributes": True}
    


# Import here to avoid circular dependency
   # noqa: E402

MessageResponse.model_rebuild()
