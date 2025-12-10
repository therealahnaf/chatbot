"""User repository."""

from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for user operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        super().__init__(User, db)

    async def get_by_id(self, user_id):
        """Get user by ID.
        
        Args:
            user_id: User UUID
            
        Returns:
            User instance or None if not found
        """
        return await self.get(user_id)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email.
        
        Args:
            email: User email address
            
        Returns:
            User instance or None if not found
        """
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = "asc",
    ) -> tuple[list[User], int]:
        """
        Get multiple users with pagination, search, filter, and sort.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search term (searches email, first_name, and last_name)
            role: Filter by role ('admin' or 'user')
            is_active: Filter by active status
            sort_by: Column to sort by ('email', 'created_at', 'role', etc.)
            sort_order: Sort direction ('asc' or 'desc')

        Returns:
            Tuple of (list of users, total count)
        """
        # Build base query
        query = select(User)
        count_query = select(func.count()).select_from(User)

        # Apply search filter (searches email, first_name, and last_name)
        if search:
            search_conditions = [
                User.email.ilike(f"%{search}%"),
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%"),
            ]
            search_filter = or_(*search_conditions)
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Apply role filter
        if role:
            query = query.where(User.role == role)
            count_query = count_query.where(User.role == role)

        # Apply status filter
        if is_active is not None:
            query = query.where(User.is_active == is_active)
            count_query = count_query.where(User.is_active == is_active)

        # Get total count before pagination
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Apply sorting
        if sort_by:
            # Map sort_by to actual column
            sort_column_map = {
                "email": User.email,
                "first_name": User.first_name,
                "last_name": User.last_name,
                "phone_number": User.phone_number,
                "role": User.role,
                "is_active": User.is_active,
                "created_at": User.created_at,
                "updated_at": User.updated_at,
            }

            sort_column = sort_column_map.get(sort_by)
            if sort_column:
                if sort_order == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())
            else:
                # Default sort by created_at if invalid sort_by
                query = query.order_by(User.created_at.desc())
        else:
            # Default sort by created_at
            query = query.order_by(User.created_at.desc())

        # Apply pagination
        query = query.offset(skip).limit(limit)

        # Execute query
        result = await self.db.execute(query)
        users = list(result.scalars().all())

        return users, total
