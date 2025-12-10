"""Authentication service."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AuthenticationError,
    ResourceAlreadyExistsError,
    ValidationError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    validate_password_strength,
    verify_password,
    verify_token_type,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(
        self,
        email: str,
        password: str,
        first_name: str | None = None,
        last_name: str | None = None,
    ) -> User:
        """
        Register a new user.

        Args:
            email: User email
            password: Plain password
            first_name: Optional first name
            last_name: Optional last name

        Returns:
            Created user

        Raises:
            ResourceAlreadyExistsError: If email already exists
            ValidationError: If password is weak
        """
        # Check if user exists
        existing_user = await self.user_repo.get_by_email(email)
        if existing_user:
            raise ResourceAlreadyExistsError("User with this email")

        # Validate password strength
        is_valid, error_message = validate_password_strength(password)
        if not is_valid:
            raise ValidationError(error_message or "Invalid password")

        # Hash password and create user
        hashed_password = get_password_hash(password)
        user = await self.user_repo.create(
            obj_in={
                "email": email,
                "hashed_password": hashed_password,
                "first_name": first_name,
                "last_name": last_name,
            }
        )

        return user

    async def login(self, email: str, password: str) -> TokenResponse:
        """
        Authenticate user and return tokens.

        Args:
            email: User email
            password: Plain password

        Returns:
            Token response with access and refresh tokens

        Raises:
            AuthenticationError: If credentials are invalid
        """
        # Get user
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise AuthenticationError("Invalid email or password")

        # Verify password
        if not verify_password(password, user.hashed_password):
            raise AuthenticationError("Invalid email or password")

        # Check if user is active
        if not user.is_active:
            raise AuthenticationError("User account is inactive")

        # Create tokens
        token_data = {"sub": str(user.id)}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token, refresh_token=refresh_token, token_type="bearer"
        )

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        """
        Refresh access token using refresh token.

        Args:
            refresh_token: Refresh token

        Returns:
            New token response

        Raises:
            AuthenticationError: If token is invalid
        """
        try:
            # Decode token
            payload = decode_token(refresh_token)

            # Verify token type
            if not verify_token_type(payload, "refresh"):
                raise AuthenticationError("Invalid token type")

            # Get user
            user_id = payload.get("sub")
            if not user_id:
                raise AuthenticationError("Invalid token payload")

            # Create new tokens
            token_data = {"sub": user_id}
            new_access_token = create_access_token(token_data)
            new_refresh_token = create_refresh_token(token_data)

            return TokenResponse(
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                token_type="bearer",
            )

        except Exception as e:
            raise AuthenticationError(f"Invalid refresh token: {str(e)}") from e
