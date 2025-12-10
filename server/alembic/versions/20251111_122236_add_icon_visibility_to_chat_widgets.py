"""Add icon visibility columns to chat_widgets table

Revision ID: add_icon_visibility_chat_widgets
Revises: add_chat_widgets
Create Date: 2025-11-11 12:22:36

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_icon_visibility_chat_widgets'
down_revision = 'add_chat_widgets'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add show_bot_icon and show_user_icon columns to chat_widgets table."""
    op.add_column(
        'chat_widgets',
        sa.Column('show_bot_icon', sa.Boolean(), nullable=False, server_default='true')
    )
    op.add_column(
        'chat_widgets',
        sa.Column('show_user_icon', sa.Boolean(), nullable=False, server_default='true')
    )


def downgrade() -> None:
    """Remove show_bot_icon and show_user_icon columns from chat_widgets table."""
    op.drop_column('chat_widgets', 'show_user_icon')
    op.drop_column('chat_widgets', 'show_bot_icon')

