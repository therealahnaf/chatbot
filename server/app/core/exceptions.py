"""Custom exception classes for the application."""

from typing import Any, Optional


class AppException(Exception):
    """Base exception class for all application exceptions."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """
        Initialize the exception.

        Args:
            message: The error message
            status_code: HTTP status code
            details: Additional error details
        """
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(AppException):
    """Exception raised for authentication failures."""

    def __init__(
        self,
        message: str = "Authentication failed",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize authentication error with 401 status code."""
        super().__init__(message=message, status_code=401, details=details)


class AuthorizationError(AppException):
    """Exception raised for authorization failures."""

    def __init__(
        self,
        message: str = "Insufficient permissions",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize authorization error with 403 status code."""
        super().__init__(message=message, status_code=403, details=details)


class ValidationError(AppException):
    """Exception raised for validation failures."""

    def __init__(
        self,
        message: str = "Validation failed",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize validation error with 422 status code."""
        super().__init__(message=message, status_code=422, details=details)


class ResourceNotFoundError(AppException):
    """Exception raised when a requested resource is not found."""

    def __init__(
        self,
        resource: str = "Resource",
        resource_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """
        Initialize resource not found error with 404 status code.

        Args:
            resource: The type of resource that was not found
            resource_id: The ID of the resource that was not found
            details: Additional error details
        """
        message = f"{resource} not found"
        if resource_id:
            message = f"{resource} with ID '{resource_id}' not found"

        super().__init__(message=message, status_code=404, details=details)


class ResourceAlreadyExistsError(AppException):
    """Exception raised when attempting to create a resource that already exists."""

    def __init__(
        self,
        resource: str = "Resource",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize resource already exists error with 409 status code."""
        message = f"{resource} already exists"
        super().__init__(message=message, status_code=409, details=details)


class ExternalServiceError(AppException):
    """Exception raised for external service failures."""

    def __init__(
        self,
        service: str,
        message: str = "External service error",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """
        Initialize external service error with 502 status code.

        Args:
            service: The name of the external service
            message: The error message
            details: Additional error details
        """
        full_message = f"{service}: {message}"
        super().__init__(message=full_message, status_code=502, details=details)


class RateLimitError(AppException):
    """Exception raised when rate limit is exceeded."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """
        Initialize rate limit error with 429 status code.

        Args:
            message: The error message
            retry_after: Seconds until rate limit resets
            details: Additional error details
        """
        error_details = details or {}
        if retry_after:
            error_details["retry_after"] = retry_after

        super().__init__(message=message, status_code=429, details=error_details)


class DatabaseError(AppException):
    """Exception raised for database operation failures."""

    def __init__(
        self,
        message: str = "Database operation failed",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize database error with 500 status code."""
        super().__init__(message=message, status_code=500, details=details)


class CacheError(AppException):
    """Exception raised for cache operation failures."""

    def __init__(
        self,
        message: str = "Cache operation failed",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize cache error with 500 status code."""
        super().__init__(message=message, status_code=500, details=details)


class AgentError(AppException):
    """Exception raised for agent processing failures."""

    def __init__(
        self,
        message: str = "Agent processing failed",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize agent error with 500 status code."""
        super().__init__(message=message, status_code=500, details=details)


class ToolExecutionError(AppException):
    """Exception raised for tool execution failures."""

    def __init__(
        self,
        tool_name: str,
        message: str = "Tool execution failed",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """
        Initialize tool execution error with 500 status code.

        Args:
            tool_name: The name of the tool that failed
            message: The error message
            details: Additional error details
        """
        full_message = f"Tool '{tool_name}': {message}"
        super().__init__(message=full_message, status_code=500, details=details)


class FileUploadError(AppException):
    """Exception raised for file upload failures."""

    def __init__(
        self,
        message: str = "File upload failed",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize file upload error with 400 status code."""
        super().__init__(message=message, status_code=400, details=details)


class ConfigurationError(AppException):
    """Exception raised for configuration errors."""

    def __init__(
        self,
        message: str = "Configuration error",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        """Initialize configuration error with 500 status code."""
        super().__init__(message=message, status_code=500, details=details)
