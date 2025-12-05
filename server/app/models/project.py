"""Project model."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import BaseModel


class Project(BaseModel):
    """Project model."""

    __tablename__ = "projects"

    title: Mapped[str] = mapped_column(String(255), nullable=False)

    def __repr__(self) -> str:
        """String representation of Project."""
        return f"<Project(id={self.id}, title={self.title})>"
