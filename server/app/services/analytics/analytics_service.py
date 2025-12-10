"""Analytics service for dashboard statistics."""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any

from sqlalchemy import func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.document import Document
from app.models.feedback import Feedback

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for analytics and dashboard statistics."""

    def __init__(self, db: AsyncSession):
        """Initialize analytics service with database session."""
        self.db = db

    async def get_overview_stats(self) -> Dict[str, Any]:
        """
        Get overview dashboard statistics from PostgreSQL.
        
        Returns:
            Dictionary containing:
            - total_users: Total number of users
            - active_users_7d: Active users in last 7 days
            - active_users_30d: Active users in last 30 days
            - total_conversations: Total number of conversations
            - conversations_trend: Conversations created per day (last 7 days)
            - total_documents: Total number of documents
            - documents_by_status: Documents grouped by status
        """
        try:
            # Calculate date thresholds
            now = datetime.utcnow()
            seven_days_ago = now - timedelta(days=7)
            thirty_days_ago = now - timedelta(days=30)

            # Total users
            total_users_result = await self.db.execute(
                select(func.count(User.id))
            )
            total_users = total_users_result.scalar() or 0

            # Active users (users who created conversations) - last 7 days
            active_users_7d_result = await self.db.execute(
                select(func.count(func.distinct(Conversation.user_id)))
                .where(Conversation.created_at >= seven_days_ago)
            )
            active_users_7d = active_users_7d_result.scalar() or 0

            # Active users - last 30 days
            active_users_30d_result = await self.db.execute(
                select(func.count(func.distinct(Conversation.user_id)))
                .where(Conversation.created_at >= thirty_days_ago)
            )
            active_users_30d = active_users_30d_result.scalar() or 0

            # Total conversations
            total_conversations_result = await self.db.execute(
                select(func.count(Conversation.id))
            )
            total_conversations = total_conversations_result.scalar() or 0

            # Conversations trend (last 7 days)
            conversations_trend_result = await self.db.execute(
                select(
                    cast(Conversation.created_at, Date).label('date'),
                    func.count(Conversation.id).label('count')
                )
                .where(Conversation.created_at >= seven_days_ago)
                .group_by(cast(Conversation.created_at, Date))
                .order_by(cast(Conversation.created_at, Date))
            )
            conversations_trend = [
                {
                    'date': row.date.isoformat() if row.date else None,
                    'count': row.count
                }
                for row in conversations_trend_result.all()
            ]

            # Total documents
            total_documents_result = await self.db.execute(
                select(func.count(Document.id))
            )
            total_documents = total_documents_result.scalar() or 0

            # Documents by status
            documents_by_status_result = await self.db.execute(
                select(
                    Document.status,
                    func.count(Document.id).label('count')
                )
                .group_by(Document.status)
            )
            documents_by_status = {
                row.status: row.count
                for row in documents_by_status_result.all()
            }

            # User growth trend (last 30 days)
            user_growth_result = await self.db.execute(
                select(
                    cast(User.created_at, Date).label('date'),
                    func.count(User.id).label('count')
                )
                .where(User.created_at >= thirty_days_ago)
                .group_by(cast(User.created_at, Date))
                .order_by(cast(User.created_at, Date))
            )
            user_growth = [
                {
                    'date': row.date.isoformat() if row.date else None,
                    'count': row.count
                }
                for row in user_growth_result.all()
            ]

            # Total messages
            total_messages_result = await self.db.execute(
                select(func.count(Message.id))
            )
            total_messages = total_messages_result.scalar() or 0

            # Messages by role
            messages_by_role_result = await self.db.execute(
                select(
                    Message.role,
                    func.count(Message.id).label('count')
                )
                .group_by(Message.role)
            )
            messages_by_role = {
                row.role: row.count
                for row in messages_by_role_result.all()
            }

            # Average messages per conversation
            if total_conversations > 0:
                avg_messages_per_conv = round(total_messages / total_conversations, 2)
            else:
                avg_messages_per_conv = 0.0

            # Documents by file type
            documents_by_type_result = await self.db.execute(
                select(
                    Document.file_type,
                    func.count(Document.id).label('count')
                )
                .where(Document.file_type.isnot(None))
                .group_by(Document.file_type)
            )
            documents_by_type = {
                row.file_type: row.count
                for row in documents_by_type_result.all()
            }

            # Total chunks across all documents
            total_chunks_result = await self.db.execute(
                select(func.sum(Document.chunk_count))
            )
            total_chunks = total_chunks_result.scalar() or 0

            # Feedback statistics
            total_feedback_result = await self.db.execute(
                select(func.count(Feedback.id))
            )
            total_feedback = total_feedback_result.scalar() or 0

            # Average feedback rating
            avg_rating_result = await self.db.execute(
                select(func.avg(Feedback.rating).label('avg'))
            )
            avg_rating = round(avg_rating_result.scalar() or 0, 2)

            # Feedback by rating
            feedback_by_rating_result = await self.db.execute(
                select(
                    Feedback.rating,
                    func.count(Feedback.id).label('count')
                )
                .group_by(Feedback.rating)
                .order_by(Feedback.rating)
            )
            feedback_by_rating = {
                str(row.rating): row.count
                for row in feedback_by_rating_result.all()
            }

            # Messages trend (last 7 days)
            messages_trend_result = await self.db.execute(
                select(
                    cast(Message.created_at, Date).label('date'),
                    func.count(Message.id).label('count')
                )
                .where(Message.created_at >= seven_days_ago)
                .group_by(cast(Message.created_at, Date))
                .order_by(cast(Message.created_at, Date))
            )
            messages_trend = [
                {
                    'date': row.date.isoformat() if row.date else None,
                    'count': row.count
                }
                for row in messages_trend_result.all()
            ]

            # Documents trend (last 30 days)
            documents_trend_result = await self.db.execute(
                select(
                    cast(Document.created_at, Date).label('date'),
                    func.count(Document.id).label('count')
                )
                .where(Document.created_at >= thirty_days_ago)
                .group_by(cast(Document.created_at, Date))
                .order_by(cast(Document.created_at, Date))
            )
            documents_trend = [
                {
                    'date': row.date.isoformat() if row.date else None,
                    'count': row.count
                }
                for row in documents_trend_result.all()
            ]

            return {
                'total_users': total_users,
                'active_users_7d': active_users_7d,
                'active_users_30d': active_users_30d,
                'user_growth': user_growth,
                'total_conversations': total_conversations,
                'conversations_trend': conversations_trend,
                'total_messages': total_messages,
                'messages_by_role': messages_by_role,
                'messages_trend': messages_trend,
                'avg_messages_per_conv': avg_messages_per_conv,
                'total_documents': total_documents,
                'documents_by_status': documents_by_status,
                'documents_by_type': documents_by_type,
                'documents_trend': documents_trend,
                'total_chunks': total_chunks,
                'total_feedback': total_feedback,
                'avg_rating': avg_rating,
                'feedback_by_rating': feedback_by_rating,
            }

        except Exception as e:
            logger.error(f"Error fetching overview stats: {e}", exc_info=True)
            raise

