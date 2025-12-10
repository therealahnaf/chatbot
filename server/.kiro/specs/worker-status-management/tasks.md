# Implementation Plan

- [x] 1. Set up database models and migrations

  - Create Worker and WorkerStatusHistory SQLAlchemy models in `app/models/worker.py`
  - Implement proper relationships between Worker and WorkerStatusHistory
  - Create Alembic migration script to add workers and worker_status_history tables with indexes
  - Add encryption key configuration to `app/core/config.py`
  - _Requirements: 1.1, 1.3, 1.4, 7.2, 7.4, 8.1, 8.2, 8.3, 8.5_

- [x] 2. Implement encryption service

  - Create `app/services/worker/encryption_service.py` with Fernet encryption
  - Implement encrypt() and decrypt() methods for passport numbers
  - Add error handling for encryption/decryption failures
  - _Requirements: 7.2_

- [x] 3. Create Pydantic schemas for workers

  - Create `app/schemas/worker.py` with WorkerBase, WorkerCreate, WorkerUpdate schemas
  - Implement WorkerResponse and WorkerDetailResponse schemas
  - Create WorkerSearchResponse schema with pagination metadata
  - Create WorkerStatusHistoryResponse schema for history entries
  - Add validation rules for worker_id pattern, email format, and field lengths
  - _Requirements: 1.1, 1.2, 2.2, 3.2, 4.5, 6.4, 7.3_

- [x] 4. Implement worker repository

  - Create `app/repositories/worker_repository.py` extending BaseRepository
  - Implement get_by_worker_id() method for business key lookup
  - Implement list_workers() method with pagination (skip, limit)
  - Add search functionality that searches across worker_name, email, and worker_id fields
    (case-insensitive, partial match)
  - Add status filter for exact status matching
  - Add sort_by and sort_order parameters for flexible sorting
  - Implement check_worker_id_exists() and check_email_exists() validation methods
  - Return tuple of (results, total_count) for pagination metadata
  - _Requirements: 1.1, 2.1, 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 7.4_

- [ ] 5. Implement worker status history repository

  - Create `app/repositories/worker_status_history_repository.py` extending BaseRepository
  - Implement create_history_entry() method for recording status changes
  - Implement get_worker_history() method with pagination and descending order
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 6. Implement worker service with business logic

  - Create `app/services/worker/worker_service.py` with WorkerService class
  - Implement create_worker() with validation and encryption
  - Implement get_worker() and get_worker_by_uuid() methods
  - Implement update_worker() with status change detection and history creation
  - Implement delete_worker() method
  - Implement list_workers() method with pagination, search, filter, and sort support
  - Implement get_worker_history() method
  - Add proper error handling with custom exceptions
  - Add authorization checks (admin only for worker management)
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4,
    4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.5, 8.1, 8.2, 8.3_

- [ ] 7. Create API endpoints for worker management

  - Create `app/api/v1/workers.py` with FastAPI router
  - Implement POST /api/v1/workers endpoint for creating workers (admin only)
  - Implement GET /api/v1/workers/{worker_id} endpoint for retrieving by business ID (admin only)
  - Implement GET /api/v1/workers/uuid/{id} endpoint for retrieving by UUID (admin only)
  - Implement PUT /api/v1/workers/{worker_id} endpoint for updates (admin only)
  - Implement DELETE /api/v1/workers/{worker_id} endpoint for deletion (admin only)
  - Implement GET /api/v1/workers endpoint with query parameters: skip, limit, search, status,
    sort_by, sort_order (admin only)
  - Use PaginatedResponse[WorkerResponse] for list endpoint response
  - Add require_admin() dependency to all endpoints
  - Add proper error responses (404, 409, 422, 403)
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4,
    4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 7.1_

- [ ] 8. Create history API endpoint

  - Add GET /api/v1/workers/{worker_id}/history endpoint (admin only)
  - Add pagination support (skip, limit) to history endpoint
  - Return results in PaginatedResponse[WorkerStatusHistoryResponse]
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.4_

- [ ] 9. Register worker routes in main application

  - Import workers router in `app/api/v1/__init__.py`
  - Register workers router with /api/v1 prefix in `app/main.py`
  - Verify all endpoints are accessible
  - _Requirements: All API requirements_

- [ ] 10. Update environment configuration

  - Add WORKER_ENCRYPTION_KEY to `.env.example` with instructions
  - Generate and add encryption key to `.env` file
  - Document encryption key generation process
  - _Requirements: 7.2_

- [ ] 11. Run database migration

  - Generate Alembic migration: `alembic revision --autogenerate -m "add worker tables"`
  - Review generated migration script
  - Apply migration: `alembic upgrade head`
  - Verify tables and indexes created successfully
  - _Requirements: 1.3, 7.4, 8.5_

- [ ]\* 12. Create unit tests for repositories

  - Write tests for WorkerRepository CRUD operations
  - Write tests for list_workers with pagination, search, filter, and sort
  - Write tests for worker_id and email uniqueness checks
  - Write tests for WorkerStatusHistoryRepository
  - Test history entry creation and retrieval
  - _Requirements: All repository requirements_

- [ ]\* 13. Create unit tests for services

  - Write tests for WorkerService create_worker with valid/invalid data
  - Write tests for update_worker with status changes triggering history
  - Write tests for list_workers with multiple filter, search, and sort combinations
  - Write tests for EncryptionService encrypt/decrypt operations
  - Test error handling and custom exceptions
  - Test authorization checks
  - _Requirements: All service requirements_

- [ ]\* 14. Create integration tests for API endpoints

  - Write tests for full CRUD flow through API
  - Test POST /api/v1/workers with valid and invalid data
  - Test GET /api/v1/workers with pagination, search, filter, and sort parameters
  - Test GET endpoints with existing and non-existing workers
  - Test PUT endpoint with status changes
  - Test DELETE endpoint
  - Test history endpoint with pagination
  - Test admin authorization requirements on all endpoints
  - Test error responses (404, 409, 422, 403)
  - _Requirements: All API requirements_

- [ ]\* 15. Add API documentation
  - Add comprehensive docstrings to all API endpoints
  - Include request/response examples in endpoint descriptions
  - Document query parameters and their formats
  - Add OpenAPI tags for worker endpoints
  - _Requirements: 6.4_
