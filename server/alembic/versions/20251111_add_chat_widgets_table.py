"""Add chat_widgets table

Revision ID: add_chat_widgets
Revises: add_file_hash_docs
Create Date: 2025-11-11 00:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


# revision identifiers, used by Alembic.
revision = 'add_chat_widgets'
down_revision = 'add_file_hash_docs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create chat_widgets table."""
    op.create_table(
        'chat_widgets',
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('position', sa.String(length=50), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('colors', JSONB, nullable=False),
        sa.Column('radius', JSONB, nullable=False),
        sa.Column('init_page', JSONB, nullable=False),
        sa.Column('welcome_message', sa.Text(), nullable=False),
        sa.Column('placeholder', sa.String(length=255), nullable=False),
        sa.Column('api_endpoint', sa.String(length=500), nullable=False),
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index(op.f('ix_chat_widgets_id'), 'chat_widgets', ['id'], unique=False)
    op.create_index(op.f('ix_chat_widgets_user_id'), 'chat_widgets', ['user_id'], unique=False)
    op.create_index(op.f('ix_chat_widgets_name'), 'chat_widgets', ['name'], unique=False)


def downgrade() -> None:
    """Drop chat_widgets table."""
    op.drop_index(op.f('ix_chat_widgets_name'), table_name='chat_widgets')
    op.drop_index(op.f('ix_chat_widgets_user_id'), table_name='chat_widgets')
    op.drop_index(op.f('ix_chat_widgets_id'), table_name='chat_widgets')
    op.drop_table('chat_widgets')
