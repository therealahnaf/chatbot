"""Structured logging configuration using structlog."""

import logging
import sys
from typing import Any

import structlog
from structlog.types import EventDict, Processor

from app.core.config import settings


def add_app_context(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """
    Add application context to log entries.

    Args:
        logger: The logger instance
        method_name: The logging method name
        event_dict: The event dictionary

    Returns:
        Updated event dictionary with app context
    """
    event_dict["app"] = settings.APP_NAME
    event_dict["environment"] = settings.APP_ENV
    return event_dict


def configure_logging() -> None:
    """Configure structured logging for the application."""
    # Determine log level
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    # Processors for structlog
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        add_app_context,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    # Add appropriate renderer based on environment
    if settings.is_production:
        # JSON output for production (easier to parse)
        processors.append(structlog.processors.JSONRenderer())
    else:
        # Console output for development (easier to read)
        processors.append(structlog.dev.ConsoleRenderer())

    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """
    Get a configured logger instance.

    Args:
        name: The logger name (usually __name__)

    Returns:
        A configured structlog logger
    """
    return structlog.get_logger(name)


# Configure logging on module import
configure_logging()

# Export a default logger
logger = get_logger(__name__)
