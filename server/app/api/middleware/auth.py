"""JWT Authentication Middleware."""

import logging
from typing import Callable, Optional

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_token, verify_token_type
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)


class JWTAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware for JWT authentication.

    This middleware:
    - Extracts JWT tokens from the Authorization header
    - Validates the token
    - Attaches user information to the request state
    - Can optionally enforce authentication for all routes (except excluded paths)

    Note: This is an optional global middleware. Most routes should use
    the `get_current_user` dependency instead for better control and testability.
    """

    def __init__(
        self,
        app,
        exclude_paths: Optional[list[str]] = None,
        enforce_auth: bool = False,
    ):
        """
        Initialize the JWT authentication middleware.

        Args:
            app: The FastAPI application
            exclude_paths: List of path prefixes to exclude from auth checking
            enforce_auth: If True, require auth for all non-excluded routes
        """
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/metrics",
        ]
        self.enforce_auth = enforce_auth

    def _should_skip_auth(self, path: str) -> bool:
        """Check if authentication should be skipped for this path."""
        return any(path.startswith(excluded) for excluded in self.exclude_paths)

    async def _extract_user_from_token(self, token: str) -> Optional[User]:
        """
        Extract and validate user from JWT token.

        Args:
            token: The JWT token

        Returns:
            User object if valid, None otherwise
        """
        try:
            # Decode token
            payload = decode_token(token)

            # Verify token type
            if not verify_token_type(payload, "access"):
                logger.warning("Invalid token type in middleware")
                return None

            # Extract user_id
            user_id = payload.get("sub")
            if not user_id:
                logger.warning("Token missing subject")
                return None

            # Get user from database
            async with AsyncSessionLocal() as db:
                user_repo = UserRepository(db)
                user = await user_repo.get_by_id(user_id)
                return user

        except JWTError as e:
            logger.warning("JWT validation failed in middleware: %s", e, exc_info=True)
            return None
        except Exception as e:
            logger.error("Unexpected error in middleware auth: %s", e, exc_info=True)
            return None

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and attach user information.

        Args:
            request: The incoming request
            call_next: The next middleware/route handler

        Returns:
            The response
        """
        # Skip auth for excluded paths
        if self._should_skip_auth(request.url.path):
            return await call_next(request)

        # Initialize request state
        request.state.user = None
        request.state.user_id = None

        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ")[1]

            # Extract user from token
            user = await self._extract_user_from_token(token)

            if user:
                # Attach user to request state
                request.state.user = user
                request.state.user_id = str(user.id)
                logger.debug("Authenticated user: %s (%s)", user.email, user.id)
            elif self.enforce_auth:
                # If auth is enforced and token is invalid, return 401
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "detail": "Invalid or expired authentication token",
                    },
                    headers={"WWW-Authenticate": "Bearer"},
                )
        elif self.enforce_auth:
            # If auth is enforced and no token provided, return 401
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Authentication required - Bearer token missing",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Continue to next middleware/route
        response = await call_next(request)
        return response


def get_user_from_request(request: Request) -> Optional[User]:
    """
    Helper function to get user from request state.

    This can be used in route handlers if the JWTAuthMiddleware is enabled.

    Args:
        request: The FastAPI request object

    Returns:
        User object if authenticated, None otherwise

    Example:
        ```python
        @router.get("/profile")
        async def get_profile(request: Request):
            user = get_user_from_request(request)
            if not user:
                raise HTTPException(status_code=401, detail="Not authenticated")
            return {"user_id": user.id}
        ```
    """
    return getattr(request.state, "user", None)


def get_user_id_from_request(request: Request) -> Optional[str]:
    """
    Helper function to get user ID from request state.

    Args:
        request: The FastAPI request object

    Returns:
        User ID string if authenticated, None otherwise
    """
    return getattr(request.state, "user_id", None)
