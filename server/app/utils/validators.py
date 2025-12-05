"""
Input validation utilities for the AI Agent Platform.

This module provides validators for email, password strength, file types,
and other common validation needs.
"""

import re
from typing import List, Optional
from pathlib import Path


# Email validation regex (RFC 5322 simplified)
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}"
    r"[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
)

# Allowed file types for document upload
ALLOWED_FILE_TYPES = {".pdf", ".txt", ".docx", ".md", ".doc"}

# File size limits (in bytes)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_QUERY_LENGTH = 2000
MAX_CONVERSATION_TITLE_LENGTH = 500
MAX_FEEDBACK_COMMENT_LENGTH = 2000


def validate_email(email: str) -> bool:
    """
    Validate email address format.

    Args:
        email: Email address to validate

    Returns:
        True if email is valid, False otherwise

    Examples:
        >>> validate_email("user@example.com")
        True
        >>> validate_email("invalid.email")
        False
    """
    if not email or not isinstance(email, str):
        return False

    # Check length constraints
    if len(email) > 255:
        return False

    # Check format
    return bool(EMAIL_REGEX.match(email))


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength.

    Password requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)

    Examples:
        >>> validate_password_strength("Weak123")
        (False, "Password must contain at least one special character")
        >>> validate_password_strength("Strong@123")
        (True, None)
    """
    if not password or not isinstance(password, str):
        return False, "Password is required"

    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if len(password) > 128:
        return False, "Password must not exceed 128 characters"

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"

    return True, None


def validate_file_type(filename: str, allowed_types: Optional[List[str]] = None) -> bool:
    """
    Validate file type based on extension.

    Args:
        filename: Name of the file to validate
        allowed_types: List of allowed extensions (e.g., ['.pdf', '.txt'])
                      If None, uses default ALLOWED_FILE_TYPES

    Returns:
        True if file type is allowed, False otherwise

    Examples:
        >>> validate_file_type("document.pdf")
        True
        >>> validate_file_type("script.exe")
        False
    """
    if not filename or not isinstance(filename, str):
        return False

    # Get file extension
    file_ext = Path(filename).suffix.lower()

    if not file_ext:
        return False

    # Use provided allowed types or default
    allowed = set(allowed_types) if allowed_types else ALLOWED_FILE_TYPES

    return file_ext in allowed


def validate_file_size(file_size: int, max_size: Optional[int] = None) -> bool:
    """
    Validate file size.

    Args:
        file_size: Size of file in bytes
        max_size: Maximum allowed size in bytes (default: MAX_FILE_SIZE)

    Returns:
        True if file size is within limits, False otherwise

    Examples:
        >>> validate_file_size(1024 * 1024)  # 1MB
        True
        >>> validate_file_size(100 * 1024 * 1024)  # 100MB
        False
    """
    if not isinstance(file_size, int) or file_size < 0:
        return False

    max_allowed = max_size if max_size is not None else MAX_FILE_SIZE

    return file_size <= max_allowed


def validate_query_length(query: str) -> tuple[bool, Optional[str]]:
    """
    Validate query string length.

    Args:
        query: Query string to validate

    Returns:
        Tuple of (is_valid, error_message)

    Examples:
        >>> validate_query_length("What is AI?")
        (True, None)
        >>> validate_query_length("a" * 3000)
        (False, "Query must not exceed 2000 characters")
    """
    if not query or not isinstance(query, str):
        return False, "Query is required"

    query = query.strip()

    if len(query) == 0:
        return False, "Query cannot be empty"

    if len(query) > MAX_QUERY_LENGTH:
        return False, f"Query must not exceed {MAX_QUERY_LENGTH} characters"

    return True, None


def validate_rating(rating: int) -> bool:
    """
    Validate feedback rating value.

    Args:
        rating: Rating value (should be 1-5)

    Returns:
        True if rating is valid, False otherwise

    Examples:
        >>> validate_rating(3)
        True
        >>> validate_rating(6)
        False
    """
    return isinstance(rating, int) and 1 <= rating <= 5


def validate_uuid(uuid_string: str) -> bool:
    """
    Validate UUID string format.

    Args:
        uuid_string: UUID string to validate

    Returns:
        True if UUID is valid, False otherwise

    Examples:
        >>> validate_uuid("550e8400-e29b-41d4-a716-446655440000")
        True
        >>> validate_uuid("invalid-uuid")
        False
    """
    if not uuid_string or not isinstance(uuid_string, str):
        return False

    uuid_pattern = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        re.IGNORECASE
    )

    return bool(uuid_pattern.match(uuid_string))


def validate_role(role: str) -> bool:
    """
    Validate user role.

    Args:
        role: Role string to validate

    Returns:
        True if role is valid, False otherwise

    Examples:
        >>> validate_role("user")
        True
        >>> validate_role("invalid_role")
        False
    """
    from app.core.constants import UserRole

    if not role or not isinstance(role, str):
        return False

    valid_roles = {UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN}
    return role in valid_roles


def validate_pagination(skip: int, limit: int) -> tuple[bool, Optional[str]]:
    """
    Validate pagination parameters.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        Tuple of (is_valid, error_message)

    Examples:
        >>> validate_pagination(0, 10)
        (True, None)
        >>> validate_pagination(-1, 10)
        (False, "Skip must be non-negative")
    """
    if not isinstance(skip, int) or not isinstance(limit, int):
        return False, "Skip and limit must be integers"

    if skip < 0:
        return False, "Skip must be non-negative"

    if limit < 1:
        return False, "Limit must be at least 1"

    if limit > 100:
        return False, "Limit must not exceed 100"

    return True, None


def validate_conversation_title(title: str) -> tuple[bool, Optional[str]]:
    """
    Validate conversation title.

    Args:
        title: Conversation title to validate

    Returns:
        Tuple of (is_valid, error_message)

    Examples:
        >>> validate_conversation_title("My Conversation")
        (True, None)
        >>> validate_conversation_title("a" * 600)
        (False, "Title must not exceed 500 characters")
    """
    if not title or not isinstance(title, str):
        return False, "Title is required"

    title = title.strip()

    if len(title) == 0:
        return False, "Title cannot be empty"

    if len(title) > MAX_CONVERSATION_TITLE_LENGTH:
        return False, f"Title must not exceed {MAX_CONVERSATION_TITLE_LENGTH} characters"

    return True, None


def validate_feedback_comment(comment: str) -> tuple[bool, Optional[str]]:
    """
    Validate feedback comment.

    Args:
        comment: Feedback comment to validate

    Returns:
        Tuple of (is_valid, error_message)

    Examples:
        >>> validate_feedback_comment("Great response!")
        (True, None)
        >>> validate_feedback_comment("a" * 3000)
        (False, "Comment must not exceed 2000 characters")
    """
    if not comment or not isinstance(comment, str):
        return True, None  # Comment is optional

    comment = comment.strip()

    if len(comment) > MAX_FEEDBACK_COMMENT_LENGTH:
        return False, f"Comment must not exceed {MAX_FEEDBACK_COMMENT_LENGTH} characters"

    return True, None
