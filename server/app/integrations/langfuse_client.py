"""Langfuse tracing client for LLM observability."""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional, AsyncGenerator
from uuid import uuid4

from langfuse import Langfuse

from app.core.config import settings

logger = logging.getLogger(__name__)


class LangfuseClient:
    """
    Wrapper for Langfuse tracing and observability.

    Provides methods for:
    - Trace initialization and management
    - Span creation for nested operations
    - Generation tracking for LLM calls
    - Event logging
    - Context management
    """

    def __init__(
        self,
        public_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        host: Optional[str] = None,
        enabled: Optional[bool] = None,
    ):
        """
        Initialize Langfuse client.

        Args:
            public_key: Langfuse public key (defaults to settings)
            secret_key: Langfuse secret key (defaults to settings)
            host: Langfuse host URL (defaults to settings)
            enabled: Whether tracing is enabled (defaults to settings)
        """
        self.enabled = enabled if enabled is not None else settings.LANGFUSE_ENABLED
        self.public_key = public_key or settings.LANGFUSE_PUBLIC_KEY
        self.secret_key = secret_key or settings.LANGFUSE_SECRET_KEY
        self.host = host or settings.LANGFUSE_HOST

        self.client: Optional[Langfuse] = None

        if self.enabled and self.public_key and self.secret_key:
            try:
                self.client = Langfuse(
                    public_key=self.public_key,
                    secret_key=self.secret_key,
                    host=self.host,
                )
                logger.info("Langfuse client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Langfuse client: {e}")
                self.enabled = False
        else:
            logger.warning("Langfuse tracing is disabled or credentials not provided")
            self.enabled = False

    def create_trace(
        self,
        name: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[list[str]] = None,
        trace_id: Optional[str] = None,
    ) -> Optional[Any]:
        """
        Create a new trace for tracking a request flow.

        Args:
            name: Name of the trace (e.g., "agent_query")
            user_id: User ID associated with the trace
            session_id: Session/conversation ID
            metadata: Additional metadata
            tags: Tags for categorization
            trace_id: Optional custom trace ID

        Returns:
            Trace object or None if tracing is disabled
        """
        if not self.enabled or not self.client:
            return None

        try:
            trace = self.client.trace(
                id=trace_id or str(uuid4()),
                name=name,
                user_id=user_id,
                session_id=session_id,
                metadata=metadata or {},
                tags=tags or [],
            )
            return trace
        except Exception as e:
            logger.error(f"Failed to create trace: {e}")
            return None

    def create_span(
        self,
        trace_id: str,
        name: str,
        input_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        parent_span_id: Optional[str] = None,
    ) -> Optional[Any]:
        """
        Create a span within a trace for nested operations.

        Args:
            trace_id: ID of the parent trace
            name: Name of the span (e.g., "tool_execution")
            input_data: Input data for the span
            metadata: Additional metadata
            parent_span_id: Parent span ID for nested spans

        Returns:
            Span object or None if tracing is disabled
        """
        if not self.enabled or not self.client:
            return None

        try:
            span = self.client.span(
                trace_id=trace_id,
                name=name,
                input=input_data,
                metadata=metadata or {},
                parent_observation_id=parent_span_id,
            )
            return span
        except Exception as e:
            logger.error(f"Failed to create span: {e}")
            return None

    def create_generation(
        self,
        trace_id: str,
        name: str,
        model: str,
        input_data: Any,
        metadata: Optional[Dict[str, Any]] = None,
        parent_span_id: Optional[str] = None,
    ) -> Optional[Any]:
        """
        Create a generation observation for LLM calls.

        Args:
            trace_id: ID of the parent trace
            name: Name of the generation (e.g., "chat_completion")
            model: Model name (e.g., "gpt-4-turbo")
            input_data: Input to the LLM (messages, prompt, etc.)
            metadata: Additional metadata
            parent_span_id: Parent span ID

        Returns:
            Generation object or None if tracing is disabled
        """
        if not self.enabled or not self.client:
            return None

        try:
            generation = self.client.generation(
                trace_id=trace_id,
                name=name,
                model=model,
                input=input_data,
                metadata=metadata or {},
                parent_observation_id=parent_span_id,
            )
            return generation
        except Exception as e:
            logger.error(f"Failed to create generation: {e}")
            return None

    def update_generation(
        self,
        generation_id: str,
        output: Any,
        usage: Optional[Dict[str, int]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Update a generation with output and usage data.

        Args:
            generation_id: ID of the generation to update
            output: LLM output
            usage: Token usage statistics
            metadata: Additional metadata
        """
        if not self.enabled or not self.client:
            return

        try:
            self.client.generation(
                id=generation_id,
                output=output,
                usage=usage,
                metadata=metadata,
            )
        except Exception as e:
            logger.error(f"Failed to update generation: {e}")

    def log_event(
        self,
        trace_id: str,
        name: str,
        input_data: Optional[Any] = None,
        output: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
        level: str = "DEFAULT",
    ) -> None:
        """
        Log an event within a trace.

        Args:
            trace_id: ID of the parent trace
            name: Event name
            input_data: Event input
            output: Event output
            metadata: Additional metadata
            level: Event level (DEFAULT, DEBUG, WARNING, ERROR)
        """
        if not self.enabled or not self.client:
            return

        try:
            self.client.event(
                trace_id=trace_id,
                name=name,
                input=input_data,
                output=output,
                metadata=metadata or {},
                level=level,
            )
        except Exception as e:
            logger.error(f"Failed to log event: {e}")

    def score_trace(
        self,
        trace_id: str,
        name: str,
        value: float,
        comment: Optional[str] = None,
    ) -> None:
        """
        Add a score to a trace (e.g., user feedback).

        Args:
            trace_id: ID of the trace to score
            name: Score name (e.g., "user_rating")
            value: Score value
            comment: Optional comment
        """
        if not self.enabled or not self.client:
            return

        try:
            self.client.score(
                trace_id=trace_id,
                name=name,
                value=value,
                comment=comment,
            )
        except Exception as e:
            logger.error(f"Failed to score trace: {e}")

    @asynccontextmanager
    async def trace_context(
        self,
        name: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[list[str]] = None,
    ) -> AsyncGenerator[Optional[Any], None]:
        """
        Context manager for automatic trace lifecycle management.

        Args:
            name: Trace name
            user_id: User ID
            session_id: Session ID
            metadata: Metadata
            tags: Tags

        Yields:
            Trace object or None if tracing is disabled

        Example:
            async with langfuse_client.trace_context("agent_query", user_id="123") as trace:
                # Your code here
                pass
        """
        trace = None
        if self.enabled:
            trace = self.create_trace(
                name=name,
                user_id=user_id,
                session_id=session_id,
                metadata=metadata,
                tags=tags,
            )

        try:
            yield trace
        finally:
            if trace and self.enabled:
                try:
                    # Flush any pending data
                    if self.client:
                        self.client.flush()
                except Exception as e:
                    logger.error(f"Failed to flush trace: {e}")

    def flush(self) -> None:
        """Flush any pending traces to Langfuse."""
        if self.enabled and self.client:
            try:
                self.client.flush()
            except Exception as e:
                logger.error(f"Failed to flush Langfuse client: {e}")

    def shutdown(self) -> None:
        """Shutdown the Langfuse client and flush pending data."""
        if self.enabled and self.client:
            try:
                self.client.flush()
                logger.info("Langfuse client shutdown successfully")
            except Exception as e:
                logger.error(f"Failed to shutdown Langfuse client: {e}")

    async def health_check(self) -> bool:
        """
        Check if Langfuse is accessible.

        Returns:
            True if accessible, False otherwise
        """
        if not self.enabled or not self.client:
            return False

        try:
            # Try to create a test trace
            test_trace = self.create_trace(name="health_check")
            if test_trace:
                self.flush()
                return True
            return False
        except Exception as e:
            logger.error(f"Langfuse health check failed: {e}")
            return False


# Global client instance
_langfuse_client: Optional[LangfuseClient] = None


def get_langfuse_client() -> LangfuseClient:
    """
    Get or create global Langfuse client instance.

    Returns:
        LangfuseClient instance
    """
    global _langfuse_client
    if _langfuse_client is None:
        _langfuse_client = LangfuseClient()
    return _langfuse_client


# Decorator for automatic function tracing
def trace_function(name: Optional[str] = None):
    """
    Decorator to automatically trace a function with Langfuse.

    Args:
        name: Optional custom name for the trace

    Example:
        @trace_function("my_function")
        async def my_function(arg1, arg2):
            # Your code here
            pass
    """
    from functools import wraps

    def decorator(func):
        client = get_langfuse_client()
        if not client.enabled:
            return func

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            trace_name = name or func.__name__
            async with client.trace_context(trace_name):
                return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            trace_name = name or func.__name__
            _ = client.create_trace(trace_name)
            try:
                return func(*args, **kwargs)
            finally:
                client.flush()

        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
