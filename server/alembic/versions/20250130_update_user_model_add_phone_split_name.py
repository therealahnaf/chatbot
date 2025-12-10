"""update user model add phone split name

Revision ID: update_user_phone_name
Revises: dbc1706062c5
Create Date: 2025-01-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'update_user_phone_name'
down_revision: Union[str, None] = 'dbc1706062c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns: first_name, last_name, phone_number
    op.add_column('users', sa.Column('first_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('phone_number', sa.String(length=50), nullable=True))
    
    # Migrate data from full_name to first_name and last_name
    # Split full_name into first_name and last_name if it exists
    # Use PostgreSQL's SPLIT_PART function
    op.execute("""
        UPDATE users 
        SET first_name = CASE 
            WHEN full_name IS NOT NULL AND full_name != '' 
            THEN TRIM(SPLIT_PART(full_name, ' ', 1))
            ELSE NULL
        END,
        last_name = CASE 
            WHEN full_name IS NOT NULL AND full_name != '' 
                 AND LENGTH(full_name) > LENGTH(SPLIT_PART(full_name, ' ', 1))
            THEN TRIM(SUBSTRING(full_name FROM LENGTH(SPLIT_PART(full_name, ' ', 1)) + 2))
            ELSE NULL
        END
        WHERE full_name IS NOT NULL;
    """)
    
    # Drop the old full_name column
    op.drop_column('users', 'full_name')


def downgrade() -> None:
    # Add back full_name column
    op.add_column('users', sa.Column('full_name', sa.String(length=255), nullable=True))
    
    # Merge first_name and last_name back to full_name
    op.execute("""
        UPDATE users 
        SET full_name = CASE 
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
            THEN TRIM(first_name || ' ' || last_name)
            WHEN first_name IS NOT NULL 
            THEN first_name
            WHEN last_name IS NOT NULL 
            THEN last_name
            ELSE NULL
        END;
    """)
    
    # Drop the new columns
    op.drop_column('users', 'phone_number')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')

