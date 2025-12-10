"""User API endpoints."""

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, require_admin
from app.core.exceptions import (
    AuthorizationError,
    ResourceAlreadyExistsError,
    ResourceNotFoundError,
    ValidationError,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.user import (
    BulkDeleteUsersRequest,
    BulkUpdateUsersRequest,
    UserResponse,
    UserUpdate,
    UserCreate,
    UserInviteRequest,
    UserInviteResponse,
)
from app.services.user.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> UserResponse:
    """
    Get current user information.

    Args:
        current_user: Current authenticated user

    Returns:
        User information
    """
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: UserUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """
    Update current user profile.

    Users can update their own email, full name, and password.

    Args:
        user_data: User update data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated user information

    Raises:
        HTTPException: 400 if validation fails or email already exists
    """
    user_service = UserService(db)

    try:
        updated_user = await user_service.update_user(
            user_id=current_user.id,
            user_data=user_data,
            current_user=current_user,
        )
        return UserResponse.model_validate(updated_user)
    except ResourceAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e


@router.get("", response_model=PaginatedResponse[UserResponse])
async def list_users(
    current_user: Annotated[User, Depends(require_admin())],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[Optional[str], Query()] = None,
    role: Annotated[Optional[str], Query()] = None,
    is_active: Annotated[Optional[bool], Query()] = None,
    sort_by: Annotated[Optional[str], Query()] = None,
    sort_order: Annotated[Optional[str], Query()] = "asc",
) -> PaginatedResponse[UserResponse]:
    """
    List all users with pagination, search, filter, and sort (admin only).

    Only administrators can access this endpoint to view all users in the system.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum number of records to return (default: 20, max: 100)
        search: Search term (searches email, first_name, and last_name) (optional)
        role: Filter by role ('admin' or 'user') (optional)
        is_active: Filter by active status (optional)
        sort_by: Column to sort by ('email', 'created_at', 'role', etc.) (optional)
        sort_order: Sort direction ('asc' or 'desc') (default: 'asc')
        current_user: Current authenticated admin user
        db: Database session

    Returns:
        Paginated list of users with total count

    Raises:
        HTTPException: 403 if user is not an admin
    """
    user_service = UserService(db)

    try:
        users, total = await user_service.list_users(
            skip=skip,
            limit=limit,
            search=search,
            role=role,
            is_active=is_active,
            sort_by=sort_by,
            sort_order=sort_order,
            current_user=current_user,
        )

        return PaginatedResponse(
            items=[UserResponse.model_validate(user) for user in users],
            total=total,
            skip=skip,
            limit=limit,
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: UUID,
    _current_user: Annotated[User, Depends(require_admin())],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """
    Get user by ID (admin only).

    Only administrators can access this endpoint to view specific user details.

    Args:
        user_id: User UUID
        _current_user: Current authenticated admin user (used for authorization)
        db: Database session

    Returns:
        User information

    Raises:
        HTTPException: 403 if user is not an admin
        HTTPException: 404 if user not found
    """
    user_service = UserService(db)

    try:
        user = await user_service.get_user(user_id)
        return UserResponse.model_validate(user)
    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e

@router.post("", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: Annotated[User, Depends(require_admin())],
    db: Annotated[AsyncSession, Depends(get_db)],
    role: Annotated[Optional[str], Query()] = None,
) -> UserResponse:
    """
    Create a new user (admin only).
    
    Args:
        user_data: User creation data (email, password, first_name, last_name, phone_number)
        role: User role ('admin' or 'user', default: 'user')
        current_user: Current authenticated admin user
        db: Database session
        
    Returns:
        Created user information
    """
    from app.core.constants import UserRole
    
    try:
        user_service = UserService(db)
        # Parse role, default to USER if not provided or invalid
        user_role = UserRole.USER
        if role:
            try:
                user_role = UserRole(role)
            except ValueError:
                user_role = UserRole.USER
        
        user = await user_service.create_user(user_data, role=user_role, created_by=current_user)
        return UserResponse.model_validate(user)
    except ResourceAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from e

@router.post("/invite", response_model=UserInviteResponse, status_code=status.HTTP_201_CREATED)
async def invite_user(
    invite_data: UserInviteRequest,
    current_user: Annotated[User, Depends(require_admin())],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserInviteResponse:
    """
    Invite a new user by email (admin only).
    
    Creates an invitation token and returns an invitation link that can be sent to the user.
    The invitation link allows the user to register with the pre-assigned role.
    
    Args:
        invite_data: Invitation data (email, role, optional description)
        current_user: Current authenticated admin user
        db: Database session
        
    Returns:
        Invitation details including token and link
        
    Raises:
        HTTPException: 400 if user already exists
        HTTPException: 403 if insufficient permissions
    """
    from app.core.constants import UserRole
    
    try:
        user_service = UserService(db)
        
        # Parse role - handle both UserRole enum and string
        if isinstance(invite_data.role, UserRole):
            user_role = invite_data.role
        else:
            try:
                user_role = UserRole(invite_data.role.value if hasattr(invite_data.role, 'value') else str(invite_data.role))
            except (ValueError, AttributeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid role: {invite_data.role}"
                )
        
        invitation = await user_service.invite_user(
            email=invite_data.email,
            role=user_role,
            invited_by=current_user,
            description=invite_data.description,
        )
        
        return UserInviteResponse(**invitation)
        
    except ResourceAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create invitation: {str(e)}",
        ) from e

@router.post("/{user_id}/deactivate", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: UUID,
    current_user: Annotated[User, Depends(require_admin())],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        user_service = UserService(db)
        await user_service.deactivate_user(user_id, current_user)
        return None
    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from e

@router.post("/{user_id}/activate", status_code=status.HTTP_204_NO_CONTENT)
async def activate_user(
    user_id: UUID,
    current_user: Annotated[User, Depends(require_admin())],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        user_service = UserService(db)
        await user_service.activate_user(user_id, current_user)
        return None
    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.post("/bulk-update-status", response_model=list[UserResponse])
async def bulk_update_user_status(
    request: BulkUpdateUsersRequest,
    current_user: Annotated[User, Depends(require_admin())],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UserResponse]:
    """
    Bulk update user active status (admin only).

    Updates the active status of multiple users at once.

    Args:
        request: Bulk update request with user IDs and new status
        current_user: Current authenticated admin user
        db: Database session

    Returns:
        List of updated users

    Raises:
        HTTPException: 403 if user is not an admin
        HTTPException: 404 if any user not found
        HTTPException: 400 if validation fails
    """
    user_service = UserService(db)

    try:
        updated_users = await user_service.bulk_update_user_status(
            user_ids=request.user_ids,
            is_active=request.is_active,
            current_user=current_user,
        )
        return [UserResponse.model_validate(user) for user in updated_users]
    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e 

@router.put("/{user_id}", response_model=UserResponse)
async def update_user_by_id(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: Annotated[User, Depends(require_admin())],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """
    Update user by ID (admin only).

    Only administrators can update other users' information.

    Args:
        user_id: User UUID to update
        user_data: User update data
        current_user: Current authenticated admin user
        db: Database session

    Returns:
        Updated user information

    Raises:
        HTTPException: 403 if user is not an admin
        HTTPException: 404 if user not found
        HTTPException: 400 if validation fails or email already exists
    """
    user_service = UserService(db)

    try:
        updated_user = await user_service.update_user(
            user_id=user_id,
            user_data=user_data,
            current_user=current_user,
        )
        return UserResponse.model_validate(updated_user)
    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except ResourceAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: Annotated[User, Depends(require_admin())],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """
    Delete user by ID (admin only).

    Only administrators can delete users. Users cannot delete themselves.

    Args:
        user_id: User UUID to delete
        current_user: Current authenticated admin user
        db: Database session

    Raises:
        HTTPException: 403 if user is not an admin or trying to delete themselves
        HTTPException: 404 if user not found
        HTTPException: 400 if validation fails
    """
    user_service = UserService(db)

    try:
        await user_service.delete_user(
            user_id=user_id,
            current_user=current_user,
        )
    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
async def bulk_delete_users(
    request: BulkDeleteUsersRequest,
    current_user: Annotated[User, Depends(require_admin())],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, list[str]]:
    """
    Bulk delete users (admin only).

    Deletes multiple users at once.

    Args:
        request: Bulk delete request with user IDs
        current_user: Current authenticated admin user
        db: Database session

    Returns:
        Dictionary with list of deleted user IDs

    Raises:
        HTTPException: 403 if user is not an admin
        HTTPException: 404 if any user not found
        HTTPException: 400 if validation fails
    """
    user_service = UserService(db)

    try:
        deleted_user_ids = await user_service.bulk_delete_users(
            user_ids=request.user_ids,
            current_user=current_user,
        )
        return {"deleted_user_ids": [str(user_id) for user_id in deleted_user_ids]}
    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from e
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
