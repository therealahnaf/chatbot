"""Global error handling middleware."""

from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging import get_logger

logger = get_logger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware for global error handling."""

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """
        Process request and handle errors.

        Args:
            request: The incoming request
            call_next: The next middleware or route handler

        Returns:
            Response from the next handler or error response
        """
        try:
            response = await call_next(request)
            return response

        except AppException as e:
            # Handle application-specific exceptions
            return await self._handle_app_exception(request, e)

        except PydanticValidationError as e:
            # Handle Pydantic validation errors
            return await self._handle_validation_error(request, e)

        except SQLAlchemyError as e:
            # Handle database errors
            return await self._handle_database_error(request, e)

        except Exception as e:
            # Handle unexpected errors
            return await self._handle_unexpected_error(request, e)

    async def _handle_app_exception(
        self, request: Request, exc: AppException
    ) -> JSONResponse:
        """
        Handle application-specific exceptions.

        Args:
            request: The incoming request
            exc: The application exception

        Returns:
            JSON error response
        """
        correlation_id = getattr(request.state, "request_id", "unknown")
        user_id = getattr(request.state, "user_id", None)

        logger.warning(
            "Application exception",
            correlation_id=correlation_id,
            user_id=user_id,
            path=request.url.path,
            error_type=type(exc).__name__,
            error_message=exc.message,
            status_code=exc.status_code
        )

        error_response = {
            "error": {
                "code": type(exc).__name__,
                "message": exc.message,
                "request_id": correlation_id
            }
        }

        # Add details in development mode
        if not settings.is_production and exc.details:
            error_response["error"]["details"] = exc.details

        return JSONResponse(
            status_code=exc.status_code,
            content=error_response
        )

    async def _handle_validation_error(
        self, request: Request, exc: PydanticValidationError
    ) -> JSONResponse:
        """
        Handle Pydantic validation errors.

        Args:
            request: The incoming request
            exc: The validation error

        Returns:
            JSON error response
        """
        correlation_id = getattr(request.state, "request_id", "unknown")
        user_id = getattr(request.state, "user_id", None)

        logger.warning(
            "Validation error",
            correlation_id=correlation_id,
            user_id=user_id,
            path=request.url.path,
            errors=exc.errors()
        )

        error_response = {
            "error": {
                "code": "ValidationError",
                "message": "Request validation failed",
                "request_id": correlation_id
            }
        }

        # Add validation details in development mode
        if not settings.is_production:
            error_response["error"]["details"] = exc.errors()

        return JSONResponse(
            status_code=422,
            content=error_response
        )

    async def _handle_database_error(
        self, request: Request, exc: SQLAlchemyError
    ) -> JSONResponse:
        """
        Handle database errors.

        Args:
            request: The incoming request
            exc: The database error

        Returns:
            JSON error response
        """
        correlation_id = getattr(request.state, "request_id", "unknown")
        user_id = getattr(request.state, "user_id", None)

        logger.error(
            "Database error",
            correlation_id=correlation_id,
            user_id=user_id,
            path=request.url.path,
            error=str(exc),
            error_type=type(exc).__name__
        )

        error_response = {
            "error": {
                "code": "DatabaseError",
                "message": "A database error occurred",
                "request_id": correlation_id
            }
        }

        # Add error details in development mode
        if not settings.is_production:
            error_response["error"]["details"] = {
                "error_type": type(exc).__name__,
                "error_message": str(exc)
            }

        return JSONResponse(
            status_code=500,
            content=error_response
        )

    async def _handle_unexpected_error(
        self, request: Request, exc: Exception
    ) -> JSONResponse:
        """
        Handle unexpected errors.

        Args:
            request: The incoming request
            exc: The unexpected error

        Returns:
            JSON error response
        """
        correlation_id = getattr(request.state, "request_id", "unknown")
        user_id = getattr(request.state, "user_id", None)

        logger.error(
            "Unexpected error",
            correlation_id=correlation_id,
            user_id=user_id,
            path=request.url.path,
            error=str(exc),
            error_type=type(exc).__name__,
            exc_info=True  # Include stack trace
        )

        error_response = {
            "error": {
                "code": "InternalServerError",
                "message": "An unexpected error occurred",
                "request_id": correlation_id
            }
        }

        # Add error details in development mode
        if not settings.is_production:
            error_response["error"]["details"] = {
                "error_type": type(exc).__name__,
                "error_message": str(exc)
            }

        return JSONResponse(
            status_code=500,
            content=error_response
        )


def get_error_status_code(exc: Exception) -> int:
    """
    Get HTTP status code for an exception.

    Args:
        exc: The exception

    Returns:
        HTTP status code
    """
    if isinstance(exc, AppException):
        return exc.status_code

    if isinstance(exc, PydanticValidationError):
        return 422

    if isinstance(exc, SQLAlchemyError):
        return 500

    return 500


def format_error_response(
    exc: Exception,
    request_id: str,
    include_details: bool = False
) -> dict:
    """
    Format error response.

    Args:
        exc: The exception
        request_id: Request correlation ID
        include_details: Whether to include error details

    Returns:
        Formatted error response dictionary
    """
    if isinstance(exc, AppException):
        error_response = {
            "error": {
                "code": type(exc).__name__,
                "message": exc.message,
                "request_id": request_id
            }
        }

        if include_details and exc.details:
            error_response["error"]["details"] = exc.details

        return error_response

    # Generic error response
    error_response = {
        "error": {
            "code": type(exc).__name__,
            "message": "An error occurred",
            "request_id": request_id
        }
    }

    if include_details:
        error_response["error"]["details"] = {
            "error_type": type(exc).__name__,
            "error_message": str(exc)
        }

    return error_response
