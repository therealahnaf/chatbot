"""remove_sip_uri_and_caller_display_name

Revision ID: b5f3e8a12c4d
Revises: a3954e29eb98
Create Date: 2025-11-20 13:39:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5f3e8a12c4d'
down_revision: Union[str, None] = 'a3954e29eb98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove unnecessary SIP fields (sip_uri and caller_display_name)
    # phone_number is kept for caller identification
    op.drop_column('conversations', 'caller_display_name')
    op.drop_column('conversations', 'sip_uri')


def downgrade() -> None:
    # Re-add the columns if needed
    op.add_column('conversations', sa.Column('sip_uri', sa.String(length=255), nullable=True))
    op.add_column('conversations', sa.Column('caller_display_name', sa.String(length=255), nullable=True))
