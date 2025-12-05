"""Rate limiting service using Redis sliding window algorithm."""

import logging
import time
from typing import Optional

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.cache.redis_client import get_redis_client
from app.core.config import settings
from app.core.exceptions import RateLimitError

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter using Redis sliding window algorithm."""

    def __init__(self, redis_client: Redis) -> None:
        """
        Initialize rate limiter.

        Args:
            redis_client: Redis client instance
        """
        self._redis = redis_client
        self._window_seconds = 3600  # 1 hour window

    async def check_rate_limit(
        self,
        identifier: str,
        limit: int,
        window_seconds: Optional[int] = None
    ) -> tuple[bool, int, int]:
        """
        Check if request is within rate limit using sliding window.

        Args:
            identifier: Unique identifier (user_id, IP, etc.)
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds (default: 3600)

        Returns:
            Tuple of (is_allowed, current_count, remaining)

        Raises:
            RateLimitError: If rate limit is exceeded
        """
        window = window_seconds if window_seconds else self._window_seconds
        key = f"rate_limit:{identifier}"
        current_time = time.time()
        window_start = current_time - window

        try:
            # Use Redis pipeline for atomic operations
            pipe = self._redis.pipeline()

            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)

            # Count requests in current window
            pipe.zcard(key)

            # Add current request with timestamp as score
            pipe.zadd(key, {str(current_time): current_time})

            # Set expiration on the key
            pipe.expire(key, window)

            # Execute pipeline
            results = await pipe.execute()

            # Get count before adding current request
            current_count = results[1]

            # Check if limit exceeded
            if current_count >= limit:
                logger.warning(
                    "Rate limit exceeded for %s: %d/%d",
                    identifier,
                    current_count,
                    limit
                )
                return False, current_count, 0

            remaining = limit - current_count - 1
            logger.debug(
                "Rate limit check passed for %s: %d/%d (remaining: %d)",
                identifier,
                current_count + 1,
                limit,
                remaining
            )
            return True, current_count + 1, remaining

        except RedisError as e:
            logger.error(
                "Redis error checking rate limit for %s: %s",
                identifier,
                e
            )
            # Fail open - allow request if Redis is down
            return True, 0, limit
        except Exception as e:
            logger.error(
                "Unexpected error checking rate limit for %s: %s",
                identifier,
                e
            )
            # Fail open - allow request on unexpected errors
            return True, 0, limit

    async def check_and_raise(
        self,
        identifier: str,
        limit: int,
        window_seconds: Optional[int] = None
    ) -> None:
        """
        Check rate limit and raise exception if exceeded.

        Args:
            identifier: Unique identifier (user_id, IP, etc.)
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds (default: 3600)

        Raises:
            RateLimitError: If rate limit is exceeded
        """
        is_allowed, current, _ = await self.check_rate_limit(
            identifier,
            limit,
            window_seconds
        )

        if not is_allowed:
            raise RateLimitError(
                f"Rate limit exceeded. Current: {current}, Limit: {limit}"
            )

    async def get_remaining(
        self,
        identifier: str,
        limit: int,
        window_seconds: Optional[int] = None
    ) -> int:
        """
        Get remaining requests in current window.

        Args:
            identifier: Unique identifier (user_id, IP, etc.)
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds (default: 3600)

        Returns:
            Number of remaining requests
        """
        window = window_seconds if window_seconds else self._window_seconds
        key = f"rate_limit:{identifier}"
        current_time = time.time()
        window_start = current_time - window

        try:
            # Remove old entries and count current
            pipe = self._redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            results = await pipe.execute()

            current_count = results[1]
            remaining = max(0, limit - current_count)

            return remaining

        except RedisError as e:
            logger.error(
                "Redis error getting remaining for %s: %s",
                identifier,
                e
            )
            return limit
        except Exception as e:
            logger.error(
                "Unexpected error getting remaining for %s: %s",
                identifier,
                e
            )
            return limit

    async def reset_limit(self, identifier: str) -> bool:
        """
        Reset rate limit for an identifier.

        Args:
            identifier: Unique identifier to reset

        Returns:
            True if successful, False otherwise
        """
        key = f"rate_limit:{identifier}"

        try:
            result = await self._redis.delete(key)
            if result > 0:
                logger.info("Reset rate limit for: %s", identifier)
                return True
            logger.debug("No rate limit found for: %s", identifier)
            return False

        except RedisError as e:
            logger.error("Redis error resetting limit for %s: %s", identifier, e)
            return False
        except Exception as e:
            logger.error(
                "Unexpected error resetting limit for %s: %s",
                identifier,
                e
            )
            return False


class UserRateLimiter:
    """Rate limiter for user-based requests."""

    def __init__(self, rate_limiter: RateLimiter) -> None:
        """
        Initialize user rate limiter.

        Args:
            rate_limiter: RateLimiter instance
        """
        self._limiter = rate_limiter
        self._limit = settings.RATE_LIMIT_PER_USER

    async def check_user_limit(self, user_id: str) -> tuple[bool, int, int]:
        """
        Check rate limit for a user.

        Args:
            user_id: User ID

        Returns:
            Tuple of (is_allowed, current_count, remaining)
        """
        identifier = f"user:{user_id}"
        return await self._limiter.check_rate_limit(identifier, self._limit)

    async def check_and_raise(self, user_id: str) -> None:
        """
        Check user rate limit and raise exception if exceeded.

        Args:
            user_id: User ID

        Raises:
            RateLimitError: If rate limit is exceeded
        """
        identifier = f"user:{user_id}"
        await self._limiter.check_and_raise(identifier, self._limit)


class IPRateLimiter:
    """Rate limiter for IP-based requests."""

    def __init__(self, rate_limiter: RateLimiter) -> None:
        """
        Initialize IP rate limiter.

        Args:
            rate_limiter: RateLimiter instance
        """
        self._limiter = rate_limiter
        self._limit = settings.RATE_LIMIT_PER_IP

    async def check_ip_limit(self, ip_address: str) -> tuple[bool, int, int]:
        """
        Check rate limit for an IP address.

        Args:
            ip_address: IP address

        Returns:
            Tuple of (is_allowed, current_count, remaining)
        """
        identifier = f"ip:{ip_address}"
        return await self._limiter.check_rate_limit(identifier, self._limit)

    async def check_and_raise(self, ip_address: str) -> None:
        """
        Check IP rate limit and raise exception if exceeded.

        Args:
            ip_address: IP address

        Raises:
            RateLimitError: If rate limit is exceeded
        """
        identifier = f"ip:{ip_address}"
        await self._limiter.check_and_raise(identifier, self._limit)


class AgentQueryRateLimiter:
    """Rate limiter specifically for agent query endpoints."""

    def __init__(self, rate_limiter: RateLimiter) -> None:
        """
        Initialize agent query rate limiter.

        Args:
            rate_limiter: RateLimiter instance
        """
        self._limiter = rate_limiter
        self._limit = settings.AGENT_QUERY_LIMIT

    async def check_query_limit(self, user_id: str) -> tuple[bool, int, int]:
        """
        Check rate limit for agent queries.

        Args:
            user_id: User ID

        Returns:
            Tuple of (is_allowed, current_count, remaining)
        """
        identifier = f"agent_query:{user_id}"
        return await self._limiter.check_rate_limit(identifier, self._limit)

    async def check_and_raise(self, user_id: str) -> None:
        """
        Check agent query rate limit and raise exception if exceeded.

        Args:
            user_id: User ID

        Raises:
            RateLimitError: If rate limit is exceeded
        """
        identifier = f"agent_query:{user_id}"
        await self._limiter.check_and_raise(identifier, self._limit)


async def get_rate_limiter() -> RateLimiter:
    """
    Dependency injection function for FastAPI.

    Returns:
        RateLimiter instance
    """
    redis_client = await get_redis_client()
    return RateLimiter(redis_client)


async def get_user_rate_limiter() -> UserRateLimiter:
    """
    Dependency injection function for FastAPI.

    Returns:
        UserRateLimiter instance
    """
    rate_limiter = await get_rate_limiter()
    return UserRateLimiter(rate_limiter)


async def get_ip_rate_limiter() -> IPRateLimiter:
    """
    Dependency injection function for FastAPI.

    Returns:
        IPRateLimiter instance
    """
    rate_limiter = await get_rate_limiter()
    return IPRateLimiter(rate_limiter)


async def get_agent_query_rate_limiter() -> AgentQueryRateLimiter:
    """
    Dependency injection function for FastAPI.

    Returns:
        AgentQueryRateLimiter instance
    """
    rate_limiter = await get_rate_limiter()
    return AgentQueryRateLimiter(rate_limiter)
