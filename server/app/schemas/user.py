"""User schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.constants import UserRole


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    phone_number: str | None = None


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str = Field(min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone_number: str | None = None
    password: str | None = Field(None, min_length=8, max_length=100)
    role: UserRole | None = None


class BulkUpdateUsersRequest(BaseModel):
    """Schema for bulk updating users."""

    user_ids: list[UUID] = Field(..., min_length=1, description="List of user IDs to update")
    is_active: bool = Field(..., description="New active status for all users")


class BulkDeleteUsersRequest(BaseModel):
    """Schema for bulk deleting users."""

    user_ids: list[UUID] = Field(..., min_length=1, description="List of user IDs to delete")


class UserResponse(UserBase):
    """Schema for user response."""

    id: UUID
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserInDB(UserResponse):
    """Schema for user in database (includes hashed password)."""

    hashed_password: str


class UserInviteRequest(BaseModel):
    """Schema for inviting a user."""

    email: EmailStr = Field(..., description="Email address of the user to invite")
    role: UserRole = Field(..., description="Role to assign to the invited user")
    description: str | None = Field(None, description="Optional personal note for the invitation")


class UserInviteResponse(BaseModel):
    """Schema for invitation response."""

    message: str
    invitation_token: str
    invitation_link: str
    email: EmailStr
    role: UserRole
    expires_at: datetime
