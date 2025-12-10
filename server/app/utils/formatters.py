"""
Response formatting utilities for the AI Agent Platform.

This module provides formatting functions for API responses, error messages,
pagination, and other common formatting needs.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, TypeVar, Generic
from uuid import UUID

from pydantic import BaseModel


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response model."""

    items: List[T]
    total: int
    skip: int
    limit: int
    has_more: bool

    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    """Standard error response model."""

    error: Dict[str, Any]

    class Config:
        from_attributes = True


class SuccessResponse(BaseModel):
    """Standard success response model."""

    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


def format_error_response(
    code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Format a standardized error response.

    Args:
        code: Error code (e.g., "AUTHENTICATION_FAILED")
        message: Human-readable error message
        details: Additional error details
        request_id: Request correlation ID

    Returns:
        Formatted error response dictionary

    Examples:
        >>> format_error_response("NOT_FOUND", "User not found")
        {'error': {'code': 'NOT_FOUND', 'message': 'User not found', 'details': {}, 'request_id': None}}
    """
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "request_id": request_id,
        }
    }


def format_success_response(
    message: str,
    data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Format a standardized success response.

    Args:
        message: Success message
        data: Optional response data

    Returns:
        Formatted success response dictionary

    Examples:
        >>> format_success_response("User created successfully", {"user_id": "123"})
        {'success': True, 'message': 'User created successfully', 'data': {'user_id': '123'}}
    """
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def format_paginated_response(
    items: List[Any],
    total: int,
    skip: int,
    limit: int,
) -> Dict[str, Any]:
    """
    Format a paginated response.

    Args:
        items: List of items for current page
        total: Total number of items
        skip: Number of items skipped
        limit: Maximum items per page

    Returns:
        Formatted paginated response

    Examples:
        >>> format_paginated_response([1, 2, 3], 10, 0, 3)
        {'items': [1, 2, 3], 'total': 10, 'skip': 0, 'limit': 3, 'has_more': True}
    """
    has_more = (skip + len(items)) < total

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": has_more,
    }


def format_datetime(dt: datetime, format_str: Optional[str] = None) -> str:
    """
    Format datetime object to string.

    Args:
        dt: Datetime object to format
        format_str: Optional format string (default: ISO 8601)

    Returns:
        Formatted datetime string

    Examples:
        >>> from datetime import datetime
        >>> dt = datetime(2025, 10, 29, 12, 0, 0)
        >>> format_datetime(dt)
        '2025-10-29T12:00:00'
    """
    if not dt:
        return ""

    if format_str:
        return dt.strftime(format_str)

    # Default to ISO 8601 format
    return dt.isoformat()


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format.

    Args:
        size_bytes: File size in bytes

    Returns:
        Formatted file size string

    Examples:
        >>> format_file_size(1024)
        '1.00 KB'
        >>> format_file_size(1048576)
        '1.00 MB'
        >>> format_file_size(500)
        '500 B'
    """
    if size_bytes < 0:
        return "0 B"

    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(size_bytes)
    unit_index = 0

    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1

    if unit_index == 0:
        return f"{int(size)} {units[unit_index]}"
    else:
        return f"{size:.2f} {units[unit_index]}"


def format_duration(seconds: float) -> str:
    """
    Format duration in human-readable format.

    Args:
        seconds: Duration in seconds

    Returns:
        Formatted duration string

    Examples:
        >>> format_duration(45)
        '45s'
        >>> format_duration(125)
        '2m 5s'
        >>> format_duration(3665)
        '1h 1m 5s'
    """
    if seconds < 0:
        return "0s"

    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    parts = []
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    if secs > 0 or not parts:
        parts.append(f"{secs}s")

    return " ".join(parts)


def format_percentage(value: float, decimals: int = 2) -> str:
    """
    Format value as percentage.

    Args:
        value: Value to format (0.0 to 1.0)
        decimals: Number of decimal places

    Returns:
        Formatted percentage string

    Examples:
        >>> format_percentage(0.856)
        '85.60%'
        >>> format_percentage(0.5, decimals=0)
        '50%'
    """
    percentage = value * 100
    return f"{percentage:.{decimals}f}%"


def format_token_count(count: int) -> str:
    """
    Format token count in human-readable format.

    Args:
        count: Number of tokens

    Returns:
        Formatted token count string

    Examples:
        >>> format_token_count(1500)
        '1.5K'
        >>> format_token_count(1500000)
        '1.5M'
    """
    if count < 1000:
        return str(count)
    elif count < 1000000:
        return f"{count / 1000:.1f}K"
    else:
        return f"{count / 1000000:.1f}M"


def format_uuid(uuid_obj: UUID) -> str:
    """
    Format UUID object to string.

    Args:
        uuid_obj: UUID object

    Returns:
        UUID string

    Examples:
        >>> from uuid import UUID
        >>> uuid_obj = UUID("550e8400-e29b-41d4-a716-446655440000")
        >>> format_uuid(uuid_obj)
        '550e8400-e29b-41d4-a716-446655440000'
    """
    if not uuid_obj:
        return ""

    return str(uuid_obj)


def format_list(items: List[str], separator: str = ", ", last_separator: str = " and ") -> str:
    """
    Format list of items into a human-readable string.

    Args:
        items: List of items to format
        separator: Separator between items
        last_separator: Separator before last item

    Returns:
        Formatted string

    Examples:
        >>> format_list(["apple", "banana", "orange"])
        'apple, banana and orange'
        >>> format_list(["one"])
        'one'
        >>> format_list([])
        ''
    """
    if not items:
        return ""

    if len(items) == 1:
        return items[0]

    if len(items) == 2:
        return f"{items[0]}{last_separator}{items[1]}"

    return f"{separator.join(items[:-1])}{last_separator}{items[-1]}"


def format_metadata(metadata: Dict[str, Any], max_length: int = 100) -> str:
    """
    Format metadata dictionary for display.

    Args:
        metadata: Metadata dictionary
        max_length: Maximum length of formatted string

    Returns:
        Formatted metadata string

    Examples:
        >>> format_metadata({"key1": "value1", "key2": "value2"})
        'key1: value1, key2: value2'
    """
    if not metadata:
        return ""

    items = [f"{key}: {value}" for key, value in metadata.items()]
    formatted = ", ".join(items)

    if len(formatted) > max_length:
        formatted = formatted[:max_length - 3] + "..."

    return formatted


def format_conversation_preview(content: str, max_length: int = 100) -> str:
    """
    Format conversation content for preview.

    Args:
        content: Full conversation content
        max_length: Maximum length of preview

    Returns:
        Formatted preview string

    Examples:
        >>> format_conversation_preview("This is a long conversation about AI and machine learning")
        'This is a long conversation about AI and machine learning'
        >>> format_conversation_preview("A" * 150, max_length=50)
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...'
    """
    if not content:
        return ""

    # Remove extra whitespace
    content = " ".join(content.split())

    if len(content) <= max_length:
        return content

    return content[:max_length - 3] + "..."


def format_tool_results(tool_results: Dict[str, Any]) -> str:
    """
    Format tool execution results for display.

    Args:
        tool_results: Dictionary of tool results

    Returns:
        Formatted tool results string

    Examples:
        >>> format_tool_results({"web_search": "Found 5 results", "kb_search": "Found 2 documents"})
        'web_search: Found 5 results\\nkb_search: Found 2 documents'
    """
    if not tool_results:
        return "No tool results"

    lines = []
    for tool_name, result in tool_results.items():
        result_str = str(result)
        if len(result_str) > 200:
            result_str = result_str[:200] + "..."
        lines.append(f"{tool_name}: {result_str}")

    return "\n".join(lines)


def format_validation_errors(errors: List[Dict[str, Any]]) -> str:
    """
    Format validation errors for display.

    Args:
        errors: List of validation error dictionaries

    Returns:
        Formatted error string

    Examples:
        >>> errors = [{"field": "email", "message": "Invalid email"}]
        >>> format_validation_errors(errors)
        'email: Invalid email'
    """
    if not errors:
        return ""

    error_messages = []
    for error in errors:
        field = error.get("field", "unknown")
        message = error.get("message", "Validation error")
        error_messages.append(f"{field}: {message}")

    return "; ".join(error_messages)


def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """
    Truncate text to maximum length.

    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add when truncated

    Returns:
        Truncated text

    Examples:
        >>> truncate_text("This is a long text", 10)
        'This is...'
        >>> truncate_text("Short", 10)
        'Short'
    """
    if not text:
        return ""

    if len(text) <= max_length:
        return text

    return text[:max_length - len(suffix)] + suffix


def format_agent_response_metadata(metadata: Dict[str, Any]) -> Dict[str, str]:
    """
    Format agent response metadata for display.

    Args:
        metadata: Raw metadata dictionary

    Returns:
        Formatted metadata dictionary

    Examples:
        >>> metadata = {"tokens_used": 1500, "response_time": 2.5, "tools_called": ["web_search"]}
        >>> format_agent_response_metadata(metadata)
        {'tokens_used': '1.5K', 'response_time': '2.50s', 'tools_called': 'web_search'}
    """
    formatted = {}

    if "tokens_used" in metadata:
        formatted["tokens_used"] = format_token_count(metadata["tokens_used"])

    if "response_time" in metadata:
        formatted["response_time"] = f"{metadata['response_time']:.2f}s"

    if "tools_called" in metadata:
        tools = metadata["tools_called"]
        if isinstance(tools, list):
            formatted["tools_called"] = format_list(tools, separator=", ", last_separator=", ")
        else:
            formatted["tools_called"] = str(tools)

    if "intent" in metadata:
        formatted["intent"] = str(metadata["intent"])

    return formatted
