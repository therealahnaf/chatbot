"""
LangGraph Agent System with Standard Tool Calling Pattern
Uses @tool decorator and automatic tool calling via LLM
"""
from typing import Annotated, Optional, Sequence, TypedDict
from uuid import UUID

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.core.config import settings

langfuse = None
CallbackHandler = None

if settings.LANGFUSE_ENABLED:
    try:
        from langfuse import Langfuse
        from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler

        langfuse = Langfuse()
        CallbackHandler = LangfuseCallbackHandler

        # Optional and safe skip if version mismatch happens
        try:
            if hasattr(langfuse, "auth_check") and callable(langfuse.auth_check):
                if langfuse.auth_check():
                    print("Langfuse client is authenticated and ready!")
                else:
                    print("Authentication failed. Please check your credentials and host.")
            else:
                print("Langfuse client version does not support auth_check, skipping.")
        except Exception as e:
            print(f"{e}")
            print("Continuing without auth verification - tracing will still work.")

    except ImportError as e:
        print(f"Langfuse not available: {e}")
        langfuse = None
        CallbackHandler = None
else:
    print("Langfuse telemetry disabled via LANGFUSE_ENABLED=false")

import structlog

# Import tool factory functions
from .tools import (
    create_kb_tools,
)

logger = structlog.get_logger()


# ============================================================================
# STATE DEFINITION
# ============================================================================

class AgentState(TypedDict):
    """State for the agent workflow."""
    messages: Annotated[Sequence[BaseMessage], add_messages]


# ============================================================================
# AGENT NODE
# ============================================================================

def should_continue(state: AgentState):
    """Determine whether to continue or end the workflow."""
    messages = state["messages"]
    last_message = messages[-1]
    
    # If there are no tool calls, we're done
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return "end"
    return "continue"


async def call_model(state: AgentState, llm_with_tools):
    """Call the LLM with tools."""
    messages = state["messages"]
    response = await llm_with_tools.ainvoke(messages)
    return {"messages": [response]}


# ============================================================================
# GRAPH CONSTRUCTION
# ============================================================================

def create_graph(
    kb_service=None,
    user_id: Optional[UUID] = None,
) -> StateGraph:
    """
    Create the LangGraph workflow with standard tool calling pattern.
    
    Args:
        kb_service: Knowledge base service instance
        user_id: Optional authenticated user ID
        
    Returns:
        Compiled StateGraph
    """
    
    # Create tools with injected services
    all_tools = []
    
    if kb_service:
        all_tools.extend(create_kb_tools(kb_service, user_id=user_id))

    # Create LLM with tools bound
    callbacks = []
    if CallbackHandler is not None:
        langfuse_handler = CallbackHandler()
        callbacks.append(langfuse_handler)

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, callbacks=callbacks)
    llm_with_tools = llm.bind_tools(all_tools)
    
    # Create tool node that will execute tools
    tool_node = ToolNode(all_tools)
    
    # Create the graph
    workflow = StateGraph(AgentState)
    
    # Define the agent node with the bound LLM
    async def agent_node(state: AgentState):
        return await call_model(state, llm_with_tools)
    
    # Add nodes
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)
    
    # Set entry point
    workflow.set_entry_point("agent")
    
    # Add conditional edges
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "continue": "tools",
            "end": END,
        },
    )
    
    # After tool execution, return to agent
    workflow.add_edge("tools", "agent")
    
    return workflow.compile()


# ============================================================================
# SYSTEM PROMPT
# ============================================================================

SYSTEM_PROMPT = """You are a helpful AI assistant.

You have access to the following capabilities:
- Search the knowledge base for information

When helping users:
1. Use the available tools to gather information
2. Provide clear, concise, and helpful responses

IMPORTANT: When a user wants to search the knowledge base:
- Use only the information that is best match for the user's query and don't provide any other information.

Always be professional and helpful."""


def create_initial_messages(user_query: str) -> list[BaseMessage]:
    """Create initial messages with system prompt and user query."""
    return [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_query)
    ]


# ============================================================================
# CONVENIENCE FUNCTION
# ============================================================================

async def run_agent(
    query: str,
    kb_service=None,
    user_id: Optional[UUID] = None,
) -> dict:
    """
    Run the agent workflow for a given query.
    
    Args:
        query: User's query
        kb_service: Knowledge base service
        user_id: Optional authenticated user ID
        
    Returns:
        Dictionary with final state including messages
    """
    graph = create_graph(
        kb_service=kb_service,
        user_id=user_id
    )
    
    initial_state = {
        "messages": create_initial_messages(query)
    }
    
    final_state = await graph.ainvoke(initial_state)
    
    return final_state
