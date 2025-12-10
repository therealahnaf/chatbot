"""Add voice call metadata to conversation table

Revision ID: e4392d909b19
Revises: add_icon_visibility_chat_widgets
Create Date: 2025-11-18 19:43:41.108198

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4392d909b19'
down_revision: Union[str, None] = 'add_icon_visibility_chat_widgets'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make user_id nullable for voice conversations without authenticated users
    op.alter_column('conversations', 'user_id', nullable=True)

    # Add voice call metadata fields
    op.add_column('conversations', sa.Column('call_start_time', sa.DateTime(timezone=True), nullable=True))
    op.add_column('conversations', sa.Column('call_end_time', sa.DateTime(timezone=True), nullable=True))
    op.add_column('conversations', sa.Column('call_duration_seconds', sa.Float(), nullable=True))
    op.add_column('conversations', sa.Column('room_name', sa.String(length=255), nullable=True))
    op.add_column('conversations', sa.Column('is_voice_conversation', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    # Remove voice call metadata
    op.drop_column('conversations', 'is_voice_conversation')
    op.drop_column('conversations', 'room_name')
    op.drop_column('conversations', 'call_duration_seconds')
    op.drop_column('conversations', 'call_end_time')
    op.drop_column('conversations', 'call_start_time')

    # Revert user_id to not nullable
    op.alter_column('conversations', 'user_id', nullable=False)
