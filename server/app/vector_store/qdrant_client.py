"""Qdrant client for vector database operations."""

import logging
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.exceptions import UnexpectedResponse

from app.core.config import settings
from app.core.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)


class QdrantClientWrapper:
    """Wrapper for Qdrant client with connection management and health checks."""

    def __init__(
        self,
        url: Optional[str] = None,
        api_key: Optional[str] = None,
        collection_name: Optional[str] = None,
    ) -> None:
        """
        Initialize Qdrant client wrapper.

        Args:
            url: Qdrant server URL (defaults to settings.QDRANT_URL)
            api_key: Qdrant API key (defaults to settings.QDRANT_API_KEY)
            collection_name: Default collection name (defaults to settings.QDRANT_COLLECTION)
        """
        self.url = url or settings.QDRANT_URL
        self.api_key = api_key or settings.QDRANT_API_KEY
        self.collection_name = collection_name or settings.QDRANT_COLLECTION
        self._client: Optional[QdrantClient] = None

        logger.info(f"Initializing Qdrant client for URL: {self.url}")

    @property
    def client(self) -> QdrantClient:
        """
        Get or create Qdrant client instance.

        Returns:
            QdrantClient instance

        Raises:
            ExternalServiceError: If client initialization fails
        """
        if self._client is None:
            try:
                self._client = QdrantClient(
                    url=self.url,
                    api_key=self.api_key,
                    timeout=30,
                )
                logger.info("Qdrant client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Qdrant client: {e}")
                raise ExternalServiceError(
                    service="Qdrant",
                    message=f"Failed to initialize client: {str(e)}",
                    details={"url": self.url},
                )
        return self._client

    async def health_check(self) -> bool:
        """
        Check if Qdrant service is healthy and accessible.

        Returns:
            True if service is healthy, False otherwise
        """
        try:
            # Try to get collections list as a health check
            collections = self.client.get_collections()
            logger.info(f"Qdrant health check passed. Collections: {len(collections.collections)}")
            return True
        except UnexpectedResponse as e:
            logger.error(f"Qdrant health check failed with unexpected response: {e}")
            return False
        except Exception as e:
            logger.error(f"Qdrant health check failed: {e}")
            return False

    def ensure_collection_exists(
        self,
        collection_name: Optional[str] = None,
        vector_size: int = 1536,
        distance: models.Distance = models.Distance.COSINE,
    ) -> bool:
        """
        Ensure collection exists, create if it doesn't.

        Args:
            collection_name: Name of the collection (defaults to self.collection_name)
            vector_size: Size of the vectors (default: 1536 for OpenAI ada-002/text-embedding-3-small)
            distance: Distance metric (default: COSINE)

        Returns:
            True if collection exists or was created successfully

        Raises:
            ExternalServiceError: If collection creation fails
        """
        collection = collection_name or self.collection_name

        try:
            # Check if collection exists
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]

            if collection in collection_names:
                logger.info(f"Collection '{collection}' already exists")
                return True

            # Create collection
            self.client.create_collection(
                collection_name=collection,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=distance,
                ),
            )
            logger.info(
                f"Collection '{collection}' created successfully "
                f"(vector_size={vector_size}, distance={distance})"
            )
            return True

        except UnexpectedResponse as e:
            logger.error(f"Failed to ensure collection exists: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Failed to ensure collection exists: {str(e)}",
                details={"collection": collection},
            )
        except Exception as e:
            logger.error(f"Unexpected error ensuring collection exists: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Unexpected error: {str(e)}",
                details={"collection": collection},
            )

    def get_collection_info(self, collection_name: Optional[str] = None) -> dict:
        """
        Get information about a collection.

        Args:
            collection_name: Name of the collection (defaults to self.collection_name)

        Returns:
            Dictionary with collection information

        Raises:
            ExternalServiceError: If operation fails
        """
        collection = collection_name or self.collection_name

        try:
            info = self.client.get_collection(collection_name=collection)
            return {
                "name": collection,
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": info.status,
                "config": {
                    "vector_size": info.config.params.vectors.size,
                    "distance": info.config.params.vectors.distance.value,
                },
            }
        except UnexpectedResponse as e:
            logger.error(f"Failed to get collection info: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Failed to get collection info: {str(e)}",
                details={"collection": collection},
            )
        except Exception as e:
            logger.error(f"Unexpected error getting collection info: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Unexpected error: {str(e)}",
                details={"collection": collection},
            )

    def delete_collection(self, collection_name: Optional[str] = None) -> bool:
        """
        Delete a collection.

        Args:
            collection_name: Name of the collection (defaults to self.collection_name)

        Returns:
            True if collection was deleted successfully

        Raises:
            ExternalServiceError: If operation fails
        """
        collection = collection_name or self.collection_name

        try:
            self.client.delete_collection(collection_name=collection)
            logger.info(f"Collection '{collection}' deleted successfully")
            return True
        except UnexpectedResponse as e:
            logger.error(f"Failed to delete collection: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Failed to delete collection: {str(e)}",
                details={"collection": collection},
            )
        except Exception as e:
            logger.error(f"Unexpected error deleting collection: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Unexpected error: {str(e)}",
                details={"collection": collection},
            )

    def close(self) -> None:
        """Close the Qdrant client connection."""
        if self._client is not None:
            try:
                self._client.close()
                logger.info("Qdrant client connection closed")
            except Exception as e:
                logger.warning(f"Error closing Qdrant client: {e}")
            finally:
                self._client = None


# Global Qdrant client instance
_qdrant_client: Optional[QdrantClientWrapper] = None


def get_qdrant_client() -> QdrantClientWrapper:
    """
    Get or create global Qdrant client instance.

    Returns:
        QdrantClientWrapper instance
    """
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClientWrapper()
    return _qdrant_client


def close_qdrant_client() -> None:
    """Close the global Qdrant client instance."""
    global _qdrant_client
    if _qdrant_client is not None:
        _qdrant_client.close()
        _qdrant_client = None
