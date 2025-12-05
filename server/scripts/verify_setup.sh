#!/bin/bash

# AI Agent Platform - Setup Verification Script

echo "🔍 Verifying AI Agent Platform Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python version
echo "📦 Checking Python version..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION installed"
else
    echo -e "${RED}✗${NC} Python 3.11+ required"
    exit 1
fi

# Check uv
echo "📦 Checking uv..."
if command -v uv &> /dev/null; then
    UV_VERSION=$(uv --version | cut -d' ' -f2)
    echo -e "${GREEN}✓${NC} uv $UV_VERSION installed"
else
    echo -e "${YELLOW}⚠${NC} uv not found. Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
fi

# Check Docker
echo "🐳 Checking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    echo -e "${GREEN}✓${NC} Docker $DOCKER_VERSION installed"
else
    echo -e "${RED}✗${NC} Docker required"
    exit 1
fi

# Check Docker Compose
echo "🐳 Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f4 | tr -d ',')
    echo -e "${GREEN}✓${NC} Docker Compose $COMPOSE_VERSION installed"
else
    echo -e "${RED}✗${NC} Docker Compose required"
    exit 1
fi

# Check directory structure
echo ""
echo "📁 Checking directory structure..."
REQUIRED_DIRS=(
    "app/api"
    "app/services"
    "app/models"
    "app/repositories"
    "app/schemas"
    "app/core"
    "prompts/agent"
    "prompts/tools"
    "tests/unit"
    "tests/integration"
    "prometheus"
    "grafana"
    "alembic"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $dir"
    else
        echo -e "${RED}✗${NC} $dir missing"
    fi
done

# Check configuration files
echo ""
echo "📄 Checking configuration files..."
REQUIRED_FILES=(
    "pyproject.toml"
    ".env.example"
    ".gitignore"
    "docker-compose.yml"
    "Dockerfile"
    "README.md"
    "pytest.ini"
    "alembic.ini"
    "prometheus/prometheus.yml"
    "prometheus/alerts.yml"
    "grafana/datasources/prometheus.yml"
    "grafana/dashboards/dashboards.yml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file missing"
    fi
done

# Check .env file
echo ""
echo "🔐 Checking environment configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    # Check for required variables
    REQUIRED_VARS=("OPENAI_API_KEY" "SECRET_KEY" "DATABASE_URL")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env; then
            echo -e "${GREEN}✓${NC} $var configured"
        else
            echo -e "${YELLOW}⚠${NC} $var not configured in .env"
        fi
    done
else
    echo -e "${YELLOW}⚠${NC} .env file not found. Copy from .env.example and configure"
fi

echo ""
echo "✅ Setup verification complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure your API keys"
echo "2. Install dependencies: make install (or uv pip install -e \".[dev]\")"
echo "3. Start services: docker-compose up -d"
echo "4. Run migrations: make migrate (or uv run alembic upgrade head)"
echo "5. Start application: make dev (or uv run uvicorn app.main:app --reload)"
