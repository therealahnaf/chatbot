# AI Agent Platform

A production-ready AI Agent Platform built with FastAPI, LangChain, LangGraph, and comprehensive
observability.

## Features

- 🤖 **AI Agent System**: LangGraph workflows with smart routing
- 🔐 **Security**: JWT authentication, RBAC, rate limiting
- 📚 **Knowledge Base**: Semantic search with Qdrant
- 📊 **Observability**: Prometheus metrics + Grafana dashboards
- 🎯 **Prompts Management**: Centralized, version-controlled prompts
- 🚀 **Performance**: Async/await, caching, connection pooling

## Tech Stack

- **API**: FastAPI (async)
- **Agent**: LangChain + LangGraph
- **LLM**: OpenAI (GPT-4, embeddings)
- **Databases**: PostgreSQL, Qdrant, Redis
- **Monitoring**: Prometheus, Grafana, Langfuse
- **Containerization**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- uv (Python package manager)
- OpenAI API key

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd ai-agent-platform
   ```

2. **Install uv** (if not already installed):

   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

3. **Install dependencies**:

   ```bash
   uv pip install -e ".[dev]"
   # or use make
   make install
   ```

4. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

5. **Start services**:

   ```bash
   docker-compose up -d
   ```

6. **Run database migrations**:

   ```bash
   uv run alembic upgrade head
   # or use make
   make migrate
   ```

7. **Start the application**:
   ```bash
   uv run uvicorn app.main:app --reload
   # or use make
   make dev
   ```

### Access Services

- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Metrics Endpoint**: http://localhost:8000/metrics

## Project Structure

```
ai-agent-platform/
├── app/                    # Application code
│   ├── api/               # API endpoints
│   ├── services/          # Business logic
│   ├── models/            # Database models
│   ├── repositories/      # Data access
│   ├── schemas/           # Pydantic schemas
│   └── core/              # Configuration
├── prompts/               # LLM prompts
├── tests/                 # Test suite
├── prometheus/            # Prometheus config
├── grafana/               # Grafana dashboards
└── alembic/               # Database migrations
```

## Development

### Running Tests

```bash
# Run all tests
uv run pytest
# or use make
make test

# Run with coverage
uv run pytest --cov=app --cov-report=html
# or use make
make test-cov

# Run specific test file
uv run pytest tests/unit/test_agent.py
```

### Code Quality

```bash
# Run all linters and formatters
make lint
make format

# Or use individual commands:

# Pylint (comprehensive Python linter)
uv run pylint app --rcfile=pyproject.toml

# Black (code formatter)
uv run black app tests

# isort (import sorting)
uv run isort app tests

# mypy (type checking)
uv run mypy app

# Bandit (security checks)
uv run bandit -r app

# Pre-commit hooks (runs all checks)
uv run pre-commit run --all-files
```

### Pre-commit Hooks

Install pre-commit hooks to automatically check code before commits:

```bash
make setup-hooks
# or
uv run pre-commit install
uv run pre-commit install --hook-type commit-msg
```

### Database Migrations

```bash
# Create a new migration
uv run alembic revision --autogenerate -m "description"
# or use make
make migrate-create

# Apply migrations
uv run alembic upgrade head
# or use make
make migrate

# Rollback migration
uv run alembic downgrade -1
# or use make
make migrate-down
```

## Configuration

All configuration is managed through environment variables. See `.env.example` for available
options.

### Key Configuration

- `OPENAI_API_KEY`: Your OpenAI API key
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `QDRANT_URL`: Qdrant vector database URL
- `SECRET_KEY`: JWT secret key (min 32 characters)

## API Documentation

Once the application is running, visit:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Monitoring

### Prometheus Metrics

Access Prometheus at http://localhost:9090 to:

- Query metrics using PromQL
- View active alerts
- Check target health

### Grafana Dashboards

Access Grafana at http://localhost:3000 (default: admin/admin) to view:

1. **System Overview**: Health, performance, active users
2. **API Performance**: Endpoint analysis, slow queries
3. **Agent Analytics**: Usage, costs, tool distribution
4. **Infrastructure**: Resources, connections, cache

## Architecture

### Smart Agent Router

The platform uses a Chain of Responsibility pattern for agent routing:

```
Query → Intent Classifier → Context Enricher → Tool Selector →
Agent Executor → Response Formatter → Response
```

No conditional logic - each handler processes and passes to the next.

### Conversation Management

- Auto-creates conversations on first query
- Stores all messages under conversations
- Retrieval includes messages + feedback
- Clean lifecycle management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub.

uv run scripts/create_db.py
uv run scripts/init_db.py
uv run alembic upgrade head
uv run scripts/init_db_langgraph.py
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000