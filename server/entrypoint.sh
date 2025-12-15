#!/bin/bash
set -e

# Run database initialization scripts
echo "Running database creation script..."
uv run scripts/create_db.py

echo "Running Alembic migrations..."
uv run alembic upgrade head

echo "Running database initialization script..."
uv run scripts/init_db.py

echo "Running LangGraph database initialization..."
uv run scripts/init_db_langgraph.py

# Start the application
echo "Starting application..."
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
