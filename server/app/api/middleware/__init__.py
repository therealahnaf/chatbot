"""Middleware package for API request processing."""

from app.api.middleware.auth import (
    JWTAuthMiddleware,
    get_user_from_request,
    get_user_id_from_request,
)
from app.api.middleware.logging import LoggingMiddleware, SecurityLoggingMiddleware
from app.api.middleware.rate_limit import RateLimitMiddleware

__all__ = [
    # Auth middleware (optional - use in app.add_middleware)
    "JWTAuthMiddleware",
    "get_user_from_request",
    "get_user_id_from_request",
    # Other middleware classes
    "LoggingMiddleware",
    "SecurityLoggingMiddleware",
    "RateLimitMiddleware",
]
