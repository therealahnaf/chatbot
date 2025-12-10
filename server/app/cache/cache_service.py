"""Cache service for Redis operations."""

import hashlib
import json
import logging
from typing import Any, Optional

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.cache.redis_client import get_redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Service for cache operations with Redis."""

    def __init__(self, redis_client: Redis) -> None:
        """
        Initialize cache service.

        Args:
            redis_client: Redis client instance
        """
        self._redis = redis_client
        self._default_ttl = settings.CACHE_TTL_SECONDS

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        try:
            value = await self._redis.get(key)
            if value is None:
                logger.debug("Cache miss for key: %s", key)
                return None

            logger.debug("Cache hit for key: %s", key)
            return json.loads(value)
        except RedisError as e:
            logger.error("Redis error getting key %s: %s", key, e)
            return None
        except json.JSONDecodeError as e:
            logger.error("JSON decode error for key %s: %s", key, e)
            return None
        except Exception as e:
            logger.error("Unexpected error getting key %s: %s", key, e)
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds (uses default if not provided)

        Returns:
            True if successful, False otherwise
        """
        try:
            ttl_seconds = ttl if ttl is not None else self._default_ttl
            serialized_value = json.dumps(value)

            result = await self._redis.setex(
                key,
                ttl_seconds,
                serialized_value
            )

            if result:
                logger.debug(
                    "Cached key: %s with TTL: %d seconds",
                    key,
                    ttl_seconds
                )
                return True

            logger.warning("Failed to cache key: %s", key)
            return False

        except (TypeError, ValueError) as e:
            logger.error("Serialization error for key %s: %s", key, e)
            return False
        except RedisError as e:
            logger.error("Redis error setting key %s: %s", key, e)
            return False
        except Exception as e:
            logger.error("Unexpected error setting key %s: %s", key, e)
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete value from cache.

        Args:
            key: Cache key

        Returns:
            True if key was deleted, False otherwise
        """
        try:
            result = await self._redis.delete(key)
            if result > 0:
                logger.debug("Deleted cache key: %s", key)
                return True

            logger.debug("Cache key not found: %s", key)
            return False

        except RedisError as e:
            logger.error("Redis error deleting key %s: %s", key, e)
            return False
        except Exception as e:
            logger.error("Unexpected error deleting key %s: %s", key, e)
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.

        Args:
            pattern: Key pattern (e.g., "user:*")

        Returns:
            Number of keys deleted
        """
        try:
            keys = []
            async for key in self._redis.scan_iter(match=pattern):
                keys.append(key)

            if not keys:
                logger.debug("No keys found matching pattern: %s", pattern)
                return 0

            deleted = await self._redis.delete(*keys)
            logger.debug(
                "Deleted %d keys matching pattern: %s",
                deleted,
                pattern
            )
            return deleted

        except RedisError as e:
            logger.error(
                "Redis error deleting pattern %s: %s",
                pattern,
                e
            )
            return 0
        except Exception as e:
            logger.error(
                "Unexpected error deleting pattern %s: %s",
                pattern,
                e
            )
            return 0

    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.

        Args:
            key: Cache key

        Returns:
            True if key exists, False otherwise
        """
        try:
            result = await self._redis.exists(key)
            return result > 0
        except RedisError as e:
            logger.error("Redis error checking key %s: %s", key, e)
            return False
        except Exception as e:
            logger.error("Unexpected error checking key %s: %s", key, e)
            return False

    async def get_ttl(self, key: str) -> Optional[int]:
        """
        Get remaining TTL for a key.

        Args:
            key: Cache key

        Returns:
            TTL in seconds, -1 if no expiry, None if key doesn't exist
        """
        try:
            ttl = await self._redis.ttl(key)
            if ttl == -2:  # Key doesn't exist
                return None
            return ttl
        except RedisError as e:
            logger.error("Redis error getting TTL for key %s: %s", key, e)
            return None
        except Exception as e:
            logger.error(
                "Unexpected error getting TTL for key %s: %s",
                key,
                e
            )
            return None

    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """
        Increment a counter in cache.

        Args:
            key: Cache key
            amount: Amount to increment by

        Returns:
            New value after increment, None on error
        """
        try:
            result = await self._redis.incrby(key, amount)
            logger.debug("Incremented key %s by %d to %d", key, amount, result)
            return result
        except RedisError as e:
            logger.error("Redis error incrementing key %s: %s", key, e)
            return None
        except Exception as e:
            logger.error(
                "Unexpected error incrementing key %s: %s",
                key,
                e
            )
            return None

    async def expire(self, key: str, ttl: int) -> bool:
        """
        Set expiration time for a key.

        Args:
            key: Cache key
            ttl: Time to live in seconds

        Returns:
            True if successful, False otherwise
        """
        try:
            result = await self._redis.expire(key, ttl)
            if result:
                logger.debug("Set expiration for key %s: %d seconds", key, ttl)
                return True
            logger.warning("Failed to set expiration for key: %s", key)
            return False
        except RedisError as e:
            logger.error("Redis error setting expiration for key %s: %s", key, e)
            return False
        except Exception as e:
            logger.error(
                "Unexpected error setting expiration for key %s: %s",
                key,
                e
            )
            return False


def generate_cache_key(*parts: str, prefix: str = "") -> str:
    """
    Generate a cache key from parts.

    Args:
        *parts: Key components
        prefix: Optional prefix for the key

    Returns:
        Generated cache key
    """
    key_parts = [prefix] if prefix else []
    key_parts.extend(str(part) for part in parts)
    return ":".join(key_parts)


def generate_query_cache_key(query: str, user_id: str) -> str:
    """
    Generate cache key for agent query responses.

    Args:
        query: User query
        user_id: User ID

    Returns:
        Cache key for the query
    """
    query_hash = hashlib.sha256(query.encode()).hexdigest()[:16]
    return generate_cache_key("query_cache", user_id, query_hash)


def generate_user_cache_key(user_id: str) -> str:
    """
    Generate cache key for user profile.

    Args:
        user_id: User ID

    Returns:
        Cache key for user profile
    """
    return generate_cache_key("user", user_id)


def generate_session_cache_key(user_id: str) -> str:
    """
    Generate cache key for user session.

    Args:
        user_id: User ID

    Returns:
        Cache key for user session
    """
    return generate_cache_key("session", user_id)


async def get_cache_service() -> CacheService:
    """
    Dependency injection function for FastAPI.

    Returns:
        CacheService instance
    """
    redis_client = await get_redis_client()
    return CacheService(redis_client)
