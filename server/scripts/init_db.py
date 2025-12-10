#!/usr/bin/env python3
"""Initialize database with default data."""

import asyncio

from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal


async def main() -> None:
    """Main function."""
    print("Initializing database...")

    async with AsyncSessionLocal() as session:
        await init_db(session)

    print("Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(main())
