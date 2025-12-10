# Worker Status Management System - Design Document

## Overview

The Worker Status Management System provides comprehensive tracking of workers' employment and legal
status information (visa status, work permits, etc.). The system follows the existing application
architecture using FastAPI, SQLAlchemy with async PostgreSQL, and Pydantic schemas. It includes full
CRUD operations, search capabilities, status history tracking, and a structured API interface for
future AI agent integration.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (FastAPI)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  /api/v1/workers - Worker CRUD endpoints               │ │
│  │  /api/v1/workers/search - Search & filter endpoints    │ │
│  │  /api/v1/workers/{id}/history - Status history         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WorkerService - Business logic & validation           │ │
│  │  - Create/update/delete workers                        │ │
│  │  - Search and filtering                                │ │
│  │  - Status history management                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WorkerRepository - Data access for workers            │ │
│  │  WorkerStatusHistoryRepository - Status history data   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                                   │ │
│  │  - workers table                                       │ │
│  │  - worker_status_history table                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **API Framework**: FastAPI with async/await
- **Database**: PostgreSQL with SQLAlchemy 2.0 (async)
- **Validation**: Pydantic v2
- **Authentication**: JWT tokens (existing auth middleware)
- **Encryption**: Fernet symmetric encryption for sensitive fields
- **Migration**: Alembic

## Data Models

### Worker Model

```python
class Worker(BaseModel):
    """
    Main worker entity storing current status and personal information.
    Inherits id, created_at, updated_at from BaseModel.
    """
    __tablename__ = "workers"

    # Unique identifier for the worker (business key)
    worker_id: str (unique, indexed, max 50 chars)

    # Personal information
    worker_name: str (max 255 chars, indexed for search)
    email: str (max 255 chars, indexed, validated format)
    passport_number: str (encrypted, max 255 chars)
    address: str (text field, nullable)

    # Status tracking
    plks_status: str (max 100 chars, indexed)
    notes: text (nullable, stores reason/details)

    # Relationships
    status_history: relationship to WorkerStatusHistory
```

### Worker Status History Model

```python
class WorkerStatusHistory(BaseModel):
    """
    Tracks historical status changes for audit purposes.
    Inherits id, created_at, updated_at from BaseModel.
    """
    __tablename__ = "worker_status_history"

    # Foreign key to worker
    worker_id: UUID (foreign key to workers.id, indexed)

    # Historical status information
    previous_status: str (max 100 chars)
    new_status: str (max 100 chars)
    notes: text (nullable, reason for change)
    changed_at: datetime (timestamp of change)
    changed_by: UUID (foreign key to users.id, nullable)

    # Relationships
    worker: relationship to Worker
```

### Database Indexes

```sql
-- Workers table
CREATE INDEX idx_workers_worker_id ON workers(worker_id);
CREATE INDEX idx_workers_email ON workers(email);
CREATE INDEX idx_workers_name ON workers(worker_name);
CREATE INDEX idx_workers_status ON workers(plks_status);

-- Worker status history table
CREATE INDEX idx_history_worker_id ON worker_status_history(worker_id);
CREATE INDEX idx_history_changed_at ON worker_status_history(changed_at DESC);
```

## Components and Interfaces

### 1. API Endpoints (`app/api/v1/workers.py`)

#### Worker CRUD Endpoints

```python
POST   /api/v1/workers
  - Create new worker
  - Request: WorkerCreate schema
  - Response: WorkerResponse schema
  - Auth: Required (admin only)
  - Validates: unique worker_id, email format

GET    /api/v1/workers/{worker_id}
  - Get worker by business worker_id
  - Response: WorkerResponse schema
  - Auth: Required (admin only)
  - Returns: 404 if not found

GET    /api/v1/workers/uuid/{id}
  - Get worker by UUID
  - Response: WorkerResponse schema
  - Auth: Required (admin only)
  - Returns: 404 if not found

PUT    /api/v1/workers/{worker_id}
  - Update worker information
  - Request: WorkerUpdate schema
  - Response: WorkerResponse schema
  - Auth: Required (admin only)
  - Creates history entry if status changed

DELETE /api/v1/workers/{worker_id}
  - Delete worker
  - Auth: Required (admin only)
  - Returns: 204 No Content

GET    /api/v1/workers
  - List workers with pagination, search, filter, and sort
  - Query params:
    - skip: int (default 0, min 0)
    - limit: int (default 20, min 1, max 100)
    - search: str (searches worker_name, email, worker_id - partial, case-insensitive)
    - status: str (filter by exact status match)
    - sort_by: str (field to sort by: worker_name, email, plks_status, created_at, etc.)
    - sort_order: str (asc or desc, default: asc)
  - Response: PaginatedResponse[WorkerResponse] (items + total count + skip + limit)
  - Auth: Required (admin only)
```

#### Status History Endpoints

```python
GET    /api/v1/workers/{worker_id}/history
  - Get status change history for a worker
  - Query params: skip, limit
  - Response: List[WorkerStatusHistoryResponse]
  - Auth: Required
  - Ordered by: changed_at DESC
```

### 2. Pydantic Schemas (`app/schemas/worker.py`)

```python
class WorkerBase(BaseModel):
    """Base worker schema with common fields"""
    worker_id: str = Field(max_length=50, pattern="^[A-Za-z0-9_-]+$")
    worker_name: str = Field(max_length=255, min_length=1)
    email: EmailStr
    passport_number: str = Field(max_length=50)
    address: str | None = None
    plks_status: str = Field(max_length=100)
    notes: str | None = None

class WorkerCreate(WorkerBase):
    """Schema for creating a worker"""
    pass

class WorkerUpdate(BaseModel):
    """Schema for updating a worker (all fields optional)"""
    worker_name: str | None = Field(None, max_length=255)
    email: EmailStr | None = None
    passport_number: str | None = Field(None, max_length=50)
    address: str | None = None
    plks_status: str | None = Field(None, max_length=100)
    notes: str | None = None

class WorkerResponse(WorkerBase):
    """Schema for worker response (excludes encrypted passport)"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    # passport_number excluded for security

    model_config = {"from_attributes": True}

class WorkerDetailResponse(WorkerResponse):
    """Detailed worker response including decrypted passport"""
    passport_number: str

class WorkerStatusHistoryResponse(BaseModel):
    """Schema for status history response"""
    id: UUID
    worker_id: UUID
    previous_status: str
    new_status: str
    notes: str | None
    changed_at: datetime
    changed_by: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
```

### 3. Repository Layer

#### WorkerRepository (`app/repositories/worker_repository.py`)

Extends `BaseRepository[Worker]` with additional methods:

```python
class WorkerRepository(BaseRepository[Worker]):

    async def get_by_worker_id(self, worker_id: str) -> Worker | None:
        """Get worker by business worker_id"""

    async def list_workers(
        self,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        status: str | None = None,
        sort_by: str | None = None,
        sort_order: str = "asc"
    ) -> tuple[list[Worker], int]:
        """
        List workers with pagination, search, filter, and sort.
        Search applies to worker_name, email, and worker_id fields.
        Returns (results, total_count)
        """

    async def check_worker_id_exists(self, worker_id: str) -> bool:
        """Check if worker_id already exists"""

    async def check_email_exists(self, email: str, exclude_id: UUID | None = None) -> bool:
        """Check if email already exists (optionally excluding a specific worker)"""
```

#### WorkerStatusHistoryRepository (`app/repositories/worker_status_history_repository.py`)

Extends `BaseRepository[WorkerStatusHistory]`:

```python
class WorkerStatusHistoryRepository(BaseRepository[WorkerStatusHistory]):

    async def create_history_entry(
        self,
        worker_id: UUID,
        previous_status: str,
        new_status: str,
        notes: str | None = None,
        changed_by: UUID | None = None
    ) -> WorkerStatusHistory:
        """Create a new status history entry"""

    async def get_worker_history(
        self,
        worker_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> list[WorkerStatusHistory]:
        """Get status history for a worker, ordered by changed_at DESC"""
```

### 4. Service Layer (`app/services/worker/worker_service.py`)

```python
class WorkerService:
    """Business logic for worker management"""

    def __init__(
        self,
        worker_repo: WorkerRepository,
        history_repo: WorkerStatusHistoryRepository,
        encryption_service: EncryptionService
    ):
        """Initialize with repositories and encryption service"""

    async def create_worker(
        self,
        worker_data: WorkerCreate,
        current_user_id: UUID
    ) -> Worker:
        """
        Create new worker with validation:
        - Check worker_id uniqueness
        - Validate email format
        - Encrypt passport_number
        - Create initial history entry
        """

    async def get_worker(self, worker_id: str) -> Worker:
        """Get worker by worker_id, raise 404 if not found"""

    async def get_worker_by_uuid(self, id: UUID) -> Worker:
        """Get worker by UUID, raise 404 if not found"""

    async def update_worker(
        self,
        worker_id: str,
        worker_data: WorkerUpdate,
        current_user_id: UUID
    ) -> Worker:
        """
        Update worker:
        - Validate email if changed
        - Encrypt passport if changed
        - Create history entry if status changed
        """

    async def delete_worker(self, worker_id: str) -> bool:
        """Delete worker (history entries retained)"""

    async def list_workers(
        self,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        status: str | None = None,
        sort_by: str | None = None,
        sort_order: str = "asc"
    ) -> tuple[list[Worker], int]:
        """
        List workers with pagination, search, filter, and sort.
        Search applies to worker_name, email, and worker_id fields.
        """

    async def get_worker_history(
        self,
        worker_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> list[WorkerStatusHistory]:
        """Get status change history for a worker"""

    def decrypt_passport(self, encrypted_passport: str) -> str:
        """Decrypt passport number for display"""
```

### 5. Encryption Service (`app/services/worker/encryption_service.py`)

```python
class EncryptionService:
    """Handle encryption/decryption of sensitive fields"""

    def __init__(self, encryption_key: str):
        """Initialize with Fernet encryption key from settings"""
        self.cipher = Fernet(encryption_key.encode())

    def encrypt(self, value: str) -> str:
        """Encrypt a string value"""
        return self.cipher.encrypt(value.encode()).decode()

    def decrypt(self, encrypted_value: str) -> str:
        """Decrypt an encrypted string"""
        return self.cipher.decrypt(encrypted_value.encode()).decode()
```

## Error Handling

### Custom Exceptions

```python
class WorkerNotFoundException(HTTPException):
    """Raised when worker is not found"""
    status_code = 404
    detail = "Worker not found"

class WorkerAlreadyExistsException(HTTPException):
    """Raised when worker_id already exists"""
    status_code = 409
    detail = "Worker with this ID already exists"

class InvalidWorkerDataException(HTTPException):
    """Raised when worker data validation fails"""
    status_code = 422
    detail = "Invalid worker data"
```

### Error Response Format

```json
{
  "detail": "Error message",
  "error_code": "WORKER_NOT_FOUND",
  "timestamp": "2025-11-01T12:00:00Z"
}
```

## Security Considerations

### Authentication & Authorization

- All endpoints require JWT authentication
- Use existing auth middleware from `app/api/middleware/auth.py`
- Future: Role-based access control (admin vs. read-only)

### Data Protection

- **Passport numbers**: Encrypted at rest using Fernet symmetric encryption
- **Encryption key**: Stored in environment variables, never in code
- **Key rotation**: Support for re-encrypting data with new keys
- **Audit trail**: All status changes tracked with user ID and timestamp

### Input Validation

- Email format validation using Pydantic EmailStr
- Worker ID pattern validation (alphanumeric, dash, underscore only)
- SQL injection prevention via SQLAlchemy parameterized queries
- XSS prevention via FastAPI automatic escaping

## Testing Strategy

### Unit Tests

```
tests/unit/services/worker/
  - test_worker_service.py
    - Test create_worker with valid/invalid data
    - Test update_worker with status changes
    - Test search functionality
    - Test encryption/decryption

  - test_encryption_service.py
    - Test encrypt/decrypt operations
    - Test handling of invalid encrypted data

tests/unit/repositories/
  - test_worker_repository.py
    - Test CRUD operations
    - Test search with various filters
    - Test worker_id uniqueness checks

  - test_worker_status_history_repository.py
    - Test history entry creation
    - Test history retrieval and ordering
```

### Integration Tests

```
tests/integration/api/
  - test_workers_api.py
    - Test full CRUD flow through API
    - Test search endpoints
    - Test status history endpoints
    - Test authentication requirements
    - Test error responses (404, 409, 422)
```

### Test Data

- Use factories for generating test workers
- Mock encryption service in unit tests
- Use test database for integration tests
- Clean up test data after each test

## Database Migration

### Alembic Migration Script

```python
# alembic/versions/YYYYMMDD_add_worker_tables.py

def upgrade():
    # Create workers table
    op.create_table(
        'workers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('worker_id', sa.String(50), unique=True, nullable=False),
        sa.Column('worker_name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('passport_number', sa.String(255), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('plks_status', sa.String(100), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create indexes
    op.create_index('idx_workers_worker_id', 'workers', ['worker_id'])
    op.create_index('idx_workers_email', 'workers', ['email'])
    op.create_index('idx_workers_name', 'workers', ['worker_name'])
    op.create_index('idx_workers_status', 'workers', ['plks_status'])

    # Create worker_status_history table
    op.create_table(
        'worker_status_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('worker_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('previous_status', sa.String(100), nullable=False),
        sa.Column('new_status', sa.String(100), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('changed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['worker_id'], ['workers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ondelete='SET NULL'),
    )

    # Create indexes
    op.create_index('idx_history_worker_id', 'worker_status_history', ['worker_id'])
    op.create_index('idx_history_changed_at', 'worker_status_history', ['changed_at'])

def downgrade():
    op.drop_table('worker_status_history')
    op.drop_table('workers')
```

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Worker encryption key (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
WORKER_ENCRYPTION_KEY=your-fernet-key-here
```

### Settings Update

Add to `app/core/config.py`:

```python
class Settings(BaseSettings):
    # ... existing settings ...

    # Worker management
    worker_encryption_key: str = Field(..., env="WORKER_ENCRYPTION_KEY")
```

## AI Agent Integration

### Future Query Interface

The API is designed to support AI agent queries with structured responses:

```python
# Example AI agent query patterns:

# 1. Get worker by ID
GET /api/v1/workers/W12345
Response: Complete worker details

# 2. Search by status
GET /api/v1/workers/search?status=visa_pending
Response: All workers with pending visa status

# 3. Get status history
GET /api/v1/workers/W12345/history
Response: Timeline of status changes

# 4. Search by name
GET /api/v1/workers/search?name=john
Response: All workers matching "john" (case-insensitive)
```

### Agent Tool Definition

```python
{
  "name": "get_worker_status",
  "description": "Retrieve worker status and details by worker ID",
  "parameters": {
    "worker_id": "string - The unique worker identifier"
  }
}

{
  "name": "search_workers",
  "description": "Search for workers by name, email, or status",
  "parameters": {
    "name": "string (optional) - Worker name to search",
    "email": "string (optional) - Worker email",
    "status": "string (optional) - Current status"
  }
}
```

## Performance Considerations

### Database Optimization

- Indexes on frequently queried fields (worker_id, email, name, status)
- Pagination for list endpoints (default limit: 100)
- Connection pooling via SQLAlchemy async engine
- Query optimization for search operations

### Caching Strategy

- Cache worker details by worker_id (TTL: 5 minutes)
- Invalidate cache on updates
- Use Redis for distributed caching (existing infrastructure)

### Response Times

- Target: < 500ms for single worker queries
- Target: < 1s for search queries with filters
- Target: < 1s for history queries

## Monitoring and Logging

### Metrics

- API endpoint response times
- Database query performance
- Worker creation/update rates
- Search query patterns
- Error rates by endpoint

### Logging

- Log all worker creation/updates with user ID
- Log status changes with before/after values
- Log search queries for analytics
- Log encryption/decryption errors
- Use structured logging (JSON format)

### Audit Trail

- All status changes recorded in worker_status_history
- Include user ID who made the change
- Timestamp all changes
- Retain history even after worker deletion

## Deployment Considerations

### Database Migration

1. Generate encryption key
2. Add to environment variables
3. Run Alembic migration: `alembic upgrade head`
4. Verify tables created successfully

### Rollback Plan

- Alembic downgrade script provided
- Backup database before migration
- Test migration on staging environment first

### Scaling

- Horizontal scaling via multiple API instances
- Database read replicas for search queries
- Async operations prevent blocking
- Connection pooling handles concurrent requests
