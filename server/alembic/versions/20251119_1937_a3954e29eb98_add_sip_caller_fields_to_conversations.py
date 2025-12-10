"""add_sip_caller_fields_to_conversations

Revision ID: a3954e29eb98
Revises: e4392d909b19
Create Date: 2025-11-19 19:37:04.321192

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3954e29eb98'
down_revision: Union[str, None] = 'e4392d909b19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add SIP-specific fields for inbound SIP calls
    op.add_column('conversations', sa.Column('phone_number', sa.String(length=50), nullable=True))
    op.add_column('conversations', sa.Column('sip_uri', sa.String(length=255), nullable=True))
    op.add_column('conversations', sa.Column('caller_display_name', sa.String(length=255), nullable=True))

    # Create index on phone_number for faster lookups
    op.create_index(op.f('ix_conversations_phone_number'), 'conversations', ['phone_number'], unique=False)


def downgrade() -> None:
    # Remove index and columns
    op.drop_index(op.f('ix_conversations_phone_number'), table_name='conversations')
    op.drop_column('conversations', 'caller_display_name')
    op.drop_column('conversations', 'sip_uri')
    op.drop_column('conversations', 'phone_number')
