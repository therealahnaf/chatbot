# 🚀 Quick Start Guide

## Prerequisites

- Python 3.11+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

## Step 1: Install Dependencies

```bash
# Using uv (recommended)
uv pip install -e ".[dev]"

# Or using pip
pip install -e ".[dev]"
```

## Step 2: Start Database

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Or start all services
docker-compose up -d
```

## Step 3: Configure Environment

The `.env` file has been created with default values. **Important**: Update these values:

```bash
# Edit .env file
nano .env

# Required changes:
# 1. Set your OpenAI API key
OPENAI_API_KEY=sk-your-actual-openai-api-key

# 2. Change the secret key (generate a secure random string)
SECRET_KEY=your-secure-secret-key-at-least-32-characters-long
```

## Step 4: Create Database Tables

```bash
# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

## Step 5: Initialize Database

```bash
# Create default admin user
python scripts/init_db.py
```

This creates an admin user:
- **Email**: `admin@example.com`
- **Password**: `Admin@123`

## Step 6: Run the Application

```bash
# Start the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or use the Makefile
make dev
```

## Step 7: Test the API

### Access the API Documentation

Open your browser:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### Test Authentication

#### 1. Register a New User

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "full_name": "Test User"
  }'
```

#### 2. Login

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

#### 3. Get Current User Info

```bash
# Replace YOUR_ACCESS_TOKEN with the token from login
curl -X GET "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Swagger UI (Easier!)

1. Go to http://localhost:8000/docs
2. Click "Authorize" button (top right)
3. Login to get a token
4. Paste the token in the authorization dialog
5. Try the endpoints!

## Step 8: Access Monitoring

### Prometheus Metrics

```bash
# View metrics
curl http://localhost:8000/metrics
```

### Grafana Dashboard

If you started all services with docker-compose:

1. Open http://localhost:3000
2. Login with `admin` / `admin`
3. Add Prometheus data source: http://prometheus:9090
4. Create dashboards or import pre-configured ones

## Troubleshooting

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Migration Errors

```bash
# Reset database (WARNING: Deletes all data!)
docker-compose down -v
docker-compose up -d postgres

# Recreate migrations
rm alembic/versions/*.py
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### Import Errors

```bash
# Reinstall dependencies
uv pip install -e ".[dev]"

# Or
pip install -e ".[dev]"
```

## Next Steps

### 1. Implement More Features

Continue with the remaining tasks:
- Task 5: Redis cache layer
- Task 6: Qdrant vector store
- Task 7: External integrations
- Task 8-14: Services and repositories
- Task 15-27: API endpoints and features

### 2. Run Tests

```bash
# Run all tests
make test

# Run with coverage
make test-cov
```

### 3. Code Quality

```bash
# Format code
make format

# Run linters
make lint
```

### 4. Deploy

See `docker-compose.yml` for production deployment configuration.

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/refresh` - Refresh access token

### Users
- `GET /api/v1/users/me` - Get current user info

### System
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics
- `GET /` - API information

## Default Credentials

**Admin User** (created by init_db.py):
- Email: `admin@example.com`
- Password: `Admin@123`

**⚠️ Change these credentials in production!**

## Environment Variables

Key variables in `.env`:
- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `SECRET_KEY` - JWT secret key (change in production!)
- `DATABASE_URL` - PostgreSQL connection string
- `APP_ENV` - Environment (development/staging/production)

See `.env.example` for all available options.

## Support

- Documentation: `/docs`
- Health Check: `/health`
- Metrics: `/metrics`

---

**Status**: ✅ Ready to run!  
**Version**: 1.0.0  
**Happy coding!** 🎉
