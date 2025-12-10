# Design Document

## Overview

The AI Agent Platform is a production-ready, microservices-oriented application built with FastAPI,
LangChain, and LangGraph. The system follows clean architecture principles with clear separation
between API, business logic, data access, and infrastructure layers. The design emphasizes
modularity, testability, security, and maintainability with a maximum file size constraint of 300
lines.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway (FastAPI)                 │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │  Agent   │   User   │Analytics │ Feedback │    KB    │  │
│  │   API    │   API    │   API    │   API    │   API    │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│                    │ /metrics (Prometheus)                   │
└────────────────────┼────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬─────────────────────┐
        │            │            │                     │
┌───────▼────────┐   │   ┌────────▼────────┐   ┌───────▼────────┐
│  Service Layer │   │   │  Service Layer  │   │ Service Layer  │
│  - Agent Svc   │   │   │  - User Svc     │   │ - Analytics    │
│  - Tool Svc    │   │   │  - Auth Svc     │   │ - Feedback     │
│  - KB Svc      │   │   │                 │   │ - KB Svc       │
└───────┬────────┘   │   └────────┬────────┘   └───────┬────────┘
        │            │            │                     │
┌───────▼────────┐   │   ┌────────▼────────┐   ┌───────▼────────┐
│  Repository    │   │   │  Repository     │   │  Repository    │
│  Layer         │   │   │  Layer          │   │  Layer         │
└───────┬────────┘   │   └────────┬────────┘   └───────┬────────┘
        │            │            │                     │
┌───────▼────────────┼───────────▼─────────────────────▼────────┐
│              Infrastructure Layer                              │
│  ┌──────────┬──────────┬──────────┬──────────┬─────────┐     │
│  │PostgreSQL│  Redis   │  Qdrant  │  OpenAI  │Langfuse │     │
│  └──────────┴──────────┴──────────┴──────────┴─────────┘     │
└────────────────────────────────────────────────────────────────┘
        │
        │ Metrics Collection
        ▼
┌─────────────────────────────────────────────────────────────┐
│              Observability Stack                             │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │     Prometheus       │───▶│      Grafana         │      │
│  │  (Metrics Storage)   │    │  (Visualization)     │      │
│  │  - Scrapes /metrics  │    │  - Dashboards        │      │
│  │  - Time-series DB    │    │  - Alerts            │      │
│  │  - Alert Rules       │    │  - Query Builder     │      │
│  └──────────────────────┘    └──────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **API Framework**: FastAPI (async, high-performance)
- **Agent Framework**: LangChain + LangGraph (orchestration)
- **LLM Provider**: OpenAI (GPT-4, embeddings)
- **Relational DB**: PostgreSQL (user data, analytics, feedback)
- **Vector DB**: Qdrant (knowledge base embeddings)
- **Cache/Session**: Redis (caching, rate limiting, sessions)
- **Observability**:
  - Langfuse (LLM tracing and monitoring)
  - Prometheus (metrics collection and storage)
  - Grafana (metrics visualization and dashboards)
- **Containerization**: Docker + Docker Compose
- **ORM**: SQLAlchemy (async)
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Testing**: pytest, pytest-asyncio, httpx
- **Metrics**: prometheus-client, prometheus-fastapi-instrumentator

## Project Structure

```
ai-agent-platform/
├── .env.example                    # Environment variables template
├── .gitignore
├── docker-compose.yml              # Service orchestration
├── Dockerfile                      # Application container
├── pyproject.toml                  # Poetry dependencies
├── README.md
├── alembic.ini                     # Database migrations config
├── pytest.ini                      # Test configuration
│
├── alembic/                        # Database migrations
│   ├── versions/
│   └── env.py
│
├── app/
│   ├── __init__.py
│   │
│   ├── main.py                     # FastAPI application entry point
│   │
│   ├── api/                        # API layer (routes/endpoints)
│   │   ├── __init__.py
│   │   ├── deps.py                 # Dependency injection
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py           # Main v1 router
│   │   │   ├── agent.py            # Agent endpoints
│   │   │   ├── users.py            # User management endpoints
│   │   │   ├── auth.py             # Authentication endpoints
│   │   │   ├── analytics.py        # Analytics endpoints
│   │   │   ├── feedback.py         # Feedback endpoints
│   │   │   └── knowledge_base.py   # KB management endpoints
│   │   │
│   │   └── middleware/
│   │       ├── __init__.py
│   │       ├── auth.py             # JWT authentication middleware
│   │       ├── rate_limit.py       # Rate limiting middleware
│   │       ├── logging.py          # Request logging middleware
│   │       └── error_handler.py    # Global error handling
│   │
│   ├── core/                       # Core configuration and utilities
│   │   ├── __init__.py
│   │   ├── config.py               # Pydantic settings
│   │   ├── security.py             # Password hashing, JWT utils
│   │   ├── logging.py              # Logging configuration
│   │   ├── exceptions.py           # Custom exception classes
│   │   └── constants.py            # Application constants
│   │
│   ├── models/                     # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── base.py                 # Base model class
│   │   ├── user.py                 # User model
│   │   ├── conversation.py         # Conversation model
│   │   ├── message.py              # Message model
│   │   ├── feedback.py             # Feedback model
│   │   ├── analytics.py            # Analytics event model
│   │   └── document.py             # Document metadata model
│   │
│   ├── schemas/                    # Pydantic schemas (DTOs)
│   │   ├── __init__.py
│   │   ├── user.py                 # User request/response schemas
│   │   ├── auth.py                 # Auth schemas (login, token)
│   │   ├── agent.py                # Agent request/response schemas
│   │   ├── feedback.py             # Feedback schemas
│   │   ├── analytics.py            # Analytics schemas
│   │   ├── knowledge_base.py       # KB schemas
│   │   └── common.py               # Common schemas (pagination, etc.)
│   │
│   ├── services/                   # Business logic layer
│   │   ├── __init__.py
│   │   ├── agent/
│   │   │   ├── __init__.py
│   │   │   ├── agent_service.py    # Main agent orchestration
│   │   │   ├── graph_builder.py    # LangGraph workflow builder
│   │   │   ├── prompt_manager.py   # Prompt templates
│   │   │   ├── context_manager.py  # Conversation context
│   │   │   └── routing/            # Smart routing without conditionals
│   │   │       ├── __init__.py
│   │   │       ├── base_handler.py      # Base handler interface
│   │   │       ├── context.py           # AgentContext dataclass
│   │   │       ├── router_builder.py    # Chain builder
│   │   │       ├── intent_handler.py    # Intent classification
│   │   │       ├── context_handler.py   # Context enrichment
│   │   │       ├── tool_selector.py     # Tool selection
│   │   │       ├── executor_handler.py  # Agent execution
│   │   │       └── formatter_handler.py # Response formatting
│   │   │
│   │   ├── conversation/
│   │   │   ├── __init__.py
│   │   │   └── conversation_service.py  # Conversation management
│   │   │
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py     # Authentication logic
│   │   │   └── token_service.py    # JWT token management
│   │   │
│   │   ├── user/
│   │   │   ├── __init__.py
│   │   │   └── user_service.py     # User management logic
│   │   │
│   │   ├── knowledge_base/
│   │   │   ├── __init__.py
│   │   │   ├── kb_service.py       # KB orchestration
│   │   │   ├── document_processor.py # Document parsing/chunking
│   │   │   ├── embedding_service.py  # Embedding generation
│   │   │   └── retrieval_service.py  # Semantic search
│   │   │
│   │   ├── analytics/
│   │   │   ├── __init__.py
│   │   │   ├── analytics_service.py # Analytics collection
│   │   │   └── aggregation_service.py # Metrics aggregation
│   │   │
│   │   ├── feedback/
│   │   │   ├── __init__.py
│   │   │   └── feedback_service.py  # Feedback management
│   │   │
│   │   └── tools/
│   │       ├── __init__.py
│   │       ├── base.py              # Base tool interface
│   │       ├── web_search.py        # Web search tool
│   │       ├── api_search.py        # API search tool
│   │       ├── kb_search.py         # KB search tool
│   │       └── tool_registry.py     # Tool registration/discovery
│   │
│   ├── repositories/               # Data access layer
│   │   ├── __init__.py
│   │   ├── base.py                 # Base repository with CRUD
│   │   ├── user_repository.py      # User data access
│   │   ├── conversation_repository.py
│   │   ├── message_repository.py
│   │   ├── feedback_repository.py
│   │   ├── analytics_repository.py
│   │   └── document_repository.py
│   │
│   ├── db/                         # Database configuration
│   │   ├── __init__.py
│   │   ├── session.py              # Database session management
│   │   ├── init_db.py              # Database initialization
│   │   └── base_class.py           # Base SQLAlchemy class
│   │
│   ├── cache/                      # Redis cache layer
│   │   ├── __init__.py
│   │   ├── redis_client.py         # Redis connection
│   │   ├── cache_service.py        # Cache operations
│   │   └── rate_limiter.py         # Rate limiting logic
│   │
│   ├── vector_store/               # Qdrant integration
│   │   ├── __init__.py
│   │   ├── qdrant_client.py        # Qdrant connection
│   │   └── vector_operations.py    # Vector CRUD operations
│   │
│   ├── integrations/               # External service integrations
│   │   ├── __init__.py
│   │   ├── openai_client.py        # OpenAI API wrapper
│   │   ├── langfuse_client.py      # Langfuse tracing
│   │   └── external_apis.py        # Other API integrations
│   │
│   └── utils/                      # Utility functions
│       ├── __init__.py
│       ├── validators.py           # Input validation helpers
│       ├── sanitizers.py           # Input sanitization
│       ├── formatters.py           # Response formatting
│       └── helpers.py              # General helpers
│
├── tests/                          # Test suite
│   ├── __init__.py
│   ├── conftest.py                 # Pytest fixtures
│   ├── unit/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── utils/
│   ├── integration/
│   │   ├── api/
│   │   └── db/
│   └── fixtures/
│       ├── user_fixtures.py
│       └── data_fixtures.py
│
└── scripts/                        # Utility scripts
    ├── init_db.py                  # Database initialization
    ├── seed_data.py                # Seed test data
    └── run_migrations.py           # Migration runner
```

## Components and Interfaces

### 1. API Layer (FastAPI Routes)

**Purpose**: Handle HTTP requests, validate inputs, call services, return responses

**Key Files**:

- `app/api/v1/agent.py`: Agent interaction endpoints
- `app/api/v1/users.py`: User CRUD endpoints
- `app/api/v1/auth.py`: Login, register, token refresh
- `app/api/deps.py`: Dependency injection (DB session, current user, etc.)

**Interface Pattern**:

```python
@router.post("/query", response_model=AgentResponse)
async def query_agent(
    request: AgentQueryRequest,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
) -> AgentResponse:
    """Process user query through AI agent"""
    pass
```

### 2. Service Layer (Business Logic)

**Purpose**: Implement business rules, orchestrate operations, coordinate between repositories

**Key Components**:

**AgentService** (`app/services/agent/agent_service.py`):

- Orchestrates LangGraph workflow
- Manages conversation context
- Integrates with Langfuse for tracing
- Coordinates tool execution

**KnowledgeBaseService** (`app/services/knowledge_base/kb_service.py`):

- Document upload and processing
- Chunking strategy implementation
- Embedding generation coordination
- Semantic search orchestration

**AuthService** (`app/services/auth/auth_service.py`):

- User authentication
- Password verification
- Token generation and validation
- Role-based access control

**Interface Pattern**:

```python
class AgentService:
    async def process_query(
        self,
        user_id: str,
        query: str,
        conversation_id: Optional[str] = None
    ) -> AgentResponse:
        """Process user query through LangGraph workflow"""
        pass
```

### 3. Repository Layer (Data Access)

**Purpose**: Abstract database operations, provide clean data access interface

**Base Repository** (`app/repositories/base.py`):

- Generic CRUD operations
- Pagination support
- Filtering and sorting

**Specific Repositories**:

- UserRepository: User data operations
- ConversationRepository: Conversation management
- MessageRepository: Message storage/retrieval
- FeedbackRepository: Feedback CRUD
- AnalyticsRepository: Event logging and aggregation

**Interface Pattern**:

```python
class BaseRepository(Generic[ModelType]):
    async def create(self, obj_in: dict) -> ModelType:
        pass

    async def get(self, id: Any) -> Optional[ModelType]:
        pass

    async def get_multi(
        self, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        pass

    async def update(self, id: Any, obj_in: dict) -> ModelType:
        pass

    async def delete(self, id: Any) -> bool:
        pass
```

### 4. Tool System

**Purpose**: Provide extensible tool framework for agent capabilities

**Base Tool Interface** (`app/services/tools/base.py`):

```python
class BaseTool(ABC):
    name: str
    description: str

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        pass

    def to_langchain_tool(self) -> LangChainTool:
        pass
```

**Concrete Tools**:

- **WebSearchTool**: Search web using external API (e.g., Serper, Tavily)
- **APISearchTool**: Query external APIs with authentication
- **KBSearchTool**: Semantic search in knowledge base

**Tool Registry** (`app/services/tools/tool_registry.py`):

- Register and discover tools
- Provide tools to LangGraph
- Handle tool execution errors

### 5. LangGraph Workflow

**Purpose**: Define agent reasoning and tool-calling workflow

**Graph Builder** (`app/services/agent/graph_builder.py`):

```python
def build_agent_graph() -> CompiledGraph:
    """
    Build LangGraph workflow:
    1. Receive user query
    2. Analyze query and select tools
    3. Execute tools in parallel if needed
    4. Synthesize response
    5. Return to user
    """
    workflow = StateGraph(AgentState)

    workflow.add_node("analyze", analyze_query)
    workflow.add_node("tool_execution", execute_tools)
    workflow.add_node("synthesize", synthesize_response)

    workflow.add_edge(START, "analyze")
    workflow.add_conditional_edges("analyze", should_use_tools)
    workflow.add_edge("tool_execution", "synthesize")
    workflow.add_edge("synthesize", END)

    return workflow.compile()
```

### 6. Conversation Management System

**Purpose**: Manage conversation lifecycle and message history with clean retrieval

**Conversation Flow**:

```
User Query → Check conversation_id
              ↓
         No conversation_id?
              ↓
         Create new Conversation
              ↓
         Add Message (role: user)
              ↓
         Process through Agent
              ↓
         Add Message (role: assistant)
              ↓
         Return response with conversation_id
```

**Conversation Service** (`app/services/conversation/conversation_service.py`):

```python
class ConversationService:
    async def get_or_create_conversation(
        self, user_id: str, conversation_id: Optional[str] = None
    ) -> Conversation:
        """Get existing or create new conversation"""
        if conversation_id:
            return await self.conversation_repo.get(conversation_id)
        return await self.conversation_repo.create({
            "user_id": user_id,
            "title": "New Conversation"
        })

    async def get_conversation_with_details(
        self, conversation_id: str
    ) -> ConversationWithDetails:
        """
        Retrieve conversation with:
        - All messages (ordered by created_at)
        - Feedback for each message (if exists)
        """
        conversation = await self.conversation_repo.get_with_messages_and_feedback(
            conversation_id
        )
        return conversation

    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: dict = None
    ) -> Message:
        """Add message to conversation"""
        return await self.message_repo.create({
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "metadata": metadata
        })
```

### 7. Smart Agent Router (Chain of Responsibility Pattern)

**Purpose**: Route agent requests through handlers without conditional logic

**Router Architecture**:

```
Request → RouterChain
           ↓
      [Handler 1: Intent Classifier]
           ↓
      [Handler 2: Context Enricher]
           ↓
      [Handler 3: Tool Selector]
           ↓
      [Handler 4: Agent Executor]
           ↓
      [Handler 5: Response Formatter]
           ↓
      Response
```

**Base Handler** (`app/services/agent/routing/base_handler.py`):

```python
class BaseHandler(ABC):
    def __init__(self):
        self._next_handler: Optional[BaseHandler] = None

    def set_next(self, handler: BaseHandler) -> BaseHandler:
        self._next_handler = handler
        return handler

    async def handle(self, context: AgentContext) -> AgentContext:
        """Process and pass to next handler"""
        context = await self.process(context)

        if self._next_handler:
            return await self._next_handler.handle(context)

        return context

    @abstractmethod
    async def process(self, context: AgentContext) -> AgentContext:
        """Implement specific processing logic"""
        pass
```

**Concrete Handlers**:

1. **Intent Classifier Handler** (`app/services/agent/routing/intent_handler.py`):
   - Uses LLM to classify user intent (general_query, kb_search, web_search, etc.)
   - Adds intent to context without if/else branching

2. **Context Enricher Handler** (`app/services/agent/routing/context_handler.py`):
   - Loads conversation history
   - Adds user profile information
   - Enriches context with relevant metadata

3. **Tool Selector Handler** (`app/services/agent/routing/tool_selector.py`):
   - Based on intent, selects appropriate tools
   - Uses strategy pattern to map intents to tool sets

4. **Agent Executor Handler** (`app/services/agent/routing/executor_handler.py`):
   - Executes LangGraph workflow with selected tools
   - Handles tool execution and response generation

5. **Response Formatter Handler** (`app/services/agent/routing/formatter_handler.py`):
   - Formats final response
   - Adds metadata (tokens used, tools called, etc.)

**Router Chain Builder** (`app/services/agent/routing/router_builder.py`):

```python
class AgentRouterBuilder:
    @staticmethod
    def build_default_chain() -> BaseHandler:
        """Build the default handler chain"""
        intent_handler = IntentClassifierHandler()
        context_handler = ContextEnricherHandler()
        tool_selector = ToolSelectorHandler()
        executor = AgentExecutorHandler()
        formatter = ResponseFormatterHandler()

        # Chain handlers
        intent_handler.set_next(context_handler) \
                     .set_next(tool_selector) \
                     .set_next(executor) \
                     .set_next(formatter)

        return intent_handler
```

**Agent Context** (`app/services/agent/routing/context.py`):

```python
@dataclass
class AgentContext:
    """Shared context passed through handler chain"""
    user_id: str
    conversation_id: str
    query: str

    # Enriched by handlers
    intent: Optional[str] = None
    conversation_history: List[Message] = field(default_factory=list)
    selected_tools: List[BaseTool] = field(default_factory=list)
    tool_results: Dict[str, Any] = field(default_factory=dict)
    response: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
```

**Usage in Agent Service**:

```python
class AgentService:
    def __init__(self):
        self.router_chain = AgentRouterBuilder.build_default_chain()

    async def process_query(
        self,
        user_id: str,
        query: str,
        conversation_id: Optional[str] = None
    ) -> AgentResponse:
        # Get or create conversation
        conversation = await self.conversation_service.get_or_create_conversation(
            user_id, conversation_id
        )

        # Add user message
        await self.conversation_service.add_message(
            conversation.id, "user", query
        )

        # Create context
        context = AgentContext(
            user_id=user_id,
            conversation_id=conversation.id,
            query=query
        )

        # Process through chain (no conditionals!)
        result_context = await self.router_chain.handle(context)

        # Add assistant message
        await self.conversation_service.add_message(
            conversation.id,
            "assistant",
            result_context.response,
            metadata=result_context.metadata
        )

        return AgentResponse(
            conversation_id=conversation.id,
            response=result_context.response,
            metadata=result_context.metadata
        )
```

## Data Models

### PostgreSQL Schema

**Users Table**:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Conversations Table**:

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
```

**Messages Table**:

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

**Feedback Table**:

```sql
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_feedback_message_id ON feedback(message_id);
```

**Conversation Retrieval Query** (with messages and feedback):

```sql
-- Efficient query to get conversation with all related data
SELECT
    c.id as conversation_id,
    c.title,
    c.created_at as conversation_created_at,
    m.id as message_id,
    m.role,
    m.content,
    m.metadata,
    m.created_at as message_created_at,
    f.id as feedback_id,
    f.rating,
    f.comment,
    f.created_at as feedback_created_at
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
LEFT JOIN feedback f ON f.message_id = m.id
WHERE c.id = $1
ORDER BY m.created_at ASC;
```

**Analytics Events Table**:

```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_analytics_events_type_created ON analytics_events(event_type, created_at);
```

**Documents Table**:

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    chunk_count INTEGER DEFAULT 0,
    qdrant_collection VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Qdrant Collections

**Knowledge Base Collection**:

```python
{
    "collection_name": "knowledge_base",
    "vectors": {
        "size": 1536,  # OpenAI ada-002 embedding size
        "distance": "Cosine"
    },
    "payload_schema": {
        "document_id": "uuid",
        "chunk_index": "integer",
        "text": "text",
        "metadata": "json"
    }
}
```

### Redis Data Structures

**Session Cache**: `session:{user_id}` → User session data (TTL: 24h) **Rate Limiting**:
`rate_limit:{user_id}:{endpoint}` → Request count (TTL: 1h) **Query Cache**: `query_cache:{hash}` →
Cached agent response (TTL: 1h) **User Profile Cache**: `user:{user_id}` → User profile (TTL: 6h)

## Error Handling

### Exception Hierarchy

```python
class AppException(Exception):
    """Base application exception"""
    pass

class AuthenticationError(AppException):
    """Authentication failed"""
    pass

class AuthorizationError(AppException):
    """Insufficient permissions"""
    pass

class ValidationError(AppException):
    """Input validation failed"""
    pass

class ResourceNotFoundError(AppException):
    """Requested resource not found"""
    pass

class ExternalServiceError(AppException):
    """External service (OpenAI, Qdrant) error"""
    pass

class RateLimitError(AppException):
    """Rate limit exceeded"""
    pass
```

### Error Response Format

```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid credentials",
    "details": {},
    "request_id": "uuid"
  }
}
```

### Global Error Handler

```python
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=get_status_code(exc),
        content={
            "error": {
                "code": exc.__class__.__name__,
                "message": str(exc),
                "request_id": request.state.request_id
            }
        }
    )
```

## Security Implementation

### 1. Authentication & Authorization

- **JWT Tokens**: Access tokens (15 min expiry) + Refresh tokens (7 days)
- **Password Hashing**: bcrypt with 12 rounds
- **RBAC**: Role-based permissions checked at endpoint level

### 2. Input Validation & Sanitization

- **Pydantic Models**: Strict type validation on all inputs
- **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries
- **XSS Prevention**: HTML escaping on user-generated content
- **Prompt Injection**: Input sanitization before LLM calls

### 3. Rate Limiting

- **Per-User Limits**: 100 requests/hour for standard users
- **Per-IP Limits**: 1000 requests/hour
- **Endpoint-Specific**: Agent queries limited to 20/hour

### 4. Secrets Management

- **Environment Variables**: All secrets in .env (never committed)
- **Docker Secrets**: Production uses Docker secrets
- **Key Rotation**: Support for rotating API keys without downtime

## Testing Strategy

### Unit Tests

- **Services**: Mock repositories, test business logic
- **Repositories**: Use test database, test CRUD operations
- **Tools**: Mock external APIs, test tool execution
- **Utils**: Test validation, sanitization, formatting

### Integration Tests

- **API Endpoints**: Test full request/response cycle
- **Database**: Test migrations and data integrity
- **Cache**: Test Redis operations
- **Vector Store**: Test Qdrant operations

### Test Fixtures

```python
@pytest.fixture
async def test_db():
    """Provide test database session"""
    pass

@pytest.fixture
async def test_user():
    """Create test user"""
    pass

@pytest.fixture
def mock_openai():
    """Mock OpenAI API responses"""
    pass
```

### Coverage Goals

- Overall: 80%+ coverage
- Services: 90%+ coverage
- Repositories: 85%+ coverage
- API endpoints: 80%+ coverage

## Deployment Architecture

### Docker Compose Services

```yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
      - qdrant
    environment:
      - DATABASE_URL
      - REDIS_URL
      - QDRANT_URL
      - OPENAI_API_KEY
      - LANGFUSE_PUBLIC_KEY
      - LANGFUSE_SECRET_KEY

  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB
      - POSTGRES_USER
      - POSTGRES_PASSWORD

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage
```

### Health Checks

```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "database": await check_db_health(),
            "redis": await check_redis_health(),
            "qdrant": await check_qdrant_health()
        }
    }
```

## Performance Considerations

### 1. Database Optimization

- Connection pooling (min: 5, max: 20)
- Proper indexing on frequently queried columns
- Async SQLAlchemy for non-blocking I/O

### 2. Caching Strategy

- Cache user profiles (6h TTL)
- Cache KB metadata (12h TTL)
- Cache identical queries (1h TTL)
- Invalidate cache on updates

### 3. Async Operations

- All I/O operations use async/await
- Parallel tool execution in LangGraph
- Batch embedding generation

### 4. Resource Limits

- Max file upload: 50MB
- Max query length: 2000 characters
- Max conversation history: 50 messages
- Request timeout: 30 seconds

## Observability

### Logging

- **Structured JSON logs** with correlation IDs
- **Log Levels**: DEBUG (dev), INFO (prod), ERROR (always)
- **Log Aggregation**: Stdout → Docker logs → Log aggregator

### Tracing

- **Langfuse Integration**: Trace all LLM calls
- **Request Tracing**: Track request flow through services
- **Performance Metrics**: Response times, token usage

### Monitoring

- **Health Endpoints**: Service availability checks
- **Metrics**: Request rate, error rate, latency (p50, p95, p99)
- **Alerts**: Error rate > 5%, latency > 2s, service down

## Configuration Management

### Environment Variables

```bash
# Application
APP_NAME=ai-agent-platform
APP_ENV=development
DEBUG=true
LOG_LEVEL=INFO

# API
API_HOST=0.0.0.0
API_PORT=8000
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379/0

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=knowledge_base

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Langfuse
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Security
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Rate Limiting
RATE_LIMIT_PER_USER=100
RATE_LIMIT_PER_IP=1000
AGENT_QUERY_LIMIT=20
```

### Pydantic Settings

```python
class Settings(BaseSettings):
    app_name: str
    app_env: str
    debug: bool = False

    database_url: str
    redis_url: str
    qdrant_url: str

    openai_api_key: str
    openai_model: str = "gpt-4-turbo-preview"

    secret_key: str
    jwt_algorithm: str = "HS256"

    class Config:
        env_file = ".env"
        case_sensitive = False
```

## Prometheus Metrics Integration

### Metrics Architecture

The platform exposes Prometheus-compatible metrics through the `/metrics` endpoint and collects
comprehensive application, business, and infrastructure metrics.

### Metrics Categories

#### 1. Application Metrics

**HTTP Request Metrics**:

```python
# Request rate
http_requests_total{method="POST", endpoint="/agent/query", status="200"}

# Request duration
http_request_duration_seconds{method="POST", endpoint="/agent/query"}

# Request size
http_request_size_bytes{method="POST", endpoint="/agent/query"}

# Response size
http_response_size_bytes{method="POST", endpoint="/agent/query"}

# Active requests
http_requests_in_progress{method="POST", endpoint="/agent/query"}
```

#### 2. Business Metrics

**Agent Metrics**:

```python
# Agent queries
agent_queries_total{user_role="user", intent="kb_search", status="success"}

# Agent response time
agent_response_duration_seconds{intent="kb_search", tools_used="kb_search,web_search"}

# Token usage
agent_tokens_used_total{model="gpt-4-turbo", type="completion"}

# Tool usage
agent_tool_calls_total{tool_name="kb_search", status="success"}

# Conversation metrics
agent_conversations_total{user_role="user"}
agent_messages_total{role="user"}
```

**Knowledge Base Metrics**:

```python
# Document operations
kb_documents_uploaded_total{file_type="pdf", status="success"}
kb_documents_total{user_id="*"}
kb_chunks_total

# Search operations
kb_searches_total{status="success"}
kb_search_duration_seconds
kb_search_results_count
```

**User Metrics**:

```python
# User operations
users_registered_total
users_active_total
users_logged_in_total

# Authentication
auth_attempts_total{status="success"}
auth_token_refreshes_total
```

#### 3. Infrastructure Metrics

**Database Metrics**:

```python
# Connection pool
db_connections_active
db_connections_idle
db_connections_total

# Query performance
db_query_duration_seconds{operation="select"}
db_queries_total{operation="select", status="success"}
```

**Cache Metrics**:

```python
# Redis operations
cache_hits_total
cache_misses_total
cache_hit_rate

# Cache operations
cache_operations_total{operation="get", status="success"}
cache_operation_duration_seconds{operation="get"}
```

**Vector Store Metrics**:

```python
# Qdrant operations
vector_store_operations_total{operation="search", status="success"}
vector_store_operation_duration_seconds{operation="search"}
vector_store_vectors_total
```

### Metrics Implementation

**Metrics Module** (`app/core/metrics.py`):

```python
from prometheus_client import Counter, Histogram, Gauge, Info
from functools import wraps
import time

# HTTP Metrics (auto-instrumented by prometheus-fastapi-instrumentator)

# Agent Metrics
agent_queries_total = Counter(
    'agent_queries_total',
    'Total number of agent queries',
    ['user_role', 'intent', 'status']
)

agent_response_duration = Histogram(
    'agent_response_duration_seconds',
    'Agent response time in seconds',
    ['intent', 'tools_used']
)

agent_tokens_used = Counter(
    'agent_tokens_used_total',
    'Total tokens used by agent',
    ['model', 'type']
)

# Decorator for tracking metrics
def track_agent_query(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        status = "success"

        try:
            result = await func(*args, **kwargs)
            return result
        except Exception as e:
            status = "error"
            raise
        finally:
            duration = time.time() - start_time
            agent_response_duration.labels(
                intent=kwargs.get('intent', 'unknown'),
                tools_used=','.join(kwargs.get('tools', []))
            ).observe(duration)

            agent_queries_total.labels(
                user_role=kwargs.get('user_role', 'user'),
                intent=kwargs.get('intent', 'unknown'),
                status=status
            ).inc()

    return wrapper
```

**FastAPI Integration** (`app/main.py`):

```python
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import make_asgi_app

app = FastAPI()

# Instrument FastAPI with Prometheus
instrumentator = Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/metrics", "/health"],
    env_var_name="ENABLE_METRICS",
    inprogress_name="http_requests_in_progress",
    inprogress_labels=True,
)

instrumentator.instrument(app).expose(app, endpoint="/metrics")

# Or mount metrics app separately
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
```

## Grafana Dashboards

### Dashboard Structure

The platform provides 4 pre-configured Grafana dashboards:

#### 1. System Overview Dashboard

**Panels**:

- Request Rate (requests/sec)
- Error Rate (%)
- Response Time (p50, p95, p99)
- Active Users
- System Health Status
- Service Uptime

**Queries**:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response time percentiles
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active users
users_active_total
```

#### 2. API Performance Dashboard

**Panels**:

- Requests by Endpoint
- Response Time by Endpoint
- Error Rate by Endpoint
- Request Size Distribution
- Response Size Distribution
- Slow Queries (>2s)

**Queries**:

```promql
# Requests by endpoint
sum by (endpoint) (rate(http_requests_total[5m]))

# Response time by endpoint
histogram_quantile(0.95,
  sum by (endpoint, le) (rate(http_request_duration_seconds_bucket[5m]))
)

# Slow queries
http_request_duration_seconds > 2
```

#### 3. Agent Analytics Dashboard

**Panels**:

- Agent Queries per Minute
- Average Response Time
- Token Usage (by model)
- Tool Usage Distribution
- Intent Classification Distribution
- Conversation Count
- Messages per Conversation
- Success Rate

**Queries**:

```promql
# Queries per minute
rate(agent_queries_total[1m]) * 60

# Token usage by model
sum by (model) (rate(agent_tokens_used_total[5m]))

# Tool usage
sum by (tool_name) (rate(agent_tool_calls_total[5m]))

# Success rate
sum(rate(agent_queries_total{status="success"}[5m])) /
sum(rate(agent_queries_total[5m]))
```

#### 4. Infrastructure Monitoring Dashboard

**Panels**:

- CPU Usage
- Memory Usage
- Database Connections
- Cache Hit Rate
- Vector Store Operations
- Disk I/O
- Network Traffic

**Queries**:

```promql
# Database connections
db_connections_active

# Cache hit rate
cache_hits_total / (cache_hits_total + cache_misses_total)

# Vector store operations
rate(vector_store_operations_total[5m])
```

### Alert Rules

**Prometheus Alert Rules** (`prometheus/alerts.yml`):

```yaml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) / 
          rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow API response time"
          description: "95th percentile response time is {{ $value }}s"

      - alert: ServiceDown
        expr: up{job="ai-agent-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} is down"

  - name: agent_alerts
    interval: 30s
    rules:
      - alert: HighAgentFailureRate
        expr: |
          rate(agent_queries_total{status="error"}[5m]) / 
          rate(agent_queries_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High agent failure rate"
          description: "Agent failure rate is {{ $value | humanizePercentage }}"

      - alert: HighTokenUsage
        expr: |
          rate(agent_tokens_used_total[1h]) > 1000000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High token usage detected"
          description: "Token usage is {{ $value }} tokens/hour"

  - name: infrastructure_alerts
    interval: 30s
    rules:
      - alert: HighDatabaseConnections
        expr: db_connections_active > 18
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Active connections: {{ $value }}"

      - alert: LowCacheHitRate
        expr: |
          cache_hits_total / 
          (cache_hits_total + cache_misses_total) < 0.7
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
```

### Grafana Configuration

**Dashboard Provisioning** (`grafana/dashboards/dashboards.yml`):

```yaml
apiVersion: 1

providers:
  - name: "AI Agent Platform"
    orgId: 1
    folder: ""
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

**Data Source Configuration** (`grafana/datasources/prometheus.yml`):

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

### Docker Compose Integration

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--storage.tsdb.retention.time=30d"
      - "--web.console.libraries=/usr/share/prometheus/console_libraries"
      - "--web.console.templates=/usr/share/prometheus/consoles"
    ports:
      - "9090:9090"
    networks:
      - ai-agent-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    volumes:
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=http://localhost:3000
    ports:
      - "3000:3000"
    networks:
      - ai-agent-network
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

**Prometheus Configuration** (`prometheus/prometheus.yml`):

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: "ai-agent-platform"
    environment: "production"

# Load alert rules
rule_files:
  - "alerts.yml"

# Scrape configurations
scrape_configs:
  - job_name: "ai-agent-api"
    static_configs:
      - targets: ["api:8000"]
    metrics_path: "/metrics"
    scrape_interval: 10s

  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "postgres"
    static_configs:
      - targets: ["postgres-exporter:9187"]

  - job_name: "redis"
    static_configs:
      - targets: ["redis-exporter:9121"]
```

## Observability Stack Integration

### Unified Observability

The platform integrates three pillars of observability:

1. **Logs** (Structured JSON logging)
   - Application logs
   - Error logs
   - Audit logs

2. **Traces** (Langfuse)
   - LLM call tracing
   - Request tracing
   - Distributed tracing

3. **Metrics** (Prometheus + Grafana)
   - Application metrics
   - Business metrics
   - Infrastructure metrics

### Correlation

All three systems use correlation IDs to link logs, traces, and metrics:

```python
# In middleware
request_id = str(uuid.uuid4())
request.state.request_id = request_id

# In logging
logger.info("Processing request", extra={
    "request_id": request_id,
    "user_id": user_id
})

# In Langfuse
trace = langfuse.trace(
    id=request_id,
    user_id=user_id
)

# In Prometheus labels
agent_queries_total.labels(
    request_id=request_id[:8]  # Short version for cardinality
).inc()
```

## Prompts Management

### Prompts Folder Structure

All LLM prompts are centralized in a dedicated `prompts/` directory for easy management, version
control, and testing.

```
prompts/
├── __init__.py
├── base.py                      # Base prompt template class
│
├── agent/                       # Agent-related prompts
│   ├── __init__.py
│   ├── system_prompt.txt        # Main agent system prompt
│   ├── intent_classification.txt # Intent classification prompt
│   ├── tool_selection.txt       # Tool selection prompt
│   ├── response_synthesis.txt   # Response generation prompt
│   └── conversation_summary.txt # Conversation summarization
│
├── tools/                       # Tool-specific prompts
│   ├── __init__.py
│   ├── web_search_query.txt     # Web search query generation
│   ├── api_query_builder.txt    # API query construction
│   └── kb_search_query.txt      # KB search query optimization
│
├── knowledge_base/              # KB-related prompts
│   ├── __init__.py
│   ├── document_chunking.txt    # Chunking strategy prompt
│   ├── metadata_extraction.txt  # Extract metadata from docs
│   └── query_expansion.txt      # Expand user queries
│
├── analytics/                   # Analytics prompts
│   ├── __init__.py
│   ├── feedback_analysis.txt    # Analyze user feedback
│   └── usage_insights.txt       # Generate usage insights
│
└── templates/                   # Reusable prompt templates
    ├── __init__.py
    ├── few_shot_examples.py     # Few-shot learning examples
    ├── output_formats.py        # Structured output formats
    └── constraints.py           # Common constraints/rules
```

### Prompt Template System

**Base Prompt Class** (`prompts/base.py`):

```python
from typing import Dict, Any, Optional
from pathlib import Path
from jinja2 import Template

class PromptTemplate:
    """Base class for prompt templates"""

    def __init__(self, template_path: str):
        self.template_path = Path(template_path)
        self.template_content = self._load_template()
        self.template = Template(self.template_content)

    def _load_template(self) -> str:
        """Load prompt template from file"""
        with open(self.template_path, 'r', encoding='utf-8') as f:
            return f.read()

    def render(self, **kwargs) -> str:
        """Render template with variables"""
        return self.template.render(**kwargs)

    def validate_variables(self, **kwargs) -> bool:
        """Validate required variables are provided"""
        required_vars = self._extract_required_variables()
        return all(var in kwargs for var in required_vars)

    def _extract_required_variables(self) -> list:
        """Extract required variables from template"""
        # Parse Jinja2 template for required variables
        pass
```

### Example Prompts

**Agent System Prompt** (`prompts/agent/system_prompt.txt`):

```
You are an intelligent AI assistant with access to various tools and a knowledge base.

Your capabilities:
- Answer questions using your knowledge
- Search the web for current information
- Query external APIs for specific data
- Search the knowledge base for organizational information

Guidelines:
1. Be helpful, accurate, and concise
2. Use tools when necessary to provide accurate information
3. Cite sources when using external information
4. Admit when you don't know something
5. Maintain conversation context across multiple turns

Current conversation context:
{{ conversation_history }}

Available tools:
{{ available_tools }}

User query: {{ user_query }}
```

**Intent Classification Prompt** (`prompts/agent/intent_classification.txt`):

```
Classify the user's intent from the following query.

Query: "{{ user_query }}"

Available intents:
- general_query: General questions that can be answered with your knowledge
- kb_search: Questions about organizational/domain-specific information
- web_search: Questions requiring current/real-time information
- api_query: Questions requiring data from external APIs
- conversation_management: Managing conversation (summarize, clear, etc.)

Respond with ONLY the intent name, nothing else.

Intent:
```

**Tool Selection Prompt** (`prompts/agent/tool_selection.txt`):

```
Based on the user's query and classified intent, select the appropriate tools.

Query: "{{ user_query }}"
Intent: {{ intent }}

Available tools:
{% for tool in available_tools %}
- {{ tool.name }}: {{ tool.description }}
{% endfor %}

Select one or more tools that would be most helpful. Consider:
1. Relevance to the query
2. Likelihood of finding accurate information
3. Efficiency (prefer fewer tools if possible)

Respond with a JSON array of tool names:
["tool1", "tool2"]

Selected tools:
```

**Response Synthesis Prompt** (`prompts/agent/response_synthesis.txt`):

```
Synthesize a comprehensive response based on the user's query and tool results.

User Query: "{{ user_query }}"

Tool Results:
{% for tool_name, result in tool_results.items() %}
{{ tool_name }}:
{{ result }}
---
{% endfor %}

Conversation History:
{{ conversation_history }}

Instructions:
1. Provide a clear, accurate answer to the user's query
2. Integrate information from multiple tool results if available
3. Cite sources when using external information
4. Maintain a conversational tone
5. If information is incomplete, acknowledge limitations

Response:
```

**KB Search Query Optimization** (`prompts/tools/kb_search_query.txt`):

```
Optimize the user's query for semantic search in the knowledge base.

Original Query: "{{ user_query }}"

Context: {{ conversation_context }}

Generate an optimized search query that:
1. Expands abbreviations and acronyms
2. Adds relevant synonyms
3. Removes unnecessary words
4. Focuses on key concepts
5. Maintains the original intent

Optimized Query:
```

### Prompt Manager Integration

**Prompt Manager** (`app/services/agent/prompt_manager.py`):

```python
from pathlib import Path
from typing import Dict, Any
from prompts.base import PromptTemplate

class PromptManager:
    """Manages all prompts for the agent system"""

    def __init__(self, prompts_dir: str = "prompts"):
        self.prompts_dir = Path(prompts_dir)
        self._prompts_cache: Dict[str, PromptTemplate] = {}

    def get_prompt(self, prompt_name: str) -> PromptTemplate:
        """Get a prompt template by name"""
        if prompt_name not in self._prompts_cache:
            prompt_path = self._resolve_prompt_path(prompt_name)
            self._prompts_cache[prompt_name] = PromptTemplate(prompt_path)
        return self._prompts_cache[prompt_name]

    def render_prompt(self, prompt_name: str, **kwargs) -> str:
        """Render a prompt with variables"""
        prompt = self.get_prompt(prompt_name)
        return prompt.render(**kwargs)

    def _resolve_prompt_path(self, prompt_name: str) -> Path:
        """Resolve prompt name to file path"""
        # Convert "agent.system_prompt" to "prompts/agent/system_prompt.txt"
        parts = prompt_name.split('.')
        return self.prompts_dir / '/'.join(parts[:-1]) / f"{parts[-1]}.txt"

    def reload_prompts(self):
        """Reload all prompts (useful for development)"""
        self._prompts_cache.clear()

# Usage in agent service
prompt_manager = PromptManager()

# Render system prompt
system_prompt = prompt_manager.render_prompt(
    "agent.system_prompt",
    conversation_history=history,
    available_tools=tools,
    user_query=query
)

# Render intent classification prompt
intent_prompt = prompt_manager.render_prompt(
    "agent.intent_classification",
    user_query=query
)
```

### Prompt Versioning

**Version Control Strategy**:

```
prompts/
├── agent/
│   ├── system_prompt.txt          # Current version
│   ├── system_prompt.v1.txt       # Version 1 (archived)
│   └── system_prompt.v2.txt       # Version 2 (archived)
```

**Prompt Metadata** (`prompts/agent/system_prompt.meta.json`):

```json
{
  "version": "3.0",
  "created_at": "2025-10-01",
  "updated_at": "2025-10-29",
  "author": "AI Team",
  "description": "Main agent system prompt with tool integration",
  "variables": ["conversation_history", "available_tools", "user_query"],
  "changelog": [
    {
      "version": "3.0",
      "date": "2025-10-29",
      "changes": "Added conversation context handling"
    },
    {
      "version": "2.0",
      "date": "2025-10-15",
      "changes": "Improved tool selection guidance"
    }
  ]
}
```

### Prompt Testing

**Test Prompts** (`tests/unit/prompts/test_prompts.py`):

```python
import pytest
from prompts.base import PromptTemplate
from app.services.agent.prompt_manager import PromptManager

def test_system_prompt_rendering():
    """Test system prompt renders correctly"""
    pm = PromptManager()

    rendered = pm.render_prompt(
        "agent.system_prompt",
        conversation_history="User: Hello\nAssistant: Hi!",
        available_tools=["web_search", "kb_search"],
        user_query="What is AI?"
    )

    assert "What is AI?" in rendered
    assert "web_search" in rendered
    assert "conversation_history" not in rendered  # Template var should be replaced

def test_intent_classification_prompt():
    """Test intent classification prompt"""
    pm = PromptManager()

    rendered = pm.render_prompt(
        "agent.intent_classification",
        user_query="What's the weather today?"
    )

    assert "What's the weather today?" in rendered
    assert "web_search" in rendered  # Should list available intents

def test_prompt_variable_validation():
    """Test prompt validates required variables"""
    template = PromptTemplate("prompts/agent/system_prompt.txt")

    # Should fail without required variables
    with pytest.raises(Exception):
        template.render(user_query="test")  # Missing other required vars
```

### Prompt Optimization Best Practices

1. **Clarity**: Use clear, unambiguous language
2. **Structure**: Organize prompts with clear sections
3. **Examples**: Include few-shot examples when needed
4. **Constraints**: Specify output format and constraints
5. **Context**: Provide relevant context without overwhelming
6. **Versioning**: Track changes and maintain history
7. **Testing**: Test prompts with various inputs
8. **Iteration**: Continuously improve based on results

### Benefits of Centralized Prompts

✅ **Version Control**: Track prompt changes over time  
✅ **Reusability**: Share prompts across services  
✅ **Testing**: Easier to test and validate prompts  
✅ **Collaboration**: Team can review and improve prompts  
✅ **Maintenance**: Update prompts without code changes  
✅ **A/B Testing**: Easy to test different prompt versions  
✅ **Documentation**: Self-documenting with metadata  
✅ **Localization**: Support multiple languages
