# AI Agent Architecture - Simplified

## Overview

Simple agent that uses tools to answer questions. User asks → Agent thinks → Uses tools → Returns answer.

## Simple Flow

```mermaid
graph LR
    A[User: "What is SBKPA?"] --> B[Agent]
    B --> C{Which Tool?}
    C -->|Company Info| D[KB Search]
    C -->|Web Info| E[Web Search]
    C -->|API Data| F[API Call]
    D --> G[Combine Results]
    E --> G
    F --> G
    G --> H[Answer User]
```

## How It Works

```mermaid
stateDiagram-v2
    [*] --> ReceiveQuery
    
    ReceiveQuery --> ClassifyIntent: User Query
    
    ClassifyIntent --> LoadContext: Intent Identified
    note right of ClassifyIntent
        Uses LLM to classify:
        - general_query
        - kb_search
        - web_search
        - api_query
        - multi_tool
    end note
    
    LoadContext --> SelectTools: Context Loaded
    note right of LoadContext
        - Load conversation history
        - Load user preferences
        - Load relevant metadata
    end note
    
    SelectTools --> ExecuteTools: Tools Selected
    note right of SelectTools
        Based on intent:
        - KB Search
        - Web Search
        - API Search
        - Multiple tools
    end note
    
    ExecuteTools --> AggregateResults: Tools Executed
    note right of ExecuteTools
        Parallel execution:
        - Each tool runs independently
        - Results collected
        - Errors handled
    end note
    
    AggregateResults --> SynthesizeResponse: Results Aggregated
    note right of AggregateResults
        - Combine results
        - Remove duplicates
        - Rank by relevance
    end note
    
    SynthesizeResponse --> SaveToHistory: Response Generated
    note right of SynthesizeResponse
        LLM generates final response:
        - Uses tool results
        - Maintains context
        - Cites sources
    end note
    
    SaveToHistory --> [*]: Complete
```

## Tool System Architecture

```mermaid
classDiagram
    class BaseTool {
        <<abstract>>
        +name: str
        +description: str
        +parameters: dict
        +execute(query: str, **kwargs) ToolResult
        +to_langchain_tool() LangChainTool
        +validate_input(input: dict) bool
    }
    
    class ToolResult {
        +success: bool
        +data: Any
        +error: Optional[str]
        +metadata: dict
        +to_dict() dict
    }
    
    class KBSearchTool {
        +name: "kb_search"
        +description: "Search knowledge base"
        +kb_service: KnowledgeBaseService
        +execute(query, user_id, limit) ToolResult
    }
    
    class WebSearchTool {
        +name: "web_search"
        +description: "Search the web"
        +search_client: SearchClient
        +execute(query, num_results) ToolResult
    }
    
    class APISearchTool {
        +name: "api_search"
        +description: "Query external APIs"
        +api_config: dict
        +execute(endpoint, params) ToolResult
    }
    
    class ToolRegistry {
        -tools: Dict[str, BaseTool]
        +register_tool(tool: BaseTool) void
        +get_tool(name: str) BaseTool
        +get_all_tools() List[BaseTool]
        +get_tools_by_category(category: str) List[BaseTool]
    }
    
    BaseTool <|-- KBSearchTool
    BaseTool <|-- WebSearchTool
    BaseTool <|-- APISearchTool
    BaseTool --> ToolResult
    ToolRegistry --> BaseTool
```

## Agent Orchestration Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant AgentService
    participant Router
    participant LangGraph
    participant ToolRegistry
    participant Tools
    participant LLM
    
    User->>API: POST /agent/query
    API->>AgentService: process_query(query, user_id)
    
    AgentService->>Router: route_request(query)
    Router->>LLM: classify_intent(query)
    LLM-->>Router: intent: "kb_search"
    
    Router->>Router: load_context(user_id)
    Router->>Router: select_tools(intent)
    
    Router->>LangGraph: execute_workflow(query, tools, context)
    
    LangGraph->>ToolRegistry: get_tools(["kb_search"])
    ToolRegistry-->>LangGraph: [KBSearchTool]
    
    par Parallel Tool Execution
        LangGraph->>Tools: kb_search.execute(query)
        Tools-->>LangGraph: ToolResult(data=[...])
    end
    
    LangGraph->>LangGraph: aggregate_results(results)
    
    LangGraph->>LLM: synthesize_response(query, results, context)
    LLM-->>LangGraph: final_response
    
    LangGraph-->>AgentService: AgentResponse
    AgentService->>AgentService: save_to_history()
    AgentService-->>API: response
    API-->>User: JSON response
```

## LangGraph State Machine

```mermaid
graph LR
    Start([Start]) --> Input[Input State]
    
    Input --> Intent[Intent Classification]
    Intent --> Context[Context Loading]
    Context --> ToolSelection[Tool Selection]
    
    ToolSelection --> ToolExecution[Tool Execution]
    
    ToolExecution --> KBSearch{KB Search?}
    ToolExecution --> WebSearch{Web Search?}
    ToolExecution --> APISearch{API Search?}
    
    KBSearch -->|Yes| KBResult[KB Results]
    WebSearch -->|Yes| WebResult[Web Results]
    APISearch -->|Yes| APIResult[API Results]
    
    KBResult --> Aggregate[Aggregate Results]
    WebResult --> Aggregate
    APIResult --> Aggregate
    
    Aggregate --> Synthesis[Response Synthesis]
    Synthesis --> Output[Output State]
    Output --> End([End])
    
    style Start fill:#90EE90
    style End fill:#FFB6C1
    style ToolExecution fill:#FFE4B5
    style Synthesis fill:#E0BBE4
```

## Tool Execution Pipeline

```mermaid
flowchart TD
    A[Tool Execution Request] --> B{Validate Input}
    B -->|Invalid| C[Return Error]
    B -->|Valid| D[Execute Tool]
    
    D --> E{Tool Type}
    
    E -->|KB Search| F[Query Qdrant]
    E -->|Web Search| G[Call Search API]
    E -->|API Search| H[Call Custom API]
    
    F --> I[Process Results]
    G --> I
    H --> I
    
    I --> J{Success?}
    J -->|Yes| K[Format Results]
    J -->|No| L[Handle Error]
    
    K --> M[Return ToolResult]
    L --> M
    
    M --> N[Log Execution]
    N --> O[Update Metrics]
    O --> P[End]
    
    style D fill:#FFE4B5
    style I fill:#E0BBE4
    style M fill:#90EE90
```

## Multi-Tool Coordination

```mermaid
graph TB
    Query[User Query: "What's the latest on AI and our company policy?"]
    
    Query --> Classifier[Intent Classifier]
    Classifier --> MultiTool[Multi-Tool Intent]
    
    MultiTool --> Parallel[Parallel Execution]
    
    Parallel --> KB[KB Search Tool]
    Parallel --> Web[Web Search Tool]
    
    KB --> KBResult["Company AI Policy<br/>(from KB)"]
    Web --> WebResult["Latest AI News<br/>(from Web)"]
    
    KBResult --> Aggregator[Result Aggregator]
    WebResult --> Aggregator
    
    Aggregator --> Ranker[Relevance Ranker]
    Ranker --> Deduplicator[Deduplicator]
    Deduplicator --> Synthesizer[Response Synthesizer]
    
    Synthesizer --> Response["Combined Response:<br/>1. Company policy: ...<br/>2. Latest news: ..."]
    
    style Query fill:#E1F5FF
    style Parallel fill:#FFF4E1
    style Response fill:#E8F5E9
```

## Error Handling & Retry Logic

```mermaid
stateDiagram-v2
    [*] --> ExecuteTool
    
    ExecuteTool --> CheckResult: Tool Executed
    
    CheckResult --> Success: Result OK
    CheckResult --> Retry: Transient Error
    CheckResult --> Fallback: Permanent Error
    
    Retry --> RetryCount: Increment Counter
    RetryCount --> MaxRetries: Check Count
    
    MaxRetries --> ExecuteTool: Count < 3
    MaxRetries --> Fallback: Count >= 3
    
    Fallback --> AlternativeTool: Try Alternative
    AlternativeTool --> CheckResult
    
    Fallback --> GracefulDegradation: No Alternative
    GracefulDegradation --> PartialResponse: Generate Partial
    
    Success --> [*]
    PartialResponse --> [*]
```

## Context Management

```mermaid
graph LR
    A[Agent State] --> B[Conversation History]
    A --> C[User Preferences]
    A --> D[Tool Results]
    A --> E[Metadata]
    
    B --> F[Context Window]
    C --> F
    D --> F
    E --> F
    
    F --> G[Summarization]
    G --> H[Compressed Context]
    
    H --> I[LLM Input]
    
    style A fill:#E1F5FF
    style F fill:#FFF4E1
    style H fill:#E8F5E9
```

## Refined Task Breakdown

### Task 10.1: Base Tool Interface
**Purpose**: Create abstract foundation for all tools

**Implementation**:
```python
# app/services/tools/base.py
- BaseTool (ABC)
  - Properties: name, description, parameters_schema
  - Methods: execute(), validate_input(), to_langchain_tool()
  
- ToolResult (dataclass)
  - Fields: success, data, error, metadata, execution_time
  - Methods: to_dict(), is_successful()
  
- ToolError (Exception)
  - Custom exception for tool failures
```

**Requirements**: 3.4 (Tool interface standardization)

---

### Task 10.2: Web Search Tool
**Purpose**: Enable agent to search the internet

**Implementation**:
```python
# app/services/tools/web_search.py
- WebSearchTool(BaseTool)
  - Integration: Tavily API or Serper API
  - Methods: 
    - execute(query, num_results=5)
    - _parse_results()
    - _rank_by_relevance()
  
- Configuration:
  - API key from environment
  - Configurable result count
  - Domain filtering
```

**Requirements**: 3.1 (Web search capability)

---

### Task 10.3: API Search Tool
**Purpose**: Query external APIs dynamically

**Implementation**:
```python
# app/services/tools/api_search.py
- APISearchTool(BaseTool)
  - Support: REST APIs with JSON
  - Methods:
    - execute(endpoint, method, params, headers)
    - _authenticate()
    - _parse_response()
  
- Features:
  - Multiple auth methods (Bearer, API Key, OAuth)
  - Request/response transformation
  - Rate limiting
```

**Requirements**: 3.2 (External API integration)

---

### Task 10.4: KB Search Tool
**Purpose**: Search internal knowledge base

**Implementation**:
```python
# app/services/tools/kb_search.py
- KBSearchTool(BaseTool)
  - Integration: KnowledgeBaseService
  - Methods:
    - execute(query, user_id, limit=5, threshold=0.5)
    - _format_results()
    - _add_citations()
  
- Features:
  - Semantic search via Qdrant
  - User-scoped results
  - Document citations
```

**Requirements**: 3.3 (KB search integration)

---

### Task 10.5: Tool Registry
**Purpose**: Centralized tool management

**Implementation**:
```python
# app/services/tools/tool_registry.py
- ToolRegistry (Singleton)
  - Methods:
    - register_tool(tool)
    - get_tool(name)
    - get_all_tools()
    - get_tools_by_category()
    - get_tools_for_intent(intent)
  
- Features:
  - Auto-discovery of tools
  - Tool validation
  - Dependency injection
```

**Requirements**: 3.4, 3.5 (Tool management and discovery)

---

## Integration Points

### 1. Agent Service Integration
```python
# app/services/agent/agent_service.py
- Uses ToolRegistry to get available tools
- Passes tools to LangGraph workflow
- Handles tool execution results
```

### 2. LangGraph Integration
```python
# app/services/agent/langgraph_workflow.py
- Defines state machine
- Orchestrates tool execution
- Manages context and history
```

### 3. Router Integration
```python
# app/services/agent/routing/tool_selector.py
- Maps intents to tools
- Selects appropriate tools based on query
```

## Observability

### Metrics to Track
- Tool execution time
- Tool success/failure rate
- Tool usage frequency
- Result quality scores
- Error rates by tool

### Logging
- Tool invocations
- Input/output data
- Errors and retries
- Performance metrics

### Tracing (Langfuse)
- End-to-end request tracing
- Tool execution spans
- LLM call tracking
- Context propagation

## Testing Strategy

### Unit Tests
- Each tool in isolation
- ToolResult validation
- Error handling
- Input validation

### Integration Tests
- Tool registry operations
- LangGraph workflow
- Multi-tool coordination
- Error recovery

### End-to-End Tests
- Complete agent queries
- Real API calls (with mocking)
- Performance benchmarks
- Load testing

## Next Steps

1. Implement BaseTool and ToolResult
2. Create KBSearchTool (uses existing KB service)
3. Implement WebSearchTool (integrate Tavily/Serper)
4. Create APISearchTool (generic REST client)
5. Build ToolRegistry
6. Integrate with LangGraph workflow
7. Add comprehensive testing
8. Implement observability
