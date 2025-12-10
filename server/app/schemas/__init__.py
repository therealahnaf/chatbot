"""Pydantic schemas."""

from app.schemas.agent import AgentQueryRequest, AgentResponse, ToolResult
from app.schemas.analytics import AnalyticsEventCreate, AnalyticsEventResponse, AnalyticsStats
from app.schemas.auth import LoginRequest, RefreshRequest, TokenPayload, TokenResponse
from app.schemas.common import ErrorResponse, HealthResponse, PaginatedResponse, PaginationParams
from app.schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationWithDetails,
    MessageCreate,
    MessageResponse,
    MessageUpdate,
)
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.schemas.knowledge_base import (
    DocumentResponse,
    DocumentUpload,
    SearchRequest,
    SearchResponse,
    SearchResult,
)
from app.schemas.project import Project, ProjectCreate, ProjectUpdate
from app.schemas.user import UserCreate, UserResponse, UserUpdate

__all__ = [
    # Auth
    "LoginRequest",
    "TokenResponse",
    "RefreshRequest",
    "TokenPayload",
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    # Project
    "Project",
    "ProjectCreate",
    "ProjectUpdate",
    # Agent
    "AgentQueryRequest",
    "AgentResponse",
    "ToolResult",
    # Conversation
    "ConversationCreate",
    "ConversationResponse",
    "ConversationWithDetails",
    "MessageCreate",
    "MessageResponse",
    "MessageUpdate",
    # Feedback
    "FeedbackCreate",
    "FeedbackResponse",
    # Analytics
    "AnalyticsEventCreate",
    "AnalyticsEventResponse",
    "AnalyticsStats",
    # Knowledge Base
    "DocumentUpload",
    "DocumentResponse",
    "SearchRequest",
    "SearchResponse",
    "SearchResult",
    # Common
    "PaginationParams",
    "PaginatedResponse",
    "ErrorResponse",
    "HealthResponse",
]
