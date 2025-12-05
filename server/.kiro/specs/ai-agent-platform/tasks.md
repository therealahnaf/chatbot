# Implementation Plan

- [x] 1. Project initialization and infrastructure setup

  - Create project directory structure with all folders (app, prompts, tests, scripts, prometheus,
    grafana, alembic, etc.)
  - Create subdirectories:
    app/{api,services,models,repositories,schemas,core,db,cache,vector_store,integrations,utils}
  - Create prompts subdirectories: prompts/{agent,tools,knowledge_base,analytics,templates}
  - Set up pyproject.toml with Poetry dependencies (FastAPI, LangChain, LangGraph, SQLAlchemy,
    prometheus-client, prometheus-fastapi-instrumentator, jinja2, etc.)
  - Create .env.example with all required environment variables (including Grafana admin password)
  - Create .gitignore for Python projects
  - Create docker-compose.yml with PostgreSQL, Redis, Qdrant, Prometheus, and Grafana services
  - Create Dockerfile for the FastAPI application
  - Create prometheus/prometheus.yml configuration file
  - Create prometheus/alerts.yml with alert rules
  - Create grafana/datasources/prometheus.yml for data source provisioning
  - Create grafana/dashboards/dashboards.yml for dashboard provisioning
  - _Requirements: 1.1, 1.3, 12.1, 12.4, 13.1_

- [x] 2. Core configuration and utilities

  - [x] 2.1 Implement core configuration module
    - Create app/core/config.py with Pydantic Settings for all environment variables
    - Create app/core/constants.py with application constants (roles, limits, etc.)
    - _Requirements: 1.5, 12.4_
  - [x] 2.2 Implement security utilities
    - Create app/core/security.py with password hashing (bcrypt) and JWT token functions
    - Implement token generation, validation, and refresh logic
    - _Requirements: 5.2, 5.3_
  - [x] 2.3 Implement logging configuration
    - Create app/core/logging.py with structured JSON logging setup
    - Configure log levels and formatters
    - _Requirements: 10.1_
  - [x] 2.4 Implement custom exceptions
    - Create app/core/exceptions.py with custom exception hierarchy
    - Define AppException, AuthenticationError, ValidationError, etc.
    - _Requirements: 10.4_
  - [x] 2.5 Implement Prometheus metrics module
    - Create app/core/metrics.py with Prometheus metric definitions
    - Define counters, histograms, and gauges for application, business, and infrastructure metrics
    - Implement metric tracking decorators
    - _Requirements: 13.2, 13.3_

- [x] 3. Database setup and models

  - [x] 3.1 Set up database connection
    - Create app/db/session.py with async SQLAlchemy engine and session factory
    - Create app/db/base_class.py with declarative base
    - Implement connection pooling configuration
    - _Requirements: 9.3_
  - [x] 3.2 Create SQLAlchemy models
    - Create app/models/base.py with base model class (id, created_at, updated_at)
    - Create app/models/user.py with User model
    - Create app/models/conversation.py with Conversation model
    - Create app/models/message.py with Message model
    - Create app/models/feedback.py with Feedback model
    - Create app/models/analytics.py with AnalyticsEvent model
    - Create app/models/document.py with Document model
    - _Requirements: 5.6, 6.1, 7.4_
  - [x] 3.3 Set up Alembic migrations
    - Initialize Alembic with alembic init alembic
    - Configure alembic.ini and alembic/env.py for async SQLAlchemy
    - Create initial migration for all models
    - _Requirements: 12.5_

- [ ] 4. Pydantic schemas (DTOs)

  - [x] 4.1 Create common schemas
    - Create app/schemas/common.py with pagination, error response schemas
    - _Requirements: 1.1_
  - [x] 4.2 Create user and auth schemas
    - Create app/schemas/user.py with UserCreate, UserUpdate, UserResponse schemas
    - Create app/schemas/auth.py with LoginRequest, TokenResponse, RefreshRequest schemas
    - _Requirements: 5.1, 5.3, 8.1_
  - [x] 4.3 Create agent and conversation schemas
    - Create app/schemas/agent.py with AgentQueryRequest, AgentResponse, ToolResult schemas
    - Create app/schemas/conversation.py with ConversationCreate, ConversationResponse,
      MessageResponse, ConversationWithDetails schemas
    - _Requirements: 2.1, 8.1_
  - [x] 4.4 Create feedback and analytics schemas
    - Create app/schemas/feedback.py with FeedbackCreate, FeedbackResponse schemas
    - Create app/schemas/analytics.py with AnalyticsEvent, AnalyticsStats schemas
    - _Requirements: 6.4, 7.1, 8.1_
  - [x] 4.5 Create knowledge base schemas
    - Create app/schemas/knowledge_base.py with DocumentUpload, DocumentResponse, SearchRequest
      schemas
    - _Requirements: 4.1, 8.1_

- [x] 5. Redis cache layer

  - [x] 5.1 Implement Redis client
    - Create app/cache/redis_client.py with async Redis connection and health check
    - _Requirements: 9.1_
  - [x] 5.2 Implement cache service
    - Create app/cache/cache_service.py with get, set, delete, and TTL operations
    - Implement cache key generation utilities
    - _Requirements: 9.1, 9.2_
  - [x] 5.3 Implement rate limiter
    - Create app/cache/rate_limiter.py with sliding window rate limiting logic
    - Implement per-user and per-IP rate limiting
    - _Requirements: 8.2_

- [x] 6. Qdrant vector store integration

  - [x] 6.1 Implement Qdrant client
    - Create app/vector_store/qdrant_client.py with connection and health check
    - _Requirements: 4.4_
  - [x] 6.2 Implement vector operations
    - Create app/vector_store/vector_operations.py with upsert, search, delete operations
    - Implement batch operations for efficiency
    - _Requirements: 4.4, 4.5_

- [x] 7. External service integrations

  - [x] 7.1 Implement OpenAI client wrapper
    - Create app/integrations/openai_client.py with chat completion and embedding methods
    - Implement error handling and retry logic
    - _Requirements: 2.2, 4.3_
  - [x] 7.2 Implement Langfuse tracing
    - Create app/integrations/langfuse_client.py with tracing initialization
    - Implement trace context management
    - _Requirements: 2.5_

- [x] 8. Repository layer (data access)

  - [x] 8.1 Create base repository
    - Create app/repositories/base.py with generic CRUD operations (create, get, get_multi, update,
      delete)
    - Implement pagination and filtering support
    - _Requirements: 1.3_
  - [x] 8.2 Create specific repositories
    - Create app/repositories/user_repository.py with get_by_email method
    - Create app/repositories/conversation_repository.py with get_by_user_id and
      get_with_messages_and_feedback methods
    - Create app/repositories/message_repository.py with get_by_conversation_id method
    - Create app/repositories/feedback_repository.py with get_by_message_id method
    - Create app/repositories/analytics_repository.py with create_event and aggregate methods
    - Create app/repositories/document_repository.py with get_by_user_id method
    - _Requirements: 5.6, 6.1, 7.4_

- [x] 9. Utility modules

  - [x] 9.1 Create validation utilities
    - Create app/utils/validators.py with email, password strength, file type validators
    - _Requirements: 8.1_
  - [x] 9.2 Create sanitization utilities
    - Create app/utils/sanitizers.py with HTML escaping, prompt injection prevention
    - _Requirements: 8.3_
  - [x] 9.3 Create formatting utilities
    - Create app/utils/formatters.py with response formatting helpers
    - _Requirements: 1.1_

- [ ] 10. Tool system implementation

  - [ ] 10.1 Create base tool interface
    - Create app/services/tools/base.py with BaseTool abstract class
    - Define execute method signature and ToolResult model
    - Implement to_langchain_tool conversion method
    - _Requirements: 3.4_
  - [ ] 10.2 Implement web search tool
    - Create app/services/tools/web_search.py implementing BaseTool
    - Integrate with external search API (e.g., Tavily, Serper)
    - _Requirements: 3.1_
  - [ ] 10.3 Implement API search tool
    - Create app/services/tools/api_search.py implementing BaseTool
    - Add configurable API endpoint and authentication
    - _Requirements: 3.2_
  - [ ] 10.4 Implement KB search tool
    - Create app/services/tools/kb_search.py implementing BaseTool
    - Integrate with Qdrant for semantic search
    - _Requirements: 3.3_
  - [ ] 10.5 Create tool registry
    - Create app/services/tools/tool_registry.py with tool registration and discovery
    - Implement get_all_tools and get_tool_by_name methods
    - _Requirements: 3.4, 3.5_

- [x] 11. Knowledge base service

  - [x] 11.1 Implement document processor
    - Create app/services/knowledge_base/document_processor.py with file parsing (PDF, TXT, DOCX,
      MD)
    - Implement text chunking with overlap (500 tokens, 50 overlap)
    - _Requirements: 4.1, 4.2_
  - [x] 11.2 Implement embedding service
    - Create app/services/knowledge_base/embedding_service.py with batch embedding generation
    - Integrate with Open source embeddings model
    - _Requirements: 4.3, 9.4_
  - [x] 11.3 Implement retrieval service
    - Create app/services/knowledge_base/retrieval_service.py with semantic search
    - Implement reranking and relevance scoring
    - _Requirements: 4.5_
  - [x] 11.4 Implement KB orchestration service
    - Create app/services/knowledge_base/kb_service.py coordinating upload, processing, and search
    - Implement document deletion and update logic
    - _Requirements: 4.1, 4.6_
  - [x] 11.5 build API to build and all operation on kb

- [ ] 12. Conversation management service

  - Create app/services/conversation/conversation_service.py with conversation lifecycle management
  - Implement get_or_create_conversation method
  - Implement get_conversation_with_details method (returns conversation with messages and feedback)
  - Implement add_message method
  - Implement update_conversation_title method
  - _Requirements: 2.4_

- [ ] 13. Smart agent routing system (Chain of Responsibility)

  - [ ] 13.1 Create base handler and context
    - Create app/services/agent/routing/base_handler.py with BaseHandler abstract class
    - Create app/services/agent/routing/context.py with AgentContext dataclass
    - Implement chain linking logic (set_next, handle methods)
    - _Requirements: 2.1_
  - [ ] 13.2 Implement routing handlers
    - Create app/services/agent/routing/intent_handler.py for intent classification using LLM
    - Create app/services/agent/routing/context_handler.py for loading conversation history
    - Create app/services/agent/routing/tool_selector.py for selecting tools based on intent
    - Create app/services/agent/routing/executor_handler.py for executing LangGraph workflow
    - Create app/services/agent/routing/formatter_handler.py for formatting responses
    - _Requirements: 2.1, 2.3_
  - [ ] 13.3 Create router chain builder
    - Create app/services/agent/routing/router_builder.py with AgentRouterBuilder class
    - Implement build_default_chain method that chains all handlers
    - _Requirements: 2.1_

- [ ] 14. Prompts setup and management

  - [ ] 14.1 Create prompts folder structure
    - Create prompts/ directory with subdirectories (agent, tools, knowledge_base, analytics,
      templates)
    - Create prompts/base.py with PromptTemplate base class
    - _Requirements: 2.1_
  - [ ] 14.2 Create agent prompts
    - Create prompts/agent/system_prompt.txt with main agent system prompt
    - Create prompts/agent/intent_classification.txt for intent classification
    - Create prompts/agent/tool_selection.txt for tool selection
    - Create prompts/agent/response_synthesis.txt for response generation
    - Create prompts/agent/conversation_summary.txt for summarization
    - _Requirements: 2.1_
  - [ ] 14.3 Create tool prompts
    - Create prompts/tools/web_search_query.txt for web search query generation
    - Create prompts/tools/api_query_builder.txt for API query construction
    - Create prompts/tools/kb_search_query.txt for KB search optimization
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 14.4 Create knowledge base prompts
    - Create prompts/knowledge_base/document_chunking.txt for chunking strategy
    - Create prompts/knowledge_base/metadata_extraction.txt for metadata extraction
    - Create prompts/knowledge_base/query_expansion.txt for query expansion
    - _Requirements: 4.2_
  - [ ] 14.5 Create prompt templates and examples
    - Create prompts/templates/few_shot_examples.py with reusable examples
    - Create prompts/templates/output_formats.py with structured output formats
    - Create prompts/templates/constraints.py with common constraints
    - _Requirements: 2.1_

- [ ] 15. Agent service with LangGraph

  - [ ] 15.1 Create prompt manager
    - Create app/services/agent/prompt_manager.py with PromptManager class
    - Implement get_prompt, render_prompt, and reload_prompts methods
    - Integrate with prompts/ folder
    - _Requirements: 2.1_
  - [ ] 15.2 Create context manager
    - Create app/services/agent/context_manager.py for conversation history management
    - Implement context window truncation (last 50 messages)
    - _Requirements: 2.4_
  - [ ] 15.3 Build LangGraph workflow
    - Create app/services/agent/graph_builder.py with StateGraph definition
    - Implement nodes: analyze_query, execute_tools, synthesize_response
    - Add conditional edges for tool selection
    - Compile and return the graph
    - _Requirements: 2.1, 2.3_
  - [ ] 15.4 Implement agent orchestration service
    - Create app/services/agent/agent_service.py with process_query method
    - Integrate router chain for smart routing (no conditionals)
    - Integrate conversation service for message persistence
    - Integrate prompt manager for all LLM prompts
    - Add Langfuse tracing for all LLM calls
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [ ] 16. Authentication and user services

  - [x] 16.1 Implement token service
    - Create app/services/auth/token_service.py with create_access_token and verify_token methods
    - Implement refresh token logic
    - _Requirements: 5.3, 5.4_
  - [x] 16.2 Implement authentication service
    - Create app/services/auth/auth_service.py with login, register, and verify_password methods
    - Integrate with user repository and token service
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 16.3 Implement user service
    - Create app/services/user/user_service.py with CRUD operations for users
    - Implement role-based permission checks
    - _Requirements: 5.5, 5.6_

- [ ] 17. Analytics and feedback services

  - [ ] 17.1 Implement analytics service
    - Create app/services/analytics/analytics_service.py with log_event method
    - Implement quota tracking per user
    - _Requirements: 6.1, 6.3_
  - [ ] 17.2 Implement aggregation service
    - Create app/services/analytics/aggregation_service.py with daily, weekly, monthly aggregations
    - Implement caching for aggregated stats
    - _Requirements: 6.2, 6.5_
  - [ ] 17.3 Implement feedback service
    - Create app/services/feedback/feedback_service.py with create and retrieve feedback methods
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 18. API middleware

  - [x] 17.1 Implement authentication middleware
    - Create app/api/middleware/auth.py with JWT validation middleware
    - Extract and validate user from token
    - _Requirements: 5.4_
  - [x] 17.2 Implement rate limiting middleware
    - Create app/api/middleware/rate_limit.py with rate limit checking
    - Return 429 status when limit exceeded
    - _Requirements: 8.2_
  - [x] 17.3 Implement logging middleware
    - Create app/api/middleware/logging.py with request/response logging
    - Add correlation ID to all requests
    - _Requirements: 10.1, 10.2_
  - [x] 17.4 Implement error handler middleware
    - Create app/api/middleware/error_handler.py with global exception handling
    - Return standardized error responses
    - _Requirements: 10.3, 10.5_

- [ ] 18. API dependency injection

  - Create app/api/deps.py with dependency functions
  - Implement get_db (database session)
  - Implement get_current_user (from JWT token)
  - Implement get_current_active_user (active users only)
  - Implement get_cache_service, get_agent_service, get_conversation_service, etc.
  - Implement role-based permission dependencies (require_admin, etc.)
  - _Requirements: 5.4, 5.5_

- [ ] 19. Authentication API endpoints

  - Create app/api/v1/auth.py with authentication routes
  - Implement POST /auth/register endpoint
  - Implement POST /auth/login endpoint (returns access + refresh tokens)
  - Implement POST /auth/refresh endpoint (refresh access token)
  - Implement POST /auth/logout endpoint
  - _Requirements: 5.1, 5.3_

- [x] 20. User management API endpoints

  - Create app/api/v1/users.py with user management routes
  - Implement GET /users/me endpoint (current user profile)
  - Implement PUT /users/me endpoint (update profile)
  - Implement GET /users endpoint (admin only, list users with pagination)
  - Implement GET /users/{user_id} endpoint (admin only)
  - Implement DELETE /users/{user_id} endpoint (admin only)
  - _Requirements: 5.5, 5.6_

- [ ] 21. Agent API endpoints

  - Create app/api/v1/agent.py with agent interaction routes
  - Implement POST /agent/query endpoint (process user query, auto-create conversation if
    conversation_id not provided)
  - Implement GET /agent/conversations endpoint (list user conversations with pagination)
  - Implement GET /agent/conversations/{conversation_id} endpoint (get conversation with all
    messages and their feedback)
  - Implement DELETE /agent/conversations/{conversation_id} endpoint (delete conversation)
  - Integrate with agent service, conversation service, and analytics logging
  - _Requirements: 2.1, 2.4, 6.1_

- [x] 22. Knowledge base API endpoints

  - Create app/api/v1/knowledge_base.py with KB management routes
  - Implement POST /kb/documents endpoint (upload document with file validation)
  - Implement GET /kb/documents endpoint (list user documents with pagination)
  - Implement GET /kb/documents/{document_id} endpoint (get document metadata)
  - Implement DELETE /kb/documents/{document_id} endpoint (delete document and vectors)
  - Implement POST /kb/search endpoint (semantic search in KB)
  - _Requirements: 4.1, 4.2, 4.5, 4.6_

- [ ] 23. Feedback API endpoints

  - Create app/api/v1/feedback.py with feedback routes
  - Implement POST /feedback endpoint (submit feedback for a message)
  - Implement GET /feedback endpoint (admin only, retrieve feedback with filters)
  - Implement GET /feedback/stats endpoint (admin only, feedback statistics)
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 24. Analytics API endpoints

  - Create app/api/v1/analytics.py with analytics routes
  - Implement GET /analytics/usage endpoint (user's own usage stats)
  - Implement GET /analytics/system endpoint (admin only, system-wide stats)
  - Implement GET /analytics/users/{user_id} endpoint (admin only, specific user stats)
  - Integrate with caching for performance
  - _Requirements: 6.2, 6.4, 6.5_

- [ ] 25. Main application setup with Prometheus instrumentation

  - Create app/main.py with FastAPI application initialization
  - Register all routers (auth, users, agent, kb, feedback, analytics)
  - Add all middleware (CORS, auth, rate limiting, logging, error handling)
  - Integrate Prometheus FastAPI instrumentator
  - Expose /metrics endpoint for Prometheus scraping
  - Add startup event for database initialization
  - Add shutdown event for cleanup
  - Implement health check endpoint GET /health
  - _Requirements: 1.3, 8.4, 8.5, 12.2, 13.1, 13.2_

- [ ] 26. Database initialization script

  - Create scripts/init_db.py for database initialization
  - Create default admin user
  - Initialize Qdrant collection
  - _Requirements: 12.2_

- [ ] 27. Prometheus and Grafana setup

  - [ ] 27.1 Configure Prometheus
    - Finalize prometheus/prometheus.yml with scrape configurations
    - Configure prometheus/alerts.yml with alert rules (high error rate, slow response, service
      down, etc.)
    - Set up retention period (30 days)
    - _Requirements: 13.1, 13.7_
  - [ ] 27.2 Create Grafana dashboards
    - Create grafana/dashboards/system-overview.json (request rate, error rate, response time,
      active users)
    - Create grafana/dashboards/api-performance.json (requests by endpoint, response time by
      endpoint)
    - Create grafana/dashboards/agent-analytics.json (queries per minute, token usage, tool usage,
      success rate)
    - Create grafana/dashboards/infrastructure.json (CPU, memory, DB connections, cache hit rate)
    - _Requirements: 13.6_
  - [ ] 27.3 Configure Grafana provisioning
    - Set up grafana/datasources/prometheus.yml
    - Set up grafana/dashboards/dashboards.yml for auto-loading dashboards
    - Configure Grafana admin credentials
    - _Requirements: 13.6_

- [ ] 28. Docker and deployment configuration

  - [ ] 28.1 Finalize Dockerfile
    - Use multi-stage build for smaller image
    - Install dependencies with Poetry
    - Set up non-root user for security
    - _Requirements: 12.1_
  - [ ] 28.2 Finalize docker-compose.yml
    - Configure all service dependencies (API, PostgreSQL, Redis, Qdrant, Prometheus, Grafana)
    - Add Prometheus and Grafana services with proper volumes and networks
    - Add health checks for all services
    - Configure volumes for data persistence (including prometheus_data and grafana_data)
    - Set up networks for service isolation
    - _Requirements: 12.1, 12.2, 13.1_
  - [ ] 28.3 Create environment configuration
    - Create .env.development, .env.staging, .env.production templates
    - Add Grafana admin password to environment variables
    - Document all environment variables in README
    - _Requirements: 12.4_

- [ ] 29. Documentation

  - Create comprehensive README.md with project overview, setup instructions, and API documentation
  - Document folder structure and architecture decisions
  - Add API endpoint documentation (or configure FastAPI auto-docs)
  - Document Prometheus metrics and Grafana dashboards
  - Add monitoring and alerting guide
  - Create CONTRIBUTING.md with development guidelines
  - _Requirements: 1.1, 1.2, 13.6_

- [ ]\* 30. Testing setup and implementation

  - [ ]\* 30.1 Configure pytest
    - Create pytest.ini with test configuration
    - Create tests/conftest.py with shared fixtures (test_db, test_user, mock_openai, etc.)
    - _Requirements: 11.4_
  - [ ]\* 30.2 Write unit tests for services
    - Write tests for agent_service.py
    - Write tests for conversation_service.py
    - Write tests for kb_service.py
    - Write tests for auth_service.py
    - Write tests for user_service.py
    - _Requirements: 11.1_
  - [ ]\* 30.3 Write unit tests for repositories
    - Write tests for user_repository.py
    - Write tests for conversation_repository.py
    - Write tests for document_repository.py
    - _Requirements: 11.3_
  - [ ]\* 30.4 Write integration tests for API endpoints
    - Write tests for auth endpoints
    - Write tests for agent endpoints
    - Write tests for KB endpoints
    - Write tests for user endpoints
    - _Requirements: 11.2_

- [ ] 31. Final integration and verification
  - Run all services with docker-compose up (including Prometheus and Grafana)
  - Verify database migrations apply successfully
  - Test complete user flow: register → login → upload document → query agent (auto-creates
    conversation) → retrieve conversation with messages and feedback → provide feedback
  - Verify all health checks pass
  - Check logs for errors
  - Verify Langfuse tracing is working
  - Verify smart routing chain works without conditionals
  - Access Prometheus at http://localhost:9090 and verify metrics are being collected
  - Access Grafana at http://localhost:3000 and verify dashboards are loaded
  - Test Prometheus alerts by triggering error conditions
  - Verify metrics correlation with logs and traces
  - _Requirements: 2.1, 2.5, 4.1, 5.1, 7.1, 12.2, 13.1, 13.6, 13.7, 13.9_
