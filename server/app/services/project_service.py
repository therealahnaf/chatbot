"""Project service."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError
from app.models.project import Project
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    """Service for project operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.project_repo = ProjectRepository(db)

    async def create_project(self, project_data: ProjectCreate) -> Project:
        """Create a new project."""
        return await self.project_repo.create(obj_in=project_data.model_dump())

    async def get_project(self, project_id: UUID) -> Project:
        """Get project by ID."""
        project = await self.project_repo.get(project_id)
        if not project:
            raise ResourceNotFoundError("Project", str(project_id))
        return project

    async def update_project(
        self, project_id: UUID, project_data: ProjectUpdate
    ) -> Project:
        """Update a project."""
        project = await self.get_project(project_id)
        update_data = project_data.model_dump(exclude_unset=True)
        if update_data:
            project = await self.project_repo.update(project_id, obj_in=update_data)
        return project

    async def delete_project(self, project_id: UUID) -> bool:
        """Delete a project."""
        await self.get_project(project_id)
        return await self.project_repo.delete(project_id)

    async def list_projects(self, skip: int = 0, limit: int = 100) -> list[Project]:
        """List projects."""
        return await self.project_repo.get_multi(skip=skip, limit=limit)
