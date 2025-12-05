"""Redis client for caching and session management."""

import logging
from typing import Optional

import redis.asyncio as redis
from redis.asyncio import Redis
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Async Redis client wrapper with connection management and health checks."""

    def __init__(self) -> None:
        """Initialize Redis client (connection created on first use)."""
        self._client: Optional[Redis] = None
        self._url = settings.REDIS_URL
        self._max_connections = settings.REDIS_MAX_CONNECTIONS

    async def connect(self) -> None:
        """Establish connection to Redis server."""
        if self._client is not None:
            logger.warning("Redis client already connected")
            return

        try:
            self._client = await redis.from_url(
                self._url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=self._max_connections,
            )
            logger.info(f"Connected to Redis at {self._url}")

            # Test connection
            await self._client.ping()
            logger.info("Redis connection verified with PING")

        except RedisConnectionError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error connecting to Redis: {e}")
            raise

    async def disconnect(self) -> None:
        """Close Redis connection gracefully."""
        if self._client is None:
            logger.warning("Redis client not connected")
            return

        try:
            await self._client.close()
            await self._client.connection_pool.disconnect()
            self._client = None
            logger.info("Disconnected from Redis")
        except Exception as e:
            logger.error(f"Error disconnecting from Redis: {e}")
            raise

    async def health_check(self) -> bool:
        """
        Check Redis connection health.

        Returns:
            bool: True if Redis is healthy, False otherwise
        """
        if self._client is None:
            logger.warning("Redis client not initialized")
            return False

        try:
            response = await self._client.ping()
            if response:
                logger.debug("Redis health check passed")
                return True
            else:
                logger.warning("Redis health check failed: PING returned False")
                return False
        except RedisError as e:
            logger.error(f"Redis health check failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during Redis health check: {e}")
            return False

    @property
    def client(self) -> Redis:
        """
        Get the Redis client instance.

        Returns:
            Redis: The Redis client instance

        Raises:
            RuntimeError: If client is not connected
        """
        if self._client is None:
            raise RuntimeError(
                "Redis client not connected. Call connect() first."
            )
        return self._client

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()


# Global Redis client instance
redis_client = RedisClient()


async def get_redis_client() -> Redis:
    """
    Dependency injection function for FastAPI.

    Returns:
        Redis: Connected Redis client instance

    Raises:
        RuntimeError: If Redis client is not connected
    """
    return redis_client.client
