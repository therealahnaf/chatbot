"""Analytics schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AnalyticsEventCreate(BaseModel):
    """Request schema for creating an analytics event."""

    event_type: str = Field(..., max_length=100, description="Type of event")
    event_data: dict[str, Any] = Field(..., description="Event data")

    model_config = {
        "json_schema_extra": {
            "example": {
                "event_type": "agent_query",
                "event_data": {"query": "What is AI?", "response_time": 1.5, "tokens_used": 150},
            }
        }
    }


class AnalyticsEventResponse(BaseModel):
    """Response schema for an analytics event."""

    id: UUID = Field(..., description="Event ID")
    user_id: UUID | None = Field(None, description="User ID")
    event_type: str = Field(..., description="Event type")
    event_data: dict[str, Any] = Field(..., description="Event data")
    created_at: datetime = Field(..., description="Event timestamp")

    model_config = {"from_attributes": True}


class AnalyticsStats(BaseModel):
    """Analytics statistics response."""

    total_queries: int = Field(..., description="Total number of queries")
    total_tokens: int = Field(..., description="Total tokens used")
    avg_response_time: float = Field(..., description="Average response time in seconds")
    total_conversations: int = Field(..., description="Total conversations")
    total_messages: int = Field(..., description="Total messages")
    period_start: datetime = Field(..., description="Statistics period start")
    period_end: datetime = Field(..., description="Statistics period end")

    model_config = {
        "json_schema_extra": {
            "example": {
                "total_queries": 1000,
                "total_tokens": 150000,
                "avg_response_time": 1.5,
                "total_conversations": 250,
                "total_messages": 2000,
                "period_start": "2025-10-01T00:00:00Z",
                "period_end": "2025-10-31T23:59:59Z",
            }
        }
    }
