"""Database initialization."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.core.security import get_password_hash
from app.models.user import User
from app.repositories.user_repository import UserRepository


async def init_db(db: AsyncSession) -> None:
    """
    Initialize database with default data.

    Args:
        db: Database session
    """
    logger.info("Initializing database...")

    user_repo = UserRepository(db)

    # Check if admin user exists
    admin_email = "admin@example.com"
    admin_user = await user_repo.get_by_email(admin_email)

    if not admin_user:
        # Create default admin user
        admin_password = get_password_hash("Admin@123")
        admin_user = await user_repo.create(
            obj_in={
                "email": admin_email,
                "hashed_password": admin_password,
                "first_name": "Admin",
                "last_name": "User",
            }
        )
        admin_user.role = "admin"
        await db.commit()
        logger.info("Created default admin user", email=admin_email)
    else:
        logger.info("Admin user already exists", email=admin_email)

    logger.info("Database initialization complete")
