"""Conversation model."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import BaseModel

if TYPE_CHECKING:
    from app.models.message import Message


class Conversation(BaseModel):
    """Conversation model for managing user conversations."""

    __tablename__ = "conversations"

    user_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    conv_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    # SIP-specific fields (for inbound SIP calls without authenticated users)
    phone_number: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)

    # Relationships
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        """String representation of Conversation."""
        return (
            f"<Conversation(id={self.id}, user_id={self.user_id}, title={self.title})>"
        )
