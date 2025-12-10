"""Authentication schemas."""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Schema for login request."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Schema for refresh token request."""

    refresh_token: str


class TokenPayload(BaseModel):
    """Schema for token payload."""

    sub: str  # user_id
    exp: int
    type: str  # access or refresh


class WidgetSessionTokenResponse(BaseModel):
    """Schema for widget session token response."""

    token: str
    expires_in: int  # seconds until expiration
    token_type: str = "bearer"
