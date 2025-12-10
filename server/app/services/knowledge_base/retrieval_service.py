"""Retrieval service for semantic search with reranking and relevance scoring."""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from app.vector_store.vector_operations import VectorOperations
from app.services.knowledge_base.embedding_service import EmbeddingService, get_embedding_service
from app.vector_store.qdrant_client import get_qdrant_client
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Represents a search result with relevance information."""

    document_id: str
    chunk_index: int
    text: str
    score: float
    reranked_score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert search result to dictionary."""
        return {
            "document_id": self.document_id,
            "chunk_index": self.chunk_index,
            "text": self.text,
            "score": self.score,
            "reranked_score": self.reranked_score,
            "metadata": self.metadata or {}
        }


class RetrievalService:
    """Service for semantic search and retrieval from knowledge base."""

    def __init__(
        self,
        vector_operations: Optional[VectorOperations] = None,
        embedding_service: Optional[EmbeddingService] = None,
        default_limit: int = 5,
        score_threshold: float = 0.5
    ):
        """
        Initialize retrieval service.

        Args:
            vector_operations: Vector operations instance
            embedding_service: Embedding service instance
            default_limit: Default number of results to return
            score_threshold: Minimum similarity score threshold (0.5 is more permissive)
        """
        if vector_operations is None:
            qdrant_client = get_qdrant_client()
            vector_operations = VectorOperations(qdrant_client)

        self.vector_operations = vector_operations
        self.embedding_service = embedding_service or get_embedding_service()
        self.default_limit = default_limit
        self.score_threshold = score_threshold

    async def search(
        self,
        query: str,
        limit: Optional[int] = None,
        score_threshold: Optional[float] = None,
        filter_conditions: Optional[Dict[str, Any]] = None,
        rerank: bool = True
    ) -> List[SearchResult]:
        """
        Perform semantic search in knowledge base.

        Args:
            query: Search query text
            limit: Maximum number of results (defaults to default_limit)
            score_threshold: Minimum similarity score (defaults to instance threshold)
            filter_conditions: Optional Qdrant filter conditions
            rerank: Whether to apply reranking (default: True)

        Returns:
            List of search results ordered by relevance

        Raises:
            ValidationError: If query is invalid
        """
        if not query or not query.strip():
            raise ValidationError(message="Query cannot be empty")

        limit = limit or self.default_limit
        score_threshold = score_threshold or self.score_threshold

        logger.info(
            "Performing semantic search (query_length: %d, limit: %d, threshold: %.2f)",
            len(query),
            limit,
            score_threshold
        )

        try:
            # Generate query embedding
            query_embedding = await self.embedding_service.generate_embedding(query)

            # Search in vector store
            # Request more results if reranking to have candidates
            search_limit = limit * 2 if rerank else limit

            raw_results = self.vector_operations.search_vectors(
                query_vector=query_embedding,
                limit=search_limit,
                score_threshold=score_threshold,
                filter_conditions=filter_conditions
            )
            
            logger.info(
                "Vector search returned %d raw results (threshold: %.2f)",
                len(raw_results),
                score_threshold
            )

            # Convert to SearchResult objects
            search_results = [
                SearchResult(
                    document_id=result["payload"].get("document_id", ""),
                    chunk_index=result["payload"].get("chunk_index", 0),
                    text=result["payload"].get("text", ""),
                    score=result["score"],
                    metadata=result["payload"].get("metadata", {})
                )
                for result in raw_results
            ]

            # Log raw results before reranking
            logger.info("Raw vector search results (before reranking):")
            for i, result in enumerate(search_results[:5], 1):  # Log top 5
                logger.info(
                    f"  Raw Result {i}: score={result.score:.3f}, doc={result.document_id}, "
                    f"chunk={result.chunk_index}, text_preview={result.text[:100]}..."
                )

            # Apply reranking if requested
            if rerank and search_results:
                search_results = self._rerank_results(query, search_results)
                logger.info("After reranking:")
                for i, result in enumerate(search_results[:5], 1):  # Log top 5
                    rerank_score = result.reranked_score or result.score
                    logger.info(
                        f"  Reranked Result {i}: reranked_score={rerank_score:.3f}, "
                        f"original_score={result.score:.3f}, doc={result.document_id}"
                    )

            # Limit to requested number
            search_results = search_results[:limit]

            logger.info("Search completed: returning %d results", len(search_results))
            return search_results

        except Exception as e:
            logger.error("Search failed: %s", str(e))
            raise

    async def search_by_document(
        self,
        query: str,
        document_id: str,
        limit: Optional[int] = None,
        score_threshold: Optional[float] = None
    ) -> List[SearchResult]:
        """
        Search within a specific document.

        Args:
            query: Search query text
            document_id: ID of document to search within
            limit: Maximum number of results
            score_threshold: Minimum similarity score

        Returns:
            List of search results from the specified document
        """
        # Create filter for specific document
        filter_conditions = {
            "must": [
                {
                    "key": "document_id",
                    "match": {"value": document_id}
                }
            ]
        }

        return await self.search(
            query=query,
            limit=limit,
            score_threshold=score_threshold,
            filter_conditions=filter_conditions
        )

    async def search_by_user(
        self,
        query: str,
        user_id: str,
        limit: Optional[int] = None,
        score_threshold: Optional[float] = None
    ) -> List[SearchResult]:
        """
        Search within documents owned by a specific user.

        Args:
            query: Search query text
            user_id: ID of user whose documents to search
            limit: Maximum number of results
            score_threshold: Minimum similarity score

        Returns:
            List of search results from user's documents
        """
        # Create filter for user's documents
        filter_conditions = {
            "must": [
                {
                    "key": "user_id",
                    "match": {"value": user_id}
                }
            ]
        }

        return await self.search(
            query=query,
            limit=limit,
            score_threshold=score_threshold,
            filter_conditions=filter_conditions
        )

    def _rerank_results(
        self,
        query: str,
        results: List[SearchResult]
    ) -> List[SearchResult]:
        """
        Rerank search results using additional relevance scoring.

        This implementation uses a simple lexical overlap scoring.
        For production, consider using a cross-encoder model.

        Args:
            query: Original search query
            results: Initial search results

        Returns:
            Reranked list of search results
        """
        if not results:
            return results

        logger.info("Reranking %d search results", len(results))

        # Normalize query for comparison
        query_terms = set(query.lower().split())

        for result in results:
            # Calculate lexical overlap score
            text_terms = set(result.text.lower().split())
            overlap = len(query_terms & text_terms)
            total_terms = len(query_terms)

            # Lexical score (0-1)
            lexical_score = overlap / total_terms if total_terms > 0 else 0

            # Combine with semantic score (weighted average)
            # 70% semantic, 30% lexical
            reranked_score = (0.7 * result.score) + (0.3 * lexical_score)

            result.reranked_score = reranked_score

        # Sort by reranked score
        results.sort(key=lambda x: x.reranked_score or x.score, reverse=True)

        logger.info("Reranking completed")
        return results

    def calculate_relevance_score(
        self,
        query: str,
        text: str,
        semantic_score: float
    ) -> float:
        """
        Calculate comprehensive relevance score.

        Args:
            query: Search query
            text: Result text
            semantic_score: Semantic similarity score from vector search

        Returns:
            Combined relevance score
        """
        # Normalize inputs
        query_lower = query.lower()
        text_lower = text.lower()

        # Exact match bonus
        exact_match_bonus = 0.1 if query_lower in text_lower else 0

        # Length penalty (prefer concise results)
        length_penalty = min(1.0, 500 / len(text)) * 0.05

        # Calculate final score
        relevance_score = semantic_score + exact_match_bonus + length_penalty

        return min(1.0, relevance_score)  # Cap at 1.0

    async def get_similar_chunks(
        self,
        document_id: str,
        chunk_index: int,
        limit: int = 3
    ) -> List[SearchResult]:
        """
        Get chunks similar to a specific chunk (for context expansion).

        Args:
            document_id: Document ID
            chunk_index: Index of the reference chunk
            limit: Number of similar chunks to retrieve

        Returns:
            List of similar chunks
        """
        # First, retrieve the reference chunk
        filter_conditions = {
            "must": [
                {
                    "key": "document_id",
                    "match": {"value": document_id}
                },
                {
                    "key": "chunk_index",
                    "match": {"value": chunk_index}
                }
            ]
        }

        # Get the reference chunk's embedding by searching with high limit
        reference_results = self.vector_operations.search_vectors(
            query_vector=[0.0] * 1536,  # Dummy vector, we'll use filter
            limit=1,
            filter_conditions=filter_conditions
        )

        if not reference_results:
            logger.warning(
                "Reference chunk not found (document_id: %s, chunk_index: %d)",
                document_id,
                chunk_index
            )
            return []

        # Use the reference chunk's text as query
        reference_text = reference_results[0]["payload"].get("text", "")

        # Search for similar chunks in the same document
        return await self.search_by_document(
            query=reference_text,
            document_id=document_id,
            limit=limit + 1  # +1 to exclude the reference chunk itself
        )


# Global service instance
_retrieval_service: Optional[RetrievalService] = None


def get_retrieval_service() -> RetrievalService:
    """
    Get or create global retrieval service instance.

    Returns:
        RetrievalService instance
    """
    global _retrieval_service  # pylint: disable=global-statement
    if _retrieval_service is None:
        _retrieval_service = RetrievalService()
    return _retrieval_service
