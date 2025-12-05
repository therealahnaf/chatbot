"""Knowledge base schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PaginatedDocumentsResponse(BaseModel):
    """Response schema for paginated documents list."""

    items: list["DocumentResponse"] = Field(..., description="List of documents")
    total: int = Field(..., description="Total number of documents")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")

    model_config = {"from_attributes": True}


class DocumentUpload(BaseModel):
    """Request schema for document upload."""

    filename: str = Field(..., max_length=500, description="Document filename")
    file_type: str = Field(..., max_length=50, description="File type (pdf, txt, docx, md)")
    metadata: dict[str, Any] | None = Field(None, description="Optional document metadata")

    model_config = {
        "json_schema_extra": {
            "example": {
                "filename": "company_handbook.pdf",
                "file_type": "pdf",
                "metadata": {"category": "HR", "department": "Operations"},
            }
        }
    }


class DocumentResponse(BaseModel):
    """Response schema for a document."""

    id: UUID = Field(..., description="Document ID")
    user_id: UUID = Field(..., description="User ID")
    title: str = Field(..., description="Document title")
    filename: str = Field(..., description="Document filename")
    file_type: str | None = Field(None, description="File type")
    file_size: int | None = Field(None, description="File size in bytes")
    status: str = Field(..., description="Processing status (processing, done, failed)")
    chunk_count: int = Field(..., description="Number of chunks")
    qdrant_collection: str | None = Field(None, description="Qdrant collection name")
    doc_metadata: dict[str, Any] | None = Field(
        None, description="Document metadata", serialization_alias="metadata"
    )
    created_at: datetime = Field(..., description="Upload timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = {"from_attributes": True, "populate_by_name": True}


class SearchRequest(BaseModel):
    """Request schema for knowledge base search."""

    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    limit: int = Field(5, ge=1, le=20, description="Maximum number of results")
    score_threshold: float = Field(0.5, ge=0.0, le=1.0, description="Minimum similarity score")

    model_config = {"json_schema_extra": {"example": {"query": "What is the vacation policy?", "limit": 5}}}


class SearchResult(BaseModel):
    """Single search result."""

    document_id: UUID = Field(..., description="Document ID")
    chunk_index: int = Field(..., description="Chunk index in document")
    text: str = Field(..., description="Chunk text")
    score: float = Field(..., description="Similarity score")
    metadata: dict[str, Any] | None = Field(None, description="Chunk metadata")


class SearchResponse(BaseModel):
    """Response schema for knowledge base search."""

    query: str = Field(..., description="Original query")
    results: list[SearchResult] = Field(default_factory=list, description="Search results")
    total_results: int = Field(..., description="Total number of results")

    model_config = {
        "json_schema_extra": {
            "example": {
                "query": "vacation policy",
                "results": [
                    {
                        "document_id": "123e4567-e89b-12d3-a456-426614174000",
                        "chunk_index": 0,
                        "text": "Employees are entitled to 15 days of vacation...",
                        "score": 0.92,
                        "metadata": {"page": 5},
                    }
                ],
                "total_results": 1,
            }
        }
    }
