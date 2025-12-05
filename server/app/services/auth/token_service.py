"""Token service for JWT token management."""

from datetime import timedelta
from typing import Optional

from jose import JWTError

from app.core.exceptions import AuthenticationError
from app.core.security import (
    create_access_token as _create_access_token,
    create_refresh_token as _create_refresh_token,
    decode_token,
    get_token_subject,
    verify_token_type,
)
from app.schemas.auth import TokenPayload, TokenResponse


class TokenService:
    """Service for managing JWT tokens."""

    def create_tokens(self, user_id: str) -> TokenResponse:
        """
        Create access and refresh tokens for a user.

        Args:
            user_id: The user ID to encode in the tokens

        Returns:
            TokenResponse containing access and refresh tokens

        Example:
            >>> token_service = TokenService()
            >>> tokens = token_service.create_tokens("user-123")
            >>> print(tokens.access_token)
        """
        access_token = self.create_access_token(user_id)
        refresh_token = self.create_refresh_token(user_id)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )

    def create_access_token(
        self, user_id: str, expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT access token.

        Args:
            user_id: The user ID to encode in the token
            expires_delta: Optional custom expiration time delta

        Returns:
            The encoded JWT access token

        Example:
            >>> token_service = TokenService()
            >>> token = token_service.create_access_token("user-123")
        """
        token_data = {"sub": user_id}
        return _create_access_token(token_data, expires_delta)

    def create_refresh_token(self, user_id: str) -> str:
        """
        Create a JWT refresh token.

        Args:
            user_id: The user ID to encode in the token

        Returns:
            The encoded JWT refresh token

        Example:
            >>> token_service = TokenService()
            >>> token = token_service.create_refresh_token("user-123")
        """
        token_data = {"sub": user_id}
        return _create_refresh_token(token_data)

    def verify_access_token(self, token: str) -> TokenPayload:
        """
        Verify and decode an access token.

        Args:
            token: The JWT access token to verify

        Returns:
            TokenPayload containing the decoded token data

        Raises:
            AuthenticationError: If token is invalid, expired, or not an access token

        Example:
            >>> token_service = TokenService()
            >>> payload = token_service.verify_access_token(token)
            >>> print(payload.sub)  # user_id
        """
        try:
            payload = decode_token(token)
        except JWTError as e:
            raise AuthenticationError(
                message="Invalid or expired token",
                details={"error": str(e)},
            ) from e

        # Verify token type
        if not verify_token_type(payload, "access"):
            raise AuthenticationError(
                message="Invalid token type",
                details={"expected": "access", "received": payload.get("type")},
            )

        # Extract user_id
        user_id = get_token_subject(payload)
        if not user_id:
            raise AuthenticationError(
                message="Token missing subject",
                details={"payload": payload},
            )

        return TokenPayload(
            sub=user_id,
            exp=payload.get("exp", 0),
            type=payload.get("type", "access"),
        )

    def verify_refresh_token(self, token: str) -> TokenPayload:
        """
        Verify and decode a refresh token.

        Args:
            token: The JWT refresh token to verify

        Returns:
            TokenPayload containing the decoded token data

        Raises:
            AuthenticationError: If token is invalid, expired, or not a refresh token

        Example:
            >>> token_service = TokenService()
            >>> payload = token_service.verify_refresh_token(refresh_token)
            >>> print(payload.sub)  # user_id
        """
        try:
            payload = decode_token(token)
        except JWTError as e:
            raise AuthenticationError(
                message="Invalid or expired refresh token",
                details={"error": str(e)},
            ) from e

        # Verify token type
        if not verify_token_type(payload, "refresh"):
            raise AuthenticationError(
                message="Invalid token type",
                details={"expected": "refresh", "received": payload.get("type")},
            )

        # Extract user_id
        user_id = get_token_subject(payload)
        if not user_id:
            raise AuthenticationError(
                message="Token missing subject",
                details={"payload": payload},
            )

        return TokenPayload(
            sub=user_id,
            exp=payload.get("exp", 0),
            type=payload.get("type", "refresh"),
        )

    def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """
        Generate new access and refresh tokens using a valid refresh token.

        Args:
            refresh_token: The refresh token to use for generating new tokens

        Returns:
            TokenResponse containing new access and refresh tokens

        Raises:
            AuthenticationError: If refresh token is invalid or expired

        Example:
            >>> token_service = TokenService()
            >>> new_tokens = token_service.refresh_access_token(old_refresh_token)
            >>> print(new_tokens.access_token)
        """
        # Verify the refresh token
        payload = self.verify_refresh_token(refresh_token)

        # Create new tokens
        return self.create_tokens(payload.sub)

    def get_user_id_from_token(self, token: str) -> str:
        """
        Extract user ID from an access token without full verification.

        Args:
            token: The JWT access token

        Returns:
            The user ID from the token

        Raises:
            AuthenticationError: If token cannot be decoded or has no subject

        Note:
            This method performs basic decoding but should be followed by
            full verification in security-critical contexts.

        Example:
            >>> token_service = TokenService()
            >>> user_id = token_service.get_user_id_from_token(token)
        """
        payload = self.verify_access_token(token)
        return payload.sub


# Global token service instance
token_service = TokenService()
