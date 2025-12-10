# AI Agent Platform

A full-stack AI Agent Platform built with FastAPI backend and React frontend, featuring LangChain, LangGraph, and comprehensive observability.

## 🚀 Quick Start

### Prerequisites

- **Docker** & **Docker Compose** (latest version)
- **Node.js** 20+ (for local development)
- **Python** 3.11+ (for local development)
- **uv** (Python package manager) - [Installation Guide](https://github.com/astral-sh/uv)
- **OpenAI API Key** (for AI agent functionality)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd bstnet
   ```

2. **Set up environment variables**:
   ```bash
   # Server environment
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   
   # Client environment (if needed)
   cp client/.env.example client/.env
   ```

3. **Start all services**:
   ```bash
   make up
   ```

   This will start:
   - **API Server** (FastAPI) on `http://localhost:8000`
   - **Frontend** (React + Vite) on `http://localhost:5173`
   - **PostgreSQL** database on port `5432`
   - **Redis** cache on port `6379`
   - **Qdrant** vector database on port `6333`
   - **Prometheus** metrics on port `9090`
   - **Grafana** dashboards on port `3000`

4. **Run database migrations**:
   ```bash
   cd server
   uv run python -m alembic upgrade head
   # or use make (from server directory)
   make migrate
   ```

## 📋 Make Commands

From the root directory, you can use these commands:

| Command | Description |
|---------|-------------|
| `make up` | Start everything (API + Frontend + Services) |
| `make down` | Stop everything |
| `make logs` | View all logs |
| `make logs-api` | View only API logs |
| `make restart` | Restart all services |
| `make clean` | Stop and remove everything (containers, volumes) |
| `make rebuild` | Rebuild and restart all services |

Run `make help` to see all available commands.

## 🏗️ Project Structure

```
bstnet/
├── server/                 # FastAPI Backend
│   ├── app/               # Application code
│   │   ├── api/           # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── models/         # Database models
│   │   ├── repositories/   # Data access layer
│   │   ├── schemas/        # Pydantic schemas
│   │   └── core/           # Configuration
│   ├── alembic/           # Database migrations
│   ├── tests/             # Test suite
│   ├── docker-compose.yml # Server services (Postgres, Redis, etc.)
│   └── Dockerfile          # Server container
│
├── client/                # React Frontend
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── features/      # Feature modules
│   │   ├── routes/         # Routing
│   │   └── lib/           # Utilities
│   ├── docker-compose.yml # Frontend service
│   └── Dockerfile          # Frontend container
│
├── Makefile               # Root make commands
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## 🛠️ Development

### Backend Development

1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies** (using uv):
   ```bash
   uv sync
   # or for development
   uv pip install -e ".[dev]"
   ```

3. **Run migrations**:
   ```bash
   uv run python -m alembic upgrade head
   ```

4. **Start development server**:
   ```bash
   uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Development

1. **Navigate to client directory**:
   ```bash
   cd client
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

## 🐳 Docker Services

### Backend Services (server/docker-compose.yml)

- **API**: FastAPI application with hot reload
- **PostgreSQL**: Database for application data
- **Redis**: Caching and rate limiting
- **Qdrant**: Vector database for embeddings
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

### Frontend Services (client/docker-compose.yml)

- **Frontend**: React application with Vite dev server

## 🔧 Configuration

### Environment Variables

#### Server (server/.env)

Required variables:
```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ai_agent_db
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_agent_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Qdrant
QDRANT_URL=http://localhost:6333

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Langfuse (optional)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com

# JWT Secret
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### Client (client/.env)

```env
VITE_API_URL=http://localhost:8000
```

## 📊 API Documentation

Once the services are running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## 🧪 Testing

### Backend Tests

```bash
cd server
uv run pytest
# With coverage
uv run pytest --cov=app --cov-report=html
```

### Frontend Tests

```bash
cd client
pnpm test
# or
npm test
```

## 📦 Building for Production

### Backend

```bash
cd server
docker build -t ai-agent-api .
```

### Frontend

```bash
cd client
docker build -t ai-agent-frontend .
```

## 🗄️ Database Management

### Create Migration

```bash
cd server
uv run python -m alembic revision --autogenerate -m "description"
```

### Run Migrations

```bash
cd server
uv run python -m alembic upgrade head
```

### Rollback Migration

```bash
cd server
uv run python -m alembic downgrade -1
```

## 🔍 Monitoring

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **API Metrics**: http://localhost:8000/metrics

## 🐛 Troubleshooting

### Services won't start

1. Check if ports are already in use:
   ```bash
   # Check ports
   lsof -i :8000
   lsof -i :5173
   lsof -i :5432
   ```

2. Clean and rebuild:
   ```bash
   make clean
   make rebuild
   ```

### Database connection issues

1. Ensure PostgreSQL is healthy:
   ```bash
   docker-compose -f server/docker-compose.yml ps postgres
   ```

2. Check database logs:
   ```bash
   docker-compose -f server/docker-compose.yml logs postgres
   ```

### Frontend build issues

1. Clear node_modules and reinstall:
   ```bash
   cd client
   rm -rf node_modules
   pnpm install
   ```

## 📝 Code Quality

### Backend

```bash
cd server
make lint      # Run linters
make format    # Format code
make test      # Run tests
```

### Frontend

```bash
cd client
pnpm lint      # Run linter
pnpm format    # Format code
pnpm typecheck # Type check
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linters
4. Submit a pull request

## 📄 License

[Add your license here]

## 🔗 Useful Links

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [LangChain Documentation](https://python.langchain.com/)
- [Docker Documentation](https://docs.docker.com/)

## 📞 Support

For issues and questions, please open an issue on GitHub.








