"""Chat widget model for widget configuration management."""

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import BaseModel

if TYPE_CHECKING:
    from app.models.user import User


class ChatWidget(BaseModel):
    """Chat widget model for storing widget configurations."""

    __tablename__ = "chat_widgets"

    # Owner information
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Basic information
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    position: Mapped[str] = mapped_column(String(50), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Configuration stored as JSONB
    colors: Mapped[dict] = mapped_column(JSONB, nullable=False)
    radius: Mapped[dict] = mapped_column(JSONB, nullable=False)
    init_page: Mapped[dict] = mapped_column(JSONB, nullable=False)

    # Text fields
    welcome_message: Mapped[str] = mapped_column(Text, nullable=False)
    placeholder: Mapped[str] = mapped_column(String(255), nullable=False)
    api_endpoint: Mapped[str] = mapped_column(String(500), nullable=False)

    # Icon visibility
    show_bot_icon: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    show_user_icon: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationship
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    def __repr__(self) -> str:
        """String representation of ChatWidget."""
        return f"<ChatWidget(id={self.id}, name={self.name}, user_id={self.user_id})>"
