"""add_title_and_status_to_documents

Revision ID: c6b4f57b71ff
Revises: 
Create Date: 2025-10-31 18:32:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c6b4f57b71ff'
down_revision: Union[str, None] = 'update_user_phone_name'
depends_on: Union[str, None] = None


def upgrade() -> None:
    # Add title column (nullable initially to allow existing rows)
    op.add_column('documents', sa.Column('title', sa.String(length=500), nullable=True))
    
    # Add status column with default value
    op.add_column('documents', sa.Column('status', sa.String(length=50), nullable=False, server_default='done'))
    
    # Create index on status
    op.create_index(op.f('ix_documents_status'), 'documents', ['status'], unique=False)
    
    # Update existing documents: set title from filename (remove extension)
    op.execute("""
        UPDATE documents
        SET title = CASE
            WHEN filename LIKE '%.%' THEN
                SUBSTRING(filename FROM 1 FOR POSITION('.' IN REVERSE(filename)) - 1)
            ELSE
                filename
        END
        WHERE title IS NULL;
    """)
    
    # Now make title NOT NULL after backfilling
    op.alter_column('documents', 'title', nullable=False)


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_documents_status'), table_name='documents')
    
    # Drop columns
    op.drop_column('documents', 'status')
    op.drop_column('documents', 'title')
