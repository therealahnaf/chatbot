"""Base repository with generic CRUD operations."""

from typing import Any, Generic, Optional, TypeVar
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base_class import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)


class BaseRepository(Generic[ModelType]):
    """Base repository with generic CRUD operations."""

    def __init__(self, model: type[ModelType], db: AsyncSession):
        """Initialize repository with model and database session.
        
        Args:
            model: SQLAlchemy model class
            db: Async database session
        """
        self.model = model
        self.db = db

    async def create(self, obj_in: dict[str, Any]) -> ModelType:
        """Create a new record.
        
        Args:
            obj_in: Dictionary of field values
            
        Returns:
            Created model instance
        """
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def get(self, record_id: UUID) -> Optional[ModelType]:
        """Get a record by ID.
        
        Args:
            record_id: Record UUID
            
        Returns:
            Model instance or None if not found
        """
        result = await self.db.execute(select(self.model).where(self.model.id == record_id))
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[dict[str, Any]] = None,
        order_by: Optional[str] = None,
    ) -> list[ModelType]:
        """Get multiple records with pagination and filtering.
        
        Args:
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            filters: Dictionary of field:value pairs for filtering
            order_by: Field name to order by (prefix with '-' for descending)
            
        Returns:
            List of model instances
        """
        query = select(self.model)
        
        # Apply filters
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.where(getattr(self.model, field) == value)
        
        # Apply ordering
        if order_by:
            if order_by.startswith("-"):
                field_name = order_by[1:]
                if hasattr(self.model, field_name):
                    query = query.order_by(getattr(self.model, field_name).desc())
            else:
                if hasattr(self.model, order_by):
                    query = query.order_by(getattr(self.model, order_by))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, filters: Optional[dict[str, Any]] = None) -> int:
        """Count records with optional filtering.
        
        Args:
            filters: Dictionary of field:value pairs for filtering
            
        Returns:
            Count of matching records
        """
        # Build query to select all matching records
        query = select(self.model)
        
        # Apply filters
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.where(getattr(self.model, field) == value)
        
        # Execute and count results
        result = await self.db.execute(query)
        return len(list(result.scalars().all()))

    async def update(self, record_id: UUID, obj_in: dict[str, Any]) -> Optional[ModelType]:
        """Update a record.
        
        Args:
            record_id: Record UUID
            obj_in: Dictionary of field values to update
            
        Returns:
            Updated model instance or None if not found
        """
        db_obj = await self.get(record_id)
        if not db_obj:
            return None
        
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete(self, record_id: UUID) -> bool:
        """Delete a record.
        
        Args:
            record_id: Record UUID
            
        Returns:
            True if deleted, False if not found
        """
        db_obj = await self.get(record_id)
        if not db_obj:
            return False
        
        await self.db.delete(db_obj)
        await self.db.flush()
        return True

    def _apply_filters(self, query: Select, filters: dict[str, Any]) -> Select:
        """Apply filters to a query.
        
        Args:
            query: SQLAlchemy select query
            filters: Dictionary of field:value pairs
            
        Returns:
            Modified query with filters applied
        """
        for field, value in filters.items():
            if hasattr(self.model, field):
                query = query.where(getattr(self.model, field) == value)
        return query
