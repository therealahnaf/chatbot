"""Feedback model."""

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import BaseModel

if TYPE_CHECKING:
    from app.models.message import Message


class Feedback(BaseModel):
    """Feedback model for collecting user feedback on messages."""

    __tablename__ = "feedback"

    message_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        unique=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    message: Mapped["Message"] = relationship("Message", back_populates="feedback")

    __table_args__ = (CheckConstraint("rating >= 1 AND rating <= 5", name="check_rating_range"),)

    def __repr__(self) -> str:
        """String representation of Feedback."""
        return f"<Feedback(id={self.id}, message_id={self.message_id}, rating={self.rating})>"
