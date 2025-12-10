"""Project schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    """Base Project schema."""

    title: str


class ProjectCreate(ProjectBase):
    """Project creation schema."""

    pass


class ProjectUpdate(BaseModel):
    """Project update schema."""

    title: str | None = None


class Project(ProjectBase):
    """Project response schema."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
