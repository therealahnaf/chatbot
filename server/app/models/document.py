"""Document model."""

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import BaseModel


class Document(BaseModel):
    """Document model for knowledge base document metadata."""

    __tablename__ = "documents"

    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )  # SHA256 hash for duplicate detection
    status: Mapped[str] = mapped_column(
        String(50), default="processing", nullable=False, index=True
    )  # processing, done, failed
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    qdrant_collection: Mapped[str | None] = mapped_column(String(255), nullable=True)
    doc_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    def __repr__(self) -> str:
        """String representation of Document."""
        return f"<Document(id={self.id}, title={self.title}, filename={self.filename}, status={self.status})>"
