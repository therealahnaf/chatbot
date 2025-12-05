"""Analytics model."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import BaseModel


class AnalyticsEvent(BaseModel):
    """Analytics event model for tracking system usage and metrics."""

    __tablename__ = "analytics_events"

    user_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_data: Mapped[dict] = mapped_column(JSONB, nullable=False)

    def __repr__(self) -> str:
        """String representation of AnalyticsEvent."""
        return f"<AnalyticsEvent(id={self.id}, event_type={self.event_type}, user_id={self.user_id})>"
