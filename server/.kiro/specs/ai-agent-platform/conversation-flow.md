# Conversation Flow & Smart Routing Architecture

## Overview

This document describes the enhanced conversation management and smart agent routing system that
avoids conditional logic through design patterns.

## Conversation Lifecycle

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Sends Query                          │
│              (with optional conversation_id)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           ConversationService.get_or_create()                │
│                                                              │
│  conversation_id provided?                                   │
│    YES → Fetch existing conversation                         │
│    NO  → Create new conversation                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Add User Message to Conversation                     │
│  (role: "user", content: query, conversation_id)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Process Through Router Chain                    │
│                  (see below for details)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│       Add Assistant Message to Conversation                  │
│  (role: "assistant", content: response, metadata)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Return Response with conversation_id                 │
└─────────────────────────────────────────────────────────────┘
```

### Conversation Retrieval with Details

When fetching a conversation, the system returns:

```json
{
  "id": "uuid",
  "title": "Conversation Title",
  "created_at": "2025-10-29T10:00:00Z",
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What is machine learning?",
      "created_at": "2025-10-29T10:00:00Z",
      "feedback": null
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Machine learning is...",
      "created_at": "2025-10-29T10:00:05Z",
      "metadata": {
        "tokens_used": 150,
        "tools_called": ["kb_search"],
        "model": "gpt-4-turbo"
      },
      "feedback": {
        "id": "uuid",
        "rating": 5,
        "comment": "Very helpful!",
        "created_at": "2025-10-29T10:01:00Z"
      }
    }
  ]
}
```

## Smart Agent Router (Chain of Responsibility)

### Architecture

The router uses the **Chain of Responsibility** pattern to process requests through a series of
handlers without conditional logic.

```
┌──────────────────────────────────────────────────────────────┐
│                      AgentContext                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ user_id: str                                           │  │
│  │ conversation_id: str                                   │  │
│  │ query: str                                             │  │
│  │ intent: Optional[str]                                  │  │
│  │ conversation_history: List[Message]                    │  │
│  │ selected_tools: List[BaseTool]                         │  │
│  │ tool_results: Dict[str, Any]                           │  │
│  │ response: Optional[str]                                │  │
│  │ metadata: Dict[str, Any]                               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Handler 1: Intent Classifier                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Analyzes user query using LLM                        │  │
│  │ • Classifies intent (general, kb_search, web_search)   │  │
│  │ • Adds intent to context                               │  │
│  │ • NO if/else branching                                 │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Handler 2: Context Enricher                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Loads conversation history from DB                   │  │
│  │ • Adds user profile information                        │  │
│  │ • Enriches context with metadata                       │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Handler 3: Tool Selector                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Uses Strategy Pattern to map intent → tools         │  │
│  │ • Selects appropriate tools based on intent            │  │
│  │ • Adds tools to context                                │  │
│  │ • NO conditional logic                                 │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Handler 4: Agent Executor                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Executes LangGraph workflow                          │  │
│  │ • Uses selected tools from context                     │  │
│  │ • Generates response                                   │  │
│  │ • Adds response to context                             │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Handler 5: Response Formatter                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Formats final response                               │  │
│  │ • Adds metadata (tokens, tools called, etc.)           │  │
│  │ • Returns enriched context                             │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
                  Final Response
```

### Handler Implementation Pattern

Each handler follows this pattern:

```python
class IntentClassifierHandler(BaseHandler):
    async def process(self, context: AgentContext) -> AgentContext:
        # Do specific processing
        intent = await self._classify_intent(context.query)
        context.intent = intent

        # Return context (next handler will be called automatically)
        return context

    async def _classify_intent(self, query: str) -> str:
        # Use LLM to classify intent
        prompt = f"Classify the intent of this query: {query}"
        response = await openai_client.chat_completion(prompt)
        return response.intent
```

### Tool Selection Strategy Pattern

Instead of if/else, we use a strategy mapping:

```python
class ToolSelectorHandler(BaseHandler):
    def __init__(self):
        super().__init__()
        # Strategy mapping: intent → tool selection strategy
        self.strategies = {
            "general_query": self._select_general_tools,
            "kb_search": self._select_kb_tools,
            "web_search": self._select_web_tools,
            "api_query": self._select_api_tools,
        }

    async def process(self, context: AgentContext) -> AgentContext:
        # Get strategy based on intent (no if/else!)
        strategy = self.strategies.get(
            context.intent,
            self._select_default_tools
        )

        # Execute strategy
        tools = await strategy(context)
        context.selected_tools = tools

        return context

    async def _select_kb_tools(self, context: AgentContext) -> List[BaseTool]:
        return [KBSearchTool()]

    async def _select_web_tools(self, context: AgentContext) -> List[BaseTool]:
        return [WebSearchTool()]

    async def _select_general_tools(self, context: AgentContext) -> List[BaseTool]:
        return [KBSearchTool(), WebSearchTool()]
```

## Benefits of This Architecture

### 1. No Conditional Logic

- No if/else chains for routing
- Intent classification handled by LLM
- Tool selection uses strategy pattern
- Easy to understand and maintain

### 2. Easy to Extend

- Add new handler: Create class extending BaseHandler
- Add new intent: Add strategy to mapping
- Add new tool: Implement BaseTool interface
- No need to modify existing code

### 3. Clean Separation of Concerns

- Each handler has single responsibility
- Context carries all state
- Handlers are independent and testable
- Clear data flow

### 4. Testability

- Mock individual handlers
- Test chain composition
- Test strategies independently
- No complex conditional paths

### 5. Conversation Management

- Automatic conversation creation
- Clean message persistence
- Rich retrieval with feedback
- No manual state management

## Example Usage

```python
# In AgentService
class AgentService:
    def __init__(self):
        # Build the handler chain once
        self.router_chain = AgentRouterBuilder.build_default_chain()
        self.conversation_service = ConversationService()

    async def process_query(
        self,
        user_id: str,
        query: str,
        conversation_id: Optional[str] = None
    ) -> AgentResponse:
        # 1. Get or create conversation (no conditionals!)
        conversation = await self.conversation_service.get_or_create_conversation(
            user_id, conversation_id
        )

        # 2. Add user message
        await self.conversation_service.add_message(
            conversation.id, "user", query
        )

        # 3. Create context
        context = AgentContext(
            user_id=user_id,
            conversation_id=conversation.id,
            query=query
        )

        # 4. Process through chain (magic happens here!)
        result_context = await self.router_chain.handle(context)

        # 5. Add assistant message
        await self.conversation_service.add_message(
            conversation.id,
            "assistant",
            result_context.response,
            metadata=result_context.metadata
        )

        # 6. Return response
        return AgentResponse(
            conversation_id=conversation.id,
            response=result_context.response,
            metadata=result_context.metadata
        )
```

## API Endpoint Example

```python
@router.post("/agent/query", response_model=AgentResponse)
async def query_agent(
    request: AgentQueryRequest,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
) -> AgentResponse:
    """
    Process user query through AI agent.

    - If conversation_id is provided, continues existing conversation
    - If conversation_id is None, creates new conversation
    - Returns response with conversation_id for future queries
    """
    return await agent_service.process_query(
        user_id=current_user.id,
        query=request.query,
        conversation_id=request.conversation_id  # Optional!
    )

@router.get("/agent/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
) -> ConversationWithDetails:
    """
    Retrieve conversation with all messages and their feedback.

    Returns:
    - Conversation metadata
    - All messages (ordered by created_at)
    - Feedback for each message (if exists)
    """
    return await conversation_service.get_conversation_with_details(
        conversation_id
    )
```

## Summary

This architecture provides:

✅ **Clean conversation management** - Auto-create, persist, retrieve with details  
✅ **Smart routing without conditionals** - Chain of Responsibility pattern  
✅ **Easy to understand** - Clear data flow through handlers  
✅ **Easy to extend** - Add handlers, intents, tools without modifying existing code  
✅ **Highly testable** - Mock handlers, test strategies independently  
✅ **Production-ready** - Scalable, maintainable, follows best practices
