"""Agent request and response schemas."""

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
    """Request schema for agent query."""

    query: str = Field(..., min_length=1, max_length=2000, description="User query")
    conversation_id: UUID | None = Field(None, description="Optional conversation ID")

    model_config = {"json_schema_extra": {"example": {"query": "What is machine learning?"}}}


class ToolResult(BaseModel):
    """Tool execution result."""

    tool_name: str = Field(..., description="Name of the tool")
    status: str = Field(..., description="Execution status (success/error)")
    result: Any = Field(None, description="Tool result data")
    error: str | None = Field(None, description="Error message if failed")


class AgentResponse(BaseModel):
    """Response schema for agent query."""

    conversation_id: UUID = Field(..., description="Conversation ID")
    response: str = Field(..., description="Agent response text")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Response metadata")

    model_config = {
        "json_schema_extra": {
            "example": {
                "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
                "response": "Machine learning is...",
                "metadata": {
                    "tokens_used": 150,
                    "tools_called": ["kb_search"],
                    "response_time": 1.5,
                },
            }
        }
    }
