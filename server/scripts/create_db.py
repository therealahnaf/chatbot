import asyncio
import asyncpg
import os
from urllib.parse import urlparse

async def create_databases():
    # Default to localhost if not specified, but try to use env vars
    # Note: We connect to 'postgres' database first to create others
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
    
    # Parse the URL to get connection details
    parsed = urlparse(db_url)
    user = parsed.username or "postgres"
    password = parsed.password or "postgres"
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    
    # Databases to create
    databases = ["ai_agent_db", "langfuse_db"]
    
    print(f"Connecting to postgres at {host}:{port}...")
    
    try:
        # Connect to the default 'postgres' database
        conn = await asyncpg.connect(
            user=user,
            password=password,
            database="postgres",
            host=host,
            port=port
        )
        
        for db_name in databases:
            try:
                # Check if database exists
                exists = await conn.fetchval(
                    "SELECT 1 FROM pg_database WHERE datname = $1",
                    db_name
                )
                
                if not exists:
                    print(f"Creating database '{db_name}'...")
                    await conn.execute(f'CREATE DATABASE "{db_name}"')
                    print(f"✓ Database '{db_name}' created successfully.")
                else:
                    print(f"✓ Database '{db_name}' already exists.")
                    
            except Exception as e:
                print(f"✗ Error creating database '{db_name}': {e}")
                
        await conn.close()
        
    except Exception as e:
        print(f"✗ Failed to connect to postgres: {e}")
        print("Please ensure your database container is running.")
        return

if __name__ == "__main__":
    asyncio.run(create_databases())
