"""Document repository."""

from typing import Optional
from uuid import UUID

from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    """Repository for document operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        super().__init__(Document, db)

    async def get_by_user_id(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        file_type: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = "desc",
    ) -> tuple[list[Document], int]:
        """Get documents by user ID with pagination, search, and filtering.
        
        Args:
            user_id: User UUID
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            search: Search term for title and filename
            file_type: Filter by file type
            status: Filter by status (processing, done, failed)
            sort_by: Column to sort by
            sort_order: Sort order (asc/desc)
            
        Returns:
            Tuple of (documents list, total count)
        """
        query = select(Document).where(Document.user_id == user_id)
        count_query = select(func.count()).select_from(Document).where(Document.user_id == user_id)

        # Apply search filter
        if search:
            search_filter = or_(
                Document.title.ilike(f"%{search}%"),
                Document.filename.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Apply file type filter
        if file_type:
            query = query.where(Document.file_type == file_type)
            count_query = count_query.where(Document.file_type == file_type)

        # Apply status filter
        if status:
            query = query.where(Document.status == status)
            count_query = count_query.where(Document.status == status)

        # Apply sorting
        sort_column_map = {
            "title": Document.title,
            "filename": Document.filename,
            "file_type": Document.file_type,
            "file_size": Document.file_size,
            "status": Document.status,
            "chunk_count": Document.chunk_count,
            "created_at": Document.created_at,
            "updated_at": Document.updated_at,
        }

        if sort_by and sort_by in sort_column_map:
            column = sort_column_map[sort_by]
            query = query.order_by(column.desc() if sort_order == "desc" else column.asc())
        else:
            # Default sort by created_at descending
            query = query.order_by(Document.created_at.desc())

        # Get total count
        total = await self.db.scalar(count_query)

        # Apply pagination
        query = query.offset(skip).limit(limit)

        # Execute query
        result = await self.db.execute(query)
        documents = result.scalars().all()

        return list(documents), total or 0
    
    async def get_all_documents(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        file_type: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = "desc",
    ) -> tuple[list[Document], int]:
        """Get all documents (admin access) with pagination, search, and filtering.
        
        Args:
            skip: Number of records to skip (offset)
            limit: Maximum number of records to return
            search: Search term for title and filename
            file_type: Filter by file type
            status: Filter by status (processing, done, failed)
            sort_by: Column to sort by
            sort_order: Sort order (asc/desc)
            
        Returns:
            Tuple of (documents list, total count)
        """
        query = select(Document)
        count_query = select(func.count()).select_from(Document)

        # Apply search filter
        if search:
            search_filter = or_(
                Document.title.ilike(f"%{search}%"),
                Document.filename.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Apply file type filter
        if file_type:
            query = query.where(Document.file_type == file_type)
            count_query = count_query.where(Document.file_type == file_type)

        # Apply status filter
        if status:
            query = query.where(Document.status == status)
            count_query = count_query.where(Document.status == status)

        # Apply sorting
        sort_column_map = {
            "title": Document.title,
            "filename": Document.filename,
            "file_type": Document.file_type,
            "file_size": Document.file_size,
            "status": Document.status,
            "chunk_count": Document.chunk_count,
            "created_at": Document.created_at,
            "updated_at": Document.updated_at,
        }

        if sort_by and sort_by in sort_column_map:
            column = sort_column_map[sort_by]
            query = query.order_by(column.desc() if sort_order == "desc" else column.asc())
        else:
            # Default sort by created_at descending
            query = query.order_by(Document.created_at.desc())

        # Get total count
        total = await self.db.scalar(count_query)

        # Apply pagination
        query = query.offset(skip).limit(limit)

        # Execute query
        result = await self.db.execute(query)
        documents = result.scalars().all()

        return list(documents), total or 0