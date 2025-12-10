"""Projects API endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.project import Project, ProjectCreate, ProjectUpdate
from app.services.project_service import ProjectService
from app.core.exceptions import ResourceNotFoundError

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    """Create a new project."""
    service = ProjectService(db)
    return await service.create_project(project_data)


@router.get("", response_model=list[Project])
async def list_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[Project]:
    """List projects."""
    service = ProjectService(db)
    return await service.list_projects(skip=skip, limit=limit)


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    """Get project by ID."""
    service = ProjectService(db)
    try:
        return await service.get_project(project_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    """Update project."""
    service = ProjectService(db)
    try:
        return await service.update_project(project_id, project_data)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete project."""
    service = ProjectService(db)
    try:
        await service.delete_project(project_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
