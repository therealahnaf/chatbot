"""Prometheus metrics definitions and utilities."""

from functools import wraps
from time import time
from typing import Any, Callable

from prometheus_client import Counter, Gauge, Histogram

# HTTP Metrics (will be auto-instrumented by prometheus-fastapi-instrumentator)
# These are defined here for reference and custom tracking

# Agent Metrics
agent_queries_total = Counter(
    "agent_queries_total",
    "Total number of agent queries",
    ["user_role", "intent", "status"],
)

agent_response_duration_seconds = Histogram(
    "agent_response_duration_seconds",
    "Agent response time in seconds",
    ["intent", "tools_used"],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0),
)

agent_tokens_used_total = Counter(
    "agent_tokens_used_total",
    "Total tokens used by agent",
    ["model", "type"],
)

agent_tool_calls_total = Counter(
    "agent_tool_calls_total",
    "Total tool invocations",
    ["tool_name", "status"],
)

agent_conversations_total = Counter(
    "agent_conversations_total",
    "Total conversations created",
    ["user_role"],
)

agent_messages_total = Counter(
    "agent_messages_total",
    "Total messages sent",
    ["role"],
)

# Knowledge Base Metrics
kb_documents_uploaded_total = Counter(
    "kb_documents_uploaded_total",
    "Total documents uploaded",
    ["file_type", "status"],
)

kb_documents_total = Gauge(
    "kb_documents_total",
    "Current number of documents",
    ["user_id"],
)

kb_chunks_total = Gauge(
    "kb_chunks_total",
    "Total number of document chunks",
)

kb_searches_total = Counter(
    "kb_searches_total",
    "Total KB search operations",
    ["status"],
)

kb_search_duration_seconds = Histogram(
    "kb_search_duration_seconds",
    "KB search duration in seconds",
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0),
)

kb_search_results_count = Histogram(
    "kb_search_results_count",
    "Number of results returned from KB search",
    buckets=(0, 1, 3, 5, 10, 20, 50),
)

# User Metrics
users_registered_total = Counter(
    "users_registered_total",
    "Total users registered",
)

users_active_total = Gauge(
    "users_active_total",
    "Number of active users",
)

users_logged_in_total = Counter(
    "users_logged_in_total",
    "Total user logins",
)

auth_attempts_total = Counter(
    "auth_attempts_total",
    "Total authentication attempts",
    ["status"],
)

auth_token_refreshes_total = Counter(
    "auth_token_refreshes_total",
    "Total token refresh operations",
)

# Database Metrics
db_connections_active = Gauge(
    "db_connections_active",
    "Number of active database connections",
)

db_connections_idle = Gauge(
    "db_connections_idle",
    "Number of idle database connections",
)

db_connections_total = Gauge(
    "db_connections_total",
    "Total number of database connections",
)

db_query_duration_seconds = Histogram(
    "db_query_duration_seconds",
    "Database query duration in seconds",
    ["operation"],
    buckets=(0.001, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0),
)

db_queries_total = Counter(
    "db_queries_total",
    "Total database queries",
    ["operation", "status"],
)

# Cache Metrics
cache_hits_total = Counter(
    "cache_hits_total",
    "Total cache hits",
)

cache_misses_total = Counter(
    "cache_misses_total",
    "Total cache misses",
)

cache_operations_total = Counter(
    "cache_operations_total",
    "Total cache operations",
    ["operation", "status"],
)

cache_operation_duration_seconds = Histogram(
    "cache_operation_duration_seconds",
    "Cache operation duration in seconds",
    ["operation"],
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0),
)

# Vector Store Metrics
vector_store_operations_total = Counter(
    "vector_store_operations_total",
    "Total vector store operations",
    ["operation", "status"],
)

vector_store_operation_duration_seconds = Histogram(
    "vector_store_operation_duration_seconds",
    "Vector store operation duration in seconds",
    ["operation"],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0),
)

vector_store_vectors_total = Gauge(
    "vector_store_vectors_total",
    "Total number of vectors stored",
)

# Feedback Metrics
feedback_submitted_total = Counter(
    "feedback_submitted_total",
    "Total feedback submissions",
    ["rating"],
)


# Decorator for tracking metrics
def track_agent_query(func: Callable[..., Any]) -> Callable[..., Any]:
    """
    Decorator to track agent query metrics.

    Args:
        func: The function to decorate

    Returns:
        Decorated function
    """

    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        start_time = time()
        status = "success"
        intent = kwargs.get("intent", "unknown")
        tools = kwargs.get("tools", [])
        user_role = kwargs.get("user_role", "user")

        try:
            result = await func(*args, **kwargs)
            return result
        except Exception as e:
            status = "error"
            raise
        finally:
            duration = time() - start_time

            # Record metrics
            agent_response_duration_seconds.labels(
                intent=intent, tools_used=",".join(tools) if tools else "none"
            ).observe(duration)

            agent_queries_total.labels(
                user_role=user_role, intent=intent, status=status
            ).inc()

    return wrapper


def track_tool_call(tool_name: str, status: str = "success") -> None:
    """
    Track a tool call.

    Args:
        tool_name: Name of the tool
        status: Status of the call (success/error)
    """
    agent_tool_calls_total.labels(tool_name=tool_name, status=status).inc()


def track_token_usage(model: str, token_type: str, count: int) -> None:
    """
    Track token usage.

    Args:
        model: The model name
        token_type: Type of tokens (prompt/completion)
        count: Number of tokens used
    """
    agent_tokens_used_total.labels(model=model, type=token_type).inc(count)


def track_cache_operation(operation: str, hit: bool = False) -> None:
    """
    Track cache operation.

    Args:
        operation: The cache operation (get/set/delete)
        hit: Whether it was a cache hit (for get operations)
    """
    if operation == "get":
        if hit:
            cache_hits_total.inc()
        else:
            cache_misses_total.inc()

    cache_operations_total.labels(operation=operation, status="success").inc()
