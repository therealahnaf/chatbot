"""add file_hash to documents

Revision ID: add_file_hash_docs
Revises:
Create Date: 2025-01-10 17:55:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_file_hash_docs'
down_revision = 'dcfc9be4cb42'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add file_hash column to documents table."""
    op.add_column('documents', sa.Column('file_hash', sa.String(length=64), nullable=True))
    op.create_index(op.f('ix_documents_file_hash'), 'documents', ['file_hash'], unique=True)


def downgrade() -> None:
    """Remove file_hash column from documents table."""
    op.drop_index(op.f('ix_documents_file_hash'), table_name='documents')
    op.drop_column('documents', 'file_hash')
