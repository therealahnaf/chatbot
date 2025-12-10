# 🗄️ Database Migration Guide

## Quick Start

### 1. Start PostgreSQL

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Wait for it to be ready (check logs)
docker-compose logs -f postgres
```

### 2. Create Migration

```bash
# Generate migration from models
alembic revision --autogenerate -m "Initial migration"
```

### 3. Apply Migration

```bash
# Run the migration
alembic upgrade head
```

### 4. Initialize Database (Optional)

```bash
# Create default admin user
python scripts/init_db.py
```

## Detailed Steps

### Step 1: Ensure PostgreSQL is Running

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# If not running, start it
docker-compose up -d postgres

# Check logs to ensure it's ready
docker-compose logs postgres

# You should see: "database system is ready to accept connections"
```

### Step 2: Verify Database Connection

```bash
# Test connection
docker-compose exec postgres psql -U postgres -d ai_agent_db -c "SELECT version();"

# Or from your local machine
psql -h localhost -U postgres -d ai_agent_db -c "SELECT version();"
# Password: postgres
```

### Step 3: Create Your First Migration

Alembic will detect your SQLAlchemy models and create migration scripts.

```bash
# Generate migration automatically
alembic revision --autogenerate -m "Initial migration with User model"

# This creates a file in alembic/versions/
# Example: alembic/versions/20251029_1234_initial_migration_with_user_model.py
```

**What happens**:
- Alembic compares your models (`app/models/`) with the database
- Generates SQL to create/modify tables
- Creates a migration file in `alembic/versions/`

### Step 4: Review the Migration (Important!)

```bash
# Open the generated migration file
ls -la alembic/versions/

# Review the migration
cat alembic/versions/*_initial_migration*.py
```

**Check for**:
- ✅ Creates `users` table
- ✅ Has all columns (id, email, hashed_password, full_name, role, is_active, created_at, updated_at)
- ✅ Has indexes on email and role
- ✅ Has unique constraint on email

### Step 5: Apply the Migration

```bash
# Run the migration
alembic upgrade head

# You should see:
# INFO  [alembic.runtime.migration] Running upgrade  -> abc123, Initial migration
```

### Step 6: Verify Tables Were Created

```bash
# List tables
docker-compose exec postgres psql -U postgres -d ai_agent_db -c "\dt"

# Describe users table
docker-compose exec postgres psql -U postgres -d ai_agent_db -c "\d users"

# Check alembic version
docker-compose exec postgres psql -U postgres -d ai_agent_db -c "SELECT * FROM alembic_version;"
```

### Step 7: Initialize with Default Data

```bash
# Create default admin user
python scripts/init_db.py

# This creates:
# - Email: admin@example.com
# - Password: Admin@123
```

## Common Alembic Commands

### Check Current Version

```bash
# Show current database version
alembic current

# Show migration history
alembic history

# Show pending migrations
alembic heads
```

### Create Migrations

```bash
# Auto-generate migration
alembic revision --autogenerate -m "Add new table"

# Create empty migration (manual)
alembic revision -m "Custom migration"
```

### Apply Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Upgrade by 1 version
alembic upgrade +1

# Upgrade to specific version
alembic upgrade abc123
```

### Rollback Migrations

```bash
# Downgrade by 1 version
alembic downgrade -1

# Downgrade to specific version
alembic downgrade abc123

# Downgrade to base (empty database)
alembic downgrade base
```

### View SQL Without Running

```bash
# Show SQL that would be executed
alembic upgrade head --sql

# Show SQL for downgrade
alembic downgrade -1 --sql
```

## Using Makefile Commands

We've added convenient commands to the Makefile:

```bash
# Run migrations
make migrate

# Create new migration
make migrate-create
# (Will prompt for migration message)

# Rollback last migration
make migrate-down
```

## Troubleshooting

### Error: "Can't locate revision identified by 'head'"

**Solution**: No migrations exist yet. Create one:
```bash
alembic revision --autogenerate -m "Initial migration"
```

### Error: "Target database is not up to date"

**Solution**: Run pending migrations:
```bash
alembic upgrade head
```

### Error: "Connection refused"

**Solution**: PostgreSQL not running:
```bash
docker-compose up -d postgres
docker-compose logs postgres
```

### Error: "Database does not exist"

**Solution**: Create the database:
```bash
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE ai_agent_db;"
```

### Error: "Table already exists"

**Solution**: Database has tables but no alembic_version. Options:

1. **Drop and recreate** (loses data):
```bash
docker-compose down -v
docker-compose up -d postgres
alembic upgrade head
```

2. **Stamp current version** (if tables match):
```bash
alembic stamp head
```

### Migration Not Detecting Changes

**Solution**: Ensure models are imported in `alembic/env.py`:
```python
# In alembic/env.py
from app.db.base_class import Base
from app.models.user import User  # Import all models
```

## Migration Best Practices

### 1. Always Review Auto-Generated Migrations

```bash
# After creating migration
cat alembic/versions/*_latest_migration*.py

# Check for:
# - Correct table/column names
# - Proper data types
# - Indexes and constraints
# - No accidental drops
```

### 2. Test Migrations

```bash
# Test upgrade
alembic upgrade head

# Test downgrade
alembic downgrade -1

# Test upgrade again
alembic upgrade head
```

### 3. Backup Before Production Migrations

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres ai_agent_db > backup.sql

# Run migration
alembic upgrade head

# If issues, restore
docker-compose exec -T postgres psql -U postgres ai_agent_db < backup.sql
```

### 4. Use Descriptive Migration Messages

```bash
# Good
alembic revision --autogenerate -m "Add conversation and message tables"

# Bad
alembic revision --autogenerate -m "Update"
```

## Docker Environment

### Run Migrations in Docker

```bash
# If API container is running
docker-compose exec api alembic upgrade head

# Or run as one-off command
docker-compose run --rm api alembic upgrade head
```

### Initialize Database in Docker

```bash
docker-compose exec api python scripts/init_db.py
```

## Complete Setup Script

Here's a complete script to set up everything:

```bash
#!/bin/bash

echo "🚀 Setting up AI Agent Platform Database..."

# 1. Start PostgreSQL
echo "📦 Starting PostgreSQL..."
docker-compose up -d postgres
sleep 5

# 2. Create migration
echo "📝 Creating migration..."
alembic revision --autogenerate -m "Initial migration"

# 3. Apply migration
echo "⬆️  Applying migration..."
alembic upgrade head

# 4. Initialize database
echo "🔧 Initializing database..."
python scripts/init_db.py

echo "✅ Database setup complete!"
echo ""
echo "Default admin user:"
echo "  Email: admin@example.com"
echo "  Password: Admin@123"
```

Save as `scripts/setup_db.sh` and run:
```bash
chmod +x scripts/setup_db.sh
./scripts/setup_db.sh
```

## Verification

### Check Everything is Working

```bash
# 1. Check tables exist
docker-compose exec postgres psql -U postgres -d ai_agent_db -c "\dt"

# 2. Check users table
docker-compose exec postgres psql -U postgres -d ai_agent_db -c "SELECT email, role FROM users;"

# 3. Check migration version
alembic current

# 4. Test API connection
curl http://localhost:8000/health
```

## Summary

**Quick Migration**:
```bash
# 1. Start database
docker-compose up -d postgres

# 2. Create and apply migration
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# 3. Initialize data
python scripts/init_db.py

# 4. Verify
alembic current
```

**Common Commands**:
- `alembic upgrade head` - Apply all pending migrations
- `alembic downgrade -1` - Rollback last migration
- `alembic current` - Show current version
- `alembic history` - Show all migrations

---

**Status**: ✅ Ready to migrate!  
**Next**: Run the commands above to set up your database! 🎉
