"""Rate limiting middleware."""

from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.cache.rate_limiter import RateLimiter, get_rate_limiter
from app.core.config import settings
from app.core.exceptions import RateLimitError
from app.core.logging import get_logger

logger = get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting requests."""

    # Paths excluded from rate limiting
    EXCLUDED_PATHS = {
        "/",
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/metrics",
    }

    def __init__(self, app, rate_limiter: RateLimiter = None):
        """
        Initialize rate limit middleware.

        Args:
            app: The FastAPI application
            rate_limiter: Optional RateLimiter instance
        """
        super().__init__(app)
        self._rate_limiter = rate_limiter

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """
        Process request and check rate limits.

        Args:
            request: The incoming request
            call_next: The next middleware or route handler

        Returns:
            Response from the next handler

        Raises:
            RateLimitError: If rate limit is exceeded
        """
        # Skip rate limiting for excluded paths
        if self._is_excluded_path(request.url.path):
            return await call_next(request)

        # Get or create rate limiter
        if not self._rate_limiter:
            self._rate_limiter = await get_rate_limiter()

        # Get client identifier (IP address)
        client_ip = self._get_client_ip(request)

        # Check IP-based rate limit
        try:
            is_allowed, current, remaining = await self._rate_limiter.check_rate_limit(
                identifier=f"ip:{client_ip}",
                limit=settings.RATE_LIMIT_PER_IP
            )

            if not is_allowed:
                logger.warning(
                    "IP rate limit exceeded",
                    ip=client_ip,
                    path=request.url.path,
                    current=current,
                    limit=settings.RATE_LIMIT_PER_IP
                )
                raise RateLimitError(
                    f"Rate limit exceeded for IP {client_ip}",
                    retry_after=3600
                )

            # Add rate limit headers to response
            request.state.rate_limit_remaining = remaining
            request.state.rate_limit_limit = settings.RATE_LIMIT_PER_IP

            logger.debug(
                "Rate limit check passed",
                ip=client_ip,
                path=request.url.path,
                current=current,
                remaining=remaining
            )

        except RateLimitError:
            raise

        except Exception as e:
            logger.error(
                "Error checking rate limit",
                ip=client_ip,
                path=request.url.path,
                error=str(e)
            )
            # Fail open - allow request if rate limiting fails
            pass

        # Continue to next handler
        response = await call_next(request)

        # Add rate limit headers to response
        if hasattr(request.state, "rate_limit_remaining"):
            response.headers["X-RateLimit-Limit"] = str(
                request.state.rate_limit_limit
            )
            response.headers["X-RateLimit-Remaining"] = str(
                request.state.rate_limit_remaining
            )

        return response

    def _is_excluded_path(self, path: str) -> bool:
        """
        Check if path is excluded from rate limiting.

        Args:
            path: Request path

        Returns:
            True if path is excluded, False otherwise
        """
        return path in self.EXCLUDED_PATHS

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


class UserRateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for user-based rate limiting."""

    # Paths excluded from user rate limiting
    EXCLUDED_PATHS = {
        "/",
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/metrics",
        "/api/v1/auth/login",
        "/api/v1/auth/register",
    }

    def __init__(self, app, rate_limiter: RateLimiter = None):
        """
        Initialize user rate limit middleware.

        Args:
            app: The FastAPI application
            rate_limiter: Optional RateLimiter instance
        """
        super().__init__(app)
        self._rate_limiter = rate_limiter

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """
        Process request and check user rate limits.

        Args:
            request: The incoming request
            call_next: The next middleware or route handler

        Returns:
            Response from the next handler

        Raises:
            RateLimitError: If rate limit is exceeded
        """
        # Skip rate limiting for excluded paths
        if self._is_excluded_path(request.url.path):
            return await call_next(request)

        # Check if user is authenticated
        user_id = getattr(request.state, "user_id", None)
        if not user_id:
            # Skip user rate limiting if not authenticated
            return await call_next(request)

        # Get or create rate limiter
        if not self._rate_limiter:
            self._rate_limiter = await get_rate_limiter()

        # Check user-based rate limit
        try:
            is_allowed, current, remaining = await self._rate_limiter.check_rate_limit(
                identifier=f"user:{user_id}",
                limit=settings.RATE_LIMIT_PER_USER
            )

            if not is_allowed:
                logger.warning(
                    "User rate limit exceeded",
                    user_id=user_id,
                    path=request.url.path,
                    current=current,
                    limit=settings.RATE_LIMIT_PER_USER
                )
                raise RateLimitError(
                    f"Rate limit exceeded for user",
                    retry_after=3600
                )

            # Store rate limit info in request state
            request.state.user_rate_limit_remaining = remaining
            request.state.user_rate_limit_limit = settings.RATE_LIMIT_PER_USER

            logger.debug(
                "User rate limit check passed",
                user_id=user_id,
                path=request.url.path,
                current=current,
                remaining=remaining
            )

        except RateLimitError:
            raise

        except Exception as e:
            logger.error(
                "Error checking user rate limit",
                user_id=user_id,
                path=request.url.path,
                error=str(e)
            )
            # Fail open - allow request if rate limiting fails
            pass

        # Continue to next handler
        response = await call_next(request)

        # Add user rate limit headers to response
        if hasattr(request.state, "user_rate_limit_remaining"):
            response.headers["X-User-RateLimit-Limit"] = str(
                request.state.user_rate_limit_limit
            )
            response.headers["X-User-RateLimit-Remaining"] = str(
                request.state.user_rate_limit_remaining
            )

        return response

    def _is_excluded_path(self, path: str) -> bool:
        """
        Check if path is excluded from user rate limiting.

        Args:
            path: Request path

        Returns:
            True if path is excluded, False otherwise
        """
        return path in self.EXCLUDED_PATHS
