import os
import psycopg
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg.rows import dict_row

def get_db_connection():
    """
    Get a synchronous psycopg (v3) connection.
    Expects a DATABASE_URL env var.
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        # Fallback for local development if env var is missing
        database_url = "postgresql://postgres:postgres@localhost:5432/ai_agent_db"
    
    # Fix SQLAlchemy-style async connection strings for psycopg
    if "postgresql+asyncpg://" in database_url:
        database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    # Return a connection. PostgresSaver works with psycopg connections.
    return psycopg.connect(database_url, autocommit=True, row_factory=dict_row)

def get_checkpointer(conn):
    """
    Get a PostgresSaver instance using the provided connection.
    """
    return PostgresSaver(conn)
