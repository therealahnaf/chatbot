#!/bin/bash

# AI Agent Platform - Database Setup Script

set -e  # Exit on error

echo "🚀 Setting up AI Agent Platform Database..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Start PostgreSQL
echo "📦 Starting PostgreSQL..."
docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is ready
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done

echo -e "${GREEN}✓${NC} PostgreSQL is ready"
echo ""

# 2. Create migration
echo "📝 Creating migration..."
if alembic revision --autogenerate -m "Initial migration with User model"; then
    echo -e "${GREEN}✓${NC} Migration created"
else
    echo -e "${YELLOW}⚠${NC} Migration creation failed or no changes detected"
fi
echo ""

# 3. Apply migration
echo "⬆️  Applying migration..."
if alembic upgrade head; then
    echo -e "${GREEN}✓${NC} Migration applied successfully"
else
    echo "❌ Migration failed"
    exit 1
fi
echo ""

# 4. Initialize database
echo "🔧 Initializing database with default data..."
if python scripts/init_db.py; then
    echo -e "${GREEN}✓${NC} Database initialized"
else
    echo "❌ Database initialization failed"
    exit 1
fi
echo ""

echo "✅ Database setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Default admin user created:"
echo "  📧 Email: admin@example.com"
echo "  🔑 Password: Admin@123"
echo ""
echo "⚠️  Change this password in production!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Start the API: uvicorn app.main:app --reload"
echo "  2. Visit: http://localhost:8000/docs"
echo "  3. Test login with admin credentials"
