"""Common schemas."""

from typing import Generic, TypeVar
from pydantic import BaseModel, Field


T = TypeVar("T")


class PaginationParams(BaseModel):
    """Pagination parameters."""

    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response."""

    items: list[T]
    total: int
    skip: int
    limit: int


class ErrorResponse(BaseModel):
    """Error response."""

    error: str
    message: str
    details: dict | None = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    environment: str
