"""Application constants."""

from enum import Enum


# User Roles
class UserRole(str, Enum):
    """User role enumeration."""

    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


# Agent Intents
class AgentIntent(str, Enum):
    """Agent intent classification."""

    GENERAL_QUERY = "general_query"
    KB_SEARCH = "kb_search"
    WEB_SEARCH = "web_search"
    API_QUERY = "api_query"
    CONVERSATION_MANAGEMENT = "conversation_management"


# Message Roles
class MessageRole(str, Enum):
    """Message role in conversation."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# Tool Names
class ToolName(str, Enum):
    """Available tool names."""

    WEB_SEARCH = "web_search"
    API_SEARCH = "api_search"
    KB_SEARCH = "kb_search"


# Document Types
class DocumentType(str, Enum):
    """Supported document types."""

    PDF = "pdf"
    TXT = "txt"
    DOCX = "docx"
    MD = "md"


# Event Types for Analytics
class EventType(str, Enum):
    """Analytics event types."""

    AGENT_QUERY = "agent_query"
    TOOL_CALL = "tool_call"
    DOCUMENT_UPLOAD = "document_upload"
    DOCUMENT_DELETE = "document_delete"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    FEEDBACK_SUBMITTED = "feedback_submitted"


# HTTP Status Messages
HTTP_200_OK = "Success"
HTTP_201_CREATED = "Created"
HTTP_400_BAD_REQUEST = "Bad Request"
HTTP_401_UNAUTHORIZED = "Unauthorized"
HTTP_403_FORBIDDEN = "Forbidden"
HTTP_404_NOT_FOUND = "Not Found"
HTTP_422_UNPROCESSABLE_ENTITY = "Validation Error"
HTTP_429_TOO_MANY_REQUESTS = "Too Many Requests"
HTTP_500_INTERNAL_SERVER_ERROR = "Internal Server Error"

# Rate Limit Messages
RATE_LIMIT_EXCEEDED = "Rate limit exceeded. Please try again later."

# Authentication Messages
INVALID_CREDENTIALS = "Invalid email or password"
INVALID_TOKEN = "Invalid or expired token"
INSUFFICIENT_PERMISSIONS = "Insufficient permissions"

# Validation Messages
INVALID_FILE_TYPE = "Invalid file type. Allowed types: {allowed_types}"
FILE_TOO_LARGE = "File size exceeds maximum allowed size of {max_size}MB"
INVALID_EMAIL = "Invalid email address"
WEAK_PASSWORD = "Password must be at least 8 characters long"

# Agent Messages
AGENT_TIMEOUT = "Agent processing timeout. Please try again."
AGENT_ERROR = "An error occurred while processing your request"
NO_RESULTS_FOUND = "No results found for your query"

# Cache Keys
CACHE_KEY_USER_PROFILE = "user:{user_id}"
CACHE_KEY_QUERY = "query:{query_hash}"
CACHE_KEY_RATE_LIMIT = "rate_limit:{user_id}:{endpoint}"
CACHE_KEY_SESSION = "session:{user_id}"

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Token Limits
MAX_CONVERSATION_TOKENS = 8000
MAX_QUERY_LENGTH = 2000

# Timeouts (seconds)
DEFAULT_REQUEST_TIMEOUT = 30
AGENT_PROCESSING_TIMEOUT = 60
DATABASE_QUERY_TIMEOUT = 10

# Retry Configuration
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 1
