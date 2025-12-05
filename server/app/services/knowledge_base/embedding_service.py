"""Embedding service for generating vector embeddings from text."""

import logging
from typing import List, Optional, Dict, Any

from app.integrations.openai_client import OpenAIClient, get_openai_client
from app.core.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating embeddings from text using OpenAI."""

    def __init__(
        self,
        openai_client: Optional[OpenAIClient] = None,
        batch_size: int = 100,
        embedding_model: Optional[str] = None
    ):
        """
        Initialize embedding service.

        Args:
            openai_client: OpenAI client instance (uses global if not provided)
            batch_size: Number of texts to process per batch
            embedding_model: Embedding model to use (defaults to client default)
        """
        self.openai_client = openai_client or get_openai_client()
        self.batch_size = batch_size
        self.embedding_model = embedding_model

    async def generate_embedding(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed
            metadata: Optional metadata (for logging/tracking)

        Returns:
            Embedding vector as list of floats

        Raises:
            ExternalServiceError: If embedding generation fails
        """
        try:
            text_preview = text[:100] + "..." if len(text) > 100 else text
            logger.info("Generating embedding for text (length: %d): '%s'", len(text), text_preview)

            embedding = await self.openai_client.generate_embedding(
                text=text,
                model=self.embedding_model
            )

            logger.info("Successfully generated embedding (dimension: %d)", len(embedding))
            return embedding

        except ExternalServiceError as e:
            logger.error("Failed to generate embedding: %s", str(e))
            raise

        except Exception as e:
            logger.error("Unexpected error generating embedding: %s", str(e))
            raise ExternalServiceError(f"Embedding generation failed: {e}") from e

    async def generate_embeddings_batch(
        self,
        texts: List[str],
        metadata: Optional[List[Dict[str, Any]]] = None
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in batches.

        Args:
            texts: List of texts to embed
            metadata: Optional list of metadata dicts (one per text)

        Returns:
            List of embedding vectors

        Raises:
            ExternalServiceError: If embedding generation fails
        """
        if not texts:
            logger.warning("Empty text list provided for batch embedding")
            return []

        try:
            logger.info(
                "Generating embeddings for %d texts (batch_size: %d)",
                len(texts),
                self.batch_size
            )

            embeddings = await self.openai_client.generate_embeddings_batch(
                texts=texts,
                model=self.embedding_model,
                batch_size=self.batch_size
            )

            logger.info(
                "Successfully generated %d embeddings (dimension: %d)",
                len(embeddings),
                len(embeddings[0]) if embeddings else 0
            )

            return embeddings

        except ExternalServiceError as e:
            logger.error("Failed to generate batch embeddings: %s", str(e))
            raise

        except Exception as e:
            logger.error("Unexpected error generating batch embeddings: %s", str(e))
            raise ExternalServiceError(f"Batch embedding generation failed: {e}") from e

    async def generate_embeddings_with_retry(
        self,
        texts: List[str],
        max_retries: int = 3
    ) -> List[List[float]]:
        """
        Generate embeddings with automatic retry on failure.

        This method provides additional retry logic on top of the
        OpenAI client's built-in retry mechanism.

        Args:
            texts: List of texts to embed
            max_retries: Maximum number of retry attempts

        Returns:
            List of embedding vectors

        Raises:
            ExternalServiceError: If all retry attempts fail
        """
        last_error = None

        for attempt in range(max_retries):
            try:
                return await self.generate_embeddings_batch(texts)

            except ExternalServiceError as e:
                last_error = e
                logger.warning(
                    "Embedding generation attempt %d/%d failed: %s",
                    attempt + 1,
                    max_retries,
                    str(e)
                )

                if attempt < max_retries - 1:
                    # Continue to next attempt
                    continue
                else:
                    # Final attempt failed
                    break

        # All retries exhausted
        logger.error("All embedding generation attempts failed")
        raise ExternalServiceError(
            f"Failed to generate embeddings after {max_retries} attempts: {last_error}"
        )

    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of embeddings produced by the current model.

        Returns:
            Embedding dimension size

        Note:
            This is a static mapping. For dynamic detection, generate
            a test embedding.
        """
        # Common OpenAI embedding dimensions
        model_dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
        }

        model = self.embedding_model or self.openai_client.embedding_model
        return model_dimensions.get(model, 1536)  # Default to 1536

    async def health_check(self) -> bool:
        """
        Check if embedding service is operational.

        Returns:
            True if service is healthy, False otherwise
        """
        try:
            # Generate a test embedding
            test_embedding = await self.generate_embedding("test")
            return len(test_embedding) > 0

        except Exception as e:
            logger.error("Embedding service health check failed: %s", str(e))
            return False


# Global service instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """
    Get or create global embedding service instance.

    Returns:
        EmbeddingService instance
    """
    global _embedding_service  # pylint: disable=global-statement
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
