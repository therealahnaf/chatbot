"""User service for user management operations."""

from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timedelta

from app.core.constants import UserRole
from app.core.exceptions import (
    AuthorizationError,
    ResourceAlreadyExistsError,
    ResourceNotFoundError,
    ValidationError,
)
from app.core.security import create_invitation_token, get_password_hash, validate_password_strength
from app.core.config import settings
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """Service for user management operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.user_repo = UserRepository(db)

    async def create_user(
        self,
        user_data: UserCreate,
        role: UserRole = UserRole.USER,
        created_by: Optional[User] = None,
    ) -> User:
        """
        Create a new user.

        Args:
            user_data: User creation data
            role: User role (default: USER)
            created_by: User creating this user (for permission checks)

        Returns:
            Created user

        Raises:
            ResourceAlreadyExistsError: If email already exists
            ValidationError: If password is weak
            AuthorizationError: If insufficient permissions
        """
        # Check permissions for creating users with elevated roles
        if role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            if not created_by:
                raise AuthorizationError("Authentication required to create admin users")
            if not self.can_manage_role(created_by.role, role):
                raise AuthorizationError(
                    f"Insufficient permissions to create {role.value} users"
                )

        # Check if user exists
        existing_user = await self.user_repo.get_by_email(user_data.email)
        if existing_user:
            raise ResourceAlreadyExistsError("User with this email")

        # Validate password strength
        is_valid, error_message = validate_password_strength(user_data.password)
        if not is_valid:
            raise ValidationError(error_message or "Invalid password")

        # Hash password and create user
        hashed_password = get_password_hash(user_data.password)
        user = await self.user_repo.create(
            obj_in={
                "email": user_data.email,
                "hashed_password": hashed_password,
                "first_name": user_data.first_name,
                "last_name": user_data.last_name,
                "phone_number": user_data.phone_number,
                "role": role.value,
            }
        )

        return user

    async def get_user(self, user_id: UUID) -> User:
        """
        Get user by ID.

        Args:
            user_id: User UUID

        Returns:
            User instance

        Raises:
            ResourceNotFoundError: If user not found
        """
        user = await self.user_repo.get(user_id)
        if not user:
            raise ResourceNotFoundError("User", str(user_id))
        return user

    async def get_user_by_email(self, email: str) -> User:
        """
        Get user by email.

        Args:
            email: User email

        Returns:
            User instance

        Raises:
            ResourceNotFoundError: If user not found
        """
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise ResourceNotFoundError("User")
        return user

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = "asc",
        current_user: Optional[User] = None,
    ) -> tuple[list[User], int]:
        """
        List users with pagination, search, filtering, and sorting.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search term (searches email, first_name, and last_name)
            role: Filter by role
            is_active: Filter by active status
            sort_by: Column to sort by ('email', 'created_at', 'role', etc.)
            sort_order: Sort order ('asc' or 'desc')
            current_user: Current user for permission checks

        Returns:
            Tuple of (list of users, total count)
        """
        return await self.user_repo.get_multi(
            skip=skip,
            limit=limit,
            search=search,
            role=role,
            is_active=is_active,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    async def update_user(
        self,
        user_id: UUID,
        user_data: UserUpdate,
        current_user: User,
    ) -> User:
        """
        Update a user.

        Args:
            user_id: User UUID
            user_data: User update data
            current_user: Current user performing the update

        Returns:
            Updated user

        Raises:
            ResourceNotFoundError: If user not found
            ResourceAlreadyExistsError: If email already exists
            ValidationError: If password is weak
            AuthorizationError: If insufficient permissions
        """
        user = await self.get_user(user_id)

        # Check permissions
        if not self.can_modify_user(current_user, user):
            raise AuthorizationError("Insufficient permissions to modify this user")

        update_data = {}

        # Update email if provided
        if user_data.email is not None:
            existing_user = await self.user_repo.get_by_email(user_data.email)
            if existing_user:
                raise ResourceAlreadyExistsError("User with this email")
            update_data["email"] = user_data.email

        # Update first_name if provided
        if user_data.first_name is not None:
            update_data["first_name"] = user_data.first_name

        # Update last_name if provided
        if user_data.last_name is not None:
            update_data["last_name"] = user_data.last_name

        # Update phone_number if provided
        if user_data.phone_number is not None:
            update_data["phone_number"] = user_data.phone_number

        # Update password if provided
        if user_data.password:
            is_valid, error_message = validate_password_strength(user_data.password)
            if not is_valid:
                raise ValidationError(error_message or "Invalid password")
            update_data["hashed_password"] = get_password_hash(user_data.password)

        # Update role if provided
        if user_data.role is not None:
            # Only allow admins to change roles
            if not self.is_admin(current_user):
                raise AuthorizationError("Only administrators can change user roles")
            
            # Prevent changing own role
            if current_user.id == user_id:
                raise ValidationError("Cannot change your own role")
            
            update_data["role"] = user_data.role.value

        # Update user
        if update_data:
            user = await self.user_repo.update(user_id, obj_in=update_data)

        return user

    async def delete_user(
        self,
        user_id: UUID,
        current_user: User,
    ) -> bool:
        """
        Delete a user.

        Args:
            user_id: User UUID
            current_user: Current user performing the deletion

        Returns:
            True if deleted

        Raises:
            ResourceNotFoundError: If user not found
            AuthorizationError: If insufficient permissions
        """
        user = await self.get_user(user_id)

        # Check permissions
        if not self.can_delete_user(current_user, user):
            raise AuthorizationError("Insufficient permissions to delete this user")

        # Prevent self-deletion
        if current_user.id == user_id:
            raise ValidationError("Cannot delete your own account")

        return await self.user_repo.delete(user_id)

    async def deactivate_user(
        self,
        user_id: UUID,
        current_user: User,
    ) -> User:
        """
        Deactivate a user.

        Args:
            user_id: User UUID
            current_user: Current user performing the deactivation

        Returns:
            Deactivated user

        Raises:
            ResourceNotFoundError: If user not found
            AuthorizationError: If insufficient permissions
        """
        user = await self.get_user(user_id)

        # Check permissions
        if not self.can_modify_user(current_user, user):
            raise AuthorizationError("Insufficient permissions to deactivate this user")

        # Prevent self-deactivation
        if current_user.id == user_id:
            raise ValidationError("Cannot deactivate your own account")

        user = await self.user_repo.update(user_id, obj_in={"is_active": False})
        return user

    async def activate_user(
        self,
        user_id: UUID,
        current_user: User,
    ) -> User:
        """
        Activate a user.

        Args:
            user_id: User UUID
            current_user: Current user performing the activation

        Returns:
            Activated user

        Raises:
            ResourceNotFoundError: If user not found
            AuthorizationError: If insufficient permissions
        """
        user = await self.get_user(user_id)

        # Check permissions
        if not self.can_modify_user(current_user, user):
            raise AuthorizationError("Insufficient permissions to activate this user")

        user = await self.user_repo.update(user_id, obj_in={"is_active": True})
        return user

    async def bulk_update_user_status(
        self,
        user_ids: list[UUID],
        is_active: bool,
        current_user: User,
    ) -> list[User]:
        """
        Bulk update user status.

        Args:
            user_ids: List of user UUIDs
            is_active: New active status
            current_user: Current user performing the update

        Returns:
            List of updated users

        Raises:
            ResourceNotFoundError: If any user not found
            AuthorizationError: If insufficient permissions
        """
        updated_users = []
        for user_id in user_ids:
            user = await self.get_user(user_id)

            # Check permissions
            if not self.can_modify_user(current_user, user):
                raise AuthorizationError(
                    f"Insufficient permissions to modify user {user_id}"
                )

            # Prevent self-modification
            if current_user.id == user_id:
                raise ValidationError("Cannot modify your own account status")

            user = await self.user_repo.update(user_id, obj_in={"is_active": is_active})
            updated_users.append(user)

        return updated_users

    async def bulk_delete_users(
        self,
        user_ids: list[UUID],
        current_user: User,
    ) -> list[UUID]:
        """
        Bulk delete users.

        Args:
            user_ids: List of user UUIDs to delete
            current_user: Current user performing the deletion

        Returns:
            List of deleted user IDs

        Raises:
            ResourceNotFoundError: If any user not found
            AuthorizationError: If insufficient permissions
        """
        deleted_ids = []
        for user_id in user_ids:
            user = await self.get_user(user_id)

            # Check permissions
            if not self.can_delete_user(current_user, user):
                raise AuthorizationError(
                    f"Insufficient permissions to delete user {user_id}"
                )

            # Prevent self-deletion
            if current_user.id == user_id:
                raise ValidationError("Cannot delete your own account")

            await self.user_repo.delete(user_id)
            deleted_ids.append(user_id)

        return deleted_ids

    @staticmethod
    def is_admin(user: User) -> bool:
        """Check if user is an admin."""
        return user.role in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]

    @staticmethod
    def is_super_admin(user: User) -> bool:
        """Check if user is a super admin."""
        return user.role == UserRole.SUPER_ADMIN.value

    @staticmethod
    def can_manage_role(manager_role: str, target_role: UserRole) -> bool:
        """
        Check if a manager can manage users with a specific role.

        Args:
            manager_role: Role of the manager
            target_role: Role of the target user

        Returns:
            True if manager can manage target role
        """
        # Super admins can manage everyone
        if manager_role == UserRole.SUPER_ADMIN.value:
            return True

        # Regular admins can only manage users and other regular admins
        if manager_role == UserRole.ADMIN.value:
            return target_role in [UserRole.USER, UserRole.ADMIN]

        # Regular users cannot manage anyone
        return False

    def can_modify_user(self, current_user: User, target_user: User) -> bool:
        """
        Check if current user can modify target user.

        Args:
            current_user: User performing the action
            target_user: User being modified

        Returns:
            True if current user can modify target user
        """
        # Users can modify themselves
        if current_user.id == target_user.id:
            return True

        # Admins can modify users and other admins (but not super admins)
        if self.is_admin(current_user):
            # Super admins can modify everyone
            if self.is_super_admin(current_user):
                return True
            # Regular admins can modify users and other regular admins
            if target_user.role in [UserRole.USER.value, UserRole.ADMIN.value]:
                return True
            # But not super admins
            if target_user.role == UserRole.SUPER_ADMIN.value:
                return False

        return False

    def can_delete_user(self, current_user: User, target_user: User) -> bool:
        """
        Check if current user can delete target user.

        Args:
            current_user: User performing the action
            target_user: User being deleted

        Returns:
            True if current user can delete target user
        """
        # Users cannot delete themselves (handled separately)
        if current_user.id == target_user.id:
            return False

        # Super admins can delete everyone except themselves
        if self.is_super_admin(current_user):
            return True

        # Admins can delete regular users and other admins (but not super admins)
        if self.is_admin(current_user):
            # Regular admins can delete users and other regular admins
            if target_user.role in [UserRole.USER.value, UserRole.ADMIN.value]:
                return True
            # But not super admins
            if target_user.role == UserRole.SUPER_ADMIN.value:
                return False

        return False

    async def invite_user(
        self,
        email: str,
        role: UserRole,
        invited_by: User,
        description: Optional[str] = None,
    ) -> dict:
        """
        Invite a new user by email.

        Args:
            email: Email address of the user to invite
            role: Role to assign to the invited user
            invited_by: User sending the invitation
            description: Optional personal note for the invitation

        Returns:
            Dictionary with invitation details (token, link, etc.)

        Raises:
            ResourceAlreadyExistsError: If user with email already exists
            AuthorizationError: If insufficient permissions
        """
        # Check permissions for inviting users with elevated roles
        if role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            if not self.can_manage_role(invited_by.role, role):
                raise AuthorizationError(
                    f"Insufficient permissions to invite {role.value} users"
                )

        # Check if user already exists
        existing_user = await self.user_repo.get_by_email(email)
        if existing_user:
            raise ResourceAlreadyExistsError("User with this email already exists")

        # Generate invitation token
        invitation_token = create_invitation_token(email=email, role=role.value)
        
        # Calculate expiration (7 days from now)
        expires_at = datetime.utcnow() + timedelta(days=7)
        
        # Generate invitation link
        # Get frontend URL from CORS origins or use default
        # CORS_ORIGINS is already a list (parsed by validator)
        frontend_url = settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:3000"
        invitation_link = f"{frontend_url}/sign-up?token={invitation_token}" 

        return {
            "message": f"Invitation sent successfully to {email}",
            "invitation_token": invitation_token,
            "invitation_link": invitation_link,
            "email": email,
            "role": role,
            "expires_at": expires_at,
        }
