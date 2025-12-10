"""Project repository."""

from app.models.project import Project
from app.repositories.base import BaseRepository


from sqlalchemy.ext.asyncio import AsyncSession

class ProjectRepository(BaseRepository[Project]):
    """Project repository."""

    def __init__(self, db: AsyncSession):
        """Initialize repository."""
        super().__init__(Project, db)
