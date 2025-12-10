.PHONY: help install lint format test clean docker-up docker-down migrate

# Default target
help:
	@echo "AI Agent Platform - Available Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install          Install dependencies with Poetry"
	@echo "  make setup-hooks      Install pre-commit hooks"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint             Run all linters (ruff, mypy, bandit)"
	@echo "  make format           Format code (black, isort, ruff)"
	@echo "  make check            Run linters without fixing"
	@echo ""
	@echo "Testing:"
	@echo "  make test             Run all tests"
	@echo "  make test-unit        Run unit tests only"
	@echo "  make test-integration Run integration tests only"
	@echo "  make test-cov         Run tests with coverage report"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        Start all Docker services"
	@echo "  make docker-down      Stop all Docker services"
	@echo "  make docker-logs      View Docker logs"
	@echo "  make docker-clean     Remove all Docker volumes"
	@echo ""
	@echo "Database:"
	@echo "  make migrate          Run database migrations"
	@echo "  make migrate-create   Create new migration"
	@echo "  make migrate-down     Rollback last migration"
	@echo ""
	@echo "Development:"
	@echo "  make dev              Start development server"
	@echo "  make clean            Clean cache and build files"

# Setup
install:
	uv pip install -e ".[dev]"

setup-hooks:
	uv run pre-commit install
	uv run pre-commit install --hook-type commit-msg

# Code Quality
lint:
	@echo "Running Pylint..."
	uv run pylint app --rcfile=pyproject.toml
	@echo "Running mypy..."
	uv run mypy app
	@echo "Running bandit security checks..."
	uv run bandit -r app -c pyproject.toml

format:
	@echo "Formatting with Black..."
	uv run black app tests
	@echo "Sorting imports with isort..."
	uv run isort app tests
	@echo "Formatting YAML/JSON/Markdown with Prettier..."
	npx prettier --write "**/*.{yml,yaml,json,md}" || echo "Prettier not available, skipping"

check:
	@echo "Checking with Pylint..."
	uv run pylint app --rcfile=pyproject.toml
	@echo "Checking with Black..."
	uv run black --check app tests
	@echo "Checking with mypy..."
	uv run mypy app

# Testing
test:
	uv run pytest

test-unit:
	uv run pytest tests/unit -v

test-integration:
	uv run pytest tests/integration -v

test-cov:
	uv run pytest --cov=app --cov-report=html --cov-report=term

# Docker
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-clean:
	docker-compose down -v
	rm -rf postgres_data redis_data qdrant_data prometheus_data grafana_data

# Database
migrate:
	uv run python -m alembic upgrade head

migrate-create:
	@read -p "Enter migration message: " msg; \
	uv run python -m alembic revision --autogenerate -m "$$msg"

migrate-down:
	uv run python -m alembic downgrade -1

# Development
dev:
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Cleanup
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf htmlcov/
	rm -rf dist/
	rm -rf build/
	@echo "Cleaned up cache and build files"
