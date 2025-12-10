"""Request/response logging middleware."""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests and responses."""

    # Paths to exclude from detailed logging
    EXCLUDED_PATHS = {
        "/health",
        "/metrics",
    }

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """
        Process request and log details.

        Args:
            request: The incoming request
            call_next: The next middleware or route handler

        Returns:
            Response from the next handler
        """
        # Generate correlation ID if not already set
        if not hasattr(request.state, "request_id"):
            request.state.request_id = str(uuid.uuid4())

        correlation_id = request.state.request_id

        # Extract request details
        method = request.method
        path = request.url.path
        client_ip = self._get_client_ip(request)
        user_id = getattr(request.state, "user_id", None)

        # Skip detailed logging for excluded paths
        if path not in self.EXCLUDED_PATHS:
            logger.info(
                "Request started",
                correlation_id=correlation_id,
                method=method,
                path=path,
                client_ip=client_ip,
                user_id=user_id,
                query_params=dict(request.query_params) if request.query_params else None
            )

        # Record start time
        start_time = time.time()

        # Process request
        try:
            response = await call_next(request)

            # Calculate duration
            duration = time.time() - start_time

            # Log response
            if path not in self.EXCLUDED_PATHS:
                logger.info(
                    "Request completed",
                    correlation_id=correlation_id,
                    method=method,
                    path=path,
                    status_code=response.status_code,
                    duration_ms=round(duration * 1000, 2),
                    client_ip=client_ip,
                    user_id=user_id
                )

            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["X-Request-Duration"] = str(round(duration * 1000, 2))

            return response

        except Exception as e:
            # Calculate duration
            duration = time.time() - start_time

            # Log error
            logger.error(
                "Request failed",
                correlation_id=correlation_id,
                method=method,
                path=path,
                duration_ms=round(duration * 1000, 2),
                client_ip=client_ip,
                user_id=user_id,
                error=str(e),
                error_type=type(e).__name__
            )

            # Re-raise the exception
            raise

    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request.

        Args:
            request: The incoming request

        Returns:
            Client IP address
        """
        # Check for forwarded IP (behind proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take the first IP in the chain
            return forwarded.split(",")[0].strip()

        # Check for real IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client IP
        if request.client:
            return request.client.host

        return "unknown"


class SecurityLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging security-related events."""

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """
        Process request and log security events.

        Args:
            request: The incoming request
            call_next: The next middleware or route handler

        Returns:
            Response from the next handler
        """
        correlation_id = getattr(request.state, "request_id", "unknown")
        path = request.url.path
        client_ip = self._get_client_ip(request)

        # Log authentication attempts
        if path in ["/api/v1/auth/login", "/api/v1/auth/register"]:
            logger.info(
                "Authentication attempt",
                correlation_id=correlation_id,
                path=path,
                client_ip=client_ip,
                event_type="auth_attempt"
            )

        # Process request
        try:
            response = await call_next(request)

            # Log failed authentication
            if path in ["/api/v1/auth/login"] and response.status_code == 401:
                logger.warning(
                    "Authentication failed",
                    correlation_id=correlation_id,
                    path=path,
                    client_ip=client_ip,
                    event_type="auth_failed"
                )

            # Log authorization failures
            if response.status_code == 403:
                user_id = getattr(request.state, "user_id", None)
                logger.warning(
                    "Authorization failed",
                    correlation_id=correlation_id,
                    path=path,
                    client_ip=client_ip,
                    user_id=user_id,
                    event_type="authz_failed"
                )

            # Log rate limit violations
            if response.status_code == 429:
                user_id = getattr(request.state, "user_id", None)
                logger.warning(
                    "Rate limit exceeded",
                    correlation_id=correlation_id,
                    path=path,
                    client_ip=client_ip,
                    user_id=user_id,
                    event_type="rate_limit_exceeded"
                )

            return response

        except Exception:
            # Re-raise the exception (already logged by LoggingMiddleware)
            raise

    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request.

        Args:
            request: The incoming request

        Returns:
            Client IP address
        """
        # Check for forwarded IP (behind proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        # Check for real IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client IP
        if request.client:
            return request.client.host

        return "unknown"
