"""API dependencies for authentication and authorization."""

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_token, verify_token_type
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

# HTTP Bearer scheme for JWT token extraction from Authorization header
security = HTTPBearer(
    scheme_name="Bearer",
    description="JWT Bearer token authentication",
    auto_error=False,
)


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.

    This dependency:
    1. Extracts the JWT token from the Authorization header
    2. Validates and decodes the token
    3. Fetches the user from the database
    4. Returns the user object

    Args:
        credentials: HTTP Bearer credentials containing the JWT token
        db: Database session

    Returns:
        The authenticated User object

    Raises:
        HTTPException: 401 if token is missing, invalid, or user not found

    Example:
        ```python
        @router.get("/protected")
        async def protected_route(
            current_user: Annotated[User, Depends(get_current_user)]
        ):
            return {"user_id": current_user.id}
        ```
    """
    # Check if credentials are provided
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - Bearer token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Decode and verify token
        payload = decode_token(token)

        # Verify token type
        if not verify_token_type(payload, "access"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type - access token required",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Extract user_id
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload - missing subject",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    # Get user from database
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Dependency to get the current authenticated and active user.

    Args:
        current_user: The authenticated user from get_current_user

    Returns:
        The authenticated and active User object

    Raises:
        HTTPException: 403 if user is inactive

    Example:
        ```python
        @router.get("/protected")
        async def protected_route(
            user: Annotated[User, Depends(get_current_active_user)]
        ):
            return {"user_id": user.id}
        ```
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user - account has been deactivated",
        )
    return current_user


def require_role(*allowed_roles: UserRole):
    """
    Dependency factory to require specific user roles.

    This creates a dependency that checks if the current user has one of
    the allowed roles.

    Args:
        *allowed_roles: One or more UserRole values that are allowed

    Returns:
        A dependency function that validates user roles

    Raises:
        HTTPException: 403 if user doesn't have required role

    Example:
        ```python
        @router.get("/admin")
        async def admin_only(
            user: Annotated[User, Depends(require_role(UserRole.ADMIN))]
        ):
            return {"message": "Admin access granted"}

        @router.get("/staff")
        async def staff_or_admin(
            user: Annotated[User, Depends(require_role(UserRole.ADMIN, UserRole.MODERATOR))]
        ):
            return {"message": "Staff access granted"}
        ```
    """

    async def role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> User:
        """Check if user has required role."""
        # Convert allowed_roles to string values for comparison
        allowed_role_values = [role.value for role in allowed_roles]

        if current_user.role not in allowed_role_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions - requires one of: {', '.join(allowed_role_values)}",
            )
        return current_user

    return role_checker


def require_admin():
    """
    Dependency to require admin role.

    Convenience wrapper around require_role for admin-only routes.

    Returns:
        A dependency function that validates admin role

    Example:
        ```python
        @router.delete("/users/{user_id}")
        async def delete_user(
            user_id: str,
            admin: Annotated[User, Depends(require_admin())]
        ):
            return {"message": "User deleted"}
        ```
    """
    return require_role(UserRole.ADMIN)


# Optional dependency - returns None if not authenticated
async def get_optional_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Optional[User]:
    """
    Optional dependency to get current user without requiring authentication.

    This is useful for routes that work differently based on whether a user
    is authenticated, but don't require authentication.
    
    Also accepts widget_session tokens (validates them but returns None since
    they don't represent a user).

    Args:
        credentials: HTTP Bearer credentials containing the JWT token
        db: Database session

    Returns:
        The authenticated User object if valid access token provided, None otherwise

    Example:
        ```python
        @router.get("/content")
        async def get_content(
            user: Annotated[Optional[User], Depends(get_optional_user)]
        ):
            if user:
                return {"content": "premium", "user": user.id}
            return {"content": "public"}
        ```
    """
    if not credentials:
        return None

    token = credentials.credentials

    try:
        # Decode and verify token
        payload = decode_token(token)
        token_type = payload.get("type")

        # Handle widget session tokens - validate but return None (no user)
        if token_type == "widget_session":
            # Token is valid widget session token, but no user associated
            return None

        # For access tokens, try to get user
        if token_type == "access":
            user = await get_current_user(credentials, db)
            return user

        # Unknown token type, return None
        return None
    except (HTTPException, JWTError):
        # If authentication fails, just return None
        return None
