"""Vector operations for Qdrant vector database."""

import logging
import uuid
from typing import Any, Optional

from qdrant_client.http import models
from qdrant_client.http.exceptions import UnexpectedResponse

from app.core.exceptions import ExternalServiceError, ValidationError
from app.vector_store.qdrant_client import QdrantClientWrapper

logger = logging.getLogger(__name__)


class VectorOperations:
    """Handles vector operations for Qdrant database."""

    def __init__(self, qdrant_client: QdrantClientWrapper) -> None:
        """
        Initialize vector operations.

        Args:
            qdrant_client: QdrantClientWrapper instance
        """
        self.qdrant_client = qdrant_client
        self.collection_name = qdrant_client.collection_name

    def upsert_vector(
        self,
        vector: list[float],
        payload: dict[str, Any],
        point_id: Optional[str] = None,
        collection_name: Optional[str] = None,
    ) -> str:
        """
        Insert or update a single vector in the collection.

        Args:
            vector: The embedding vector
            payload: Metadata associated with the vector
            point_id: Optional point ID (generates UUID if not provided)
            collection_name: Collection name (defaults to self.collection_name)

        Returns:
            The point ID of the upserted vector

        Raises:
            ValidationError: If vector or payload is invalid
            ExternalServiceError: If upsert operation fails
        """
        collection = collection_name or self.collection_name

        # Validate inputs
        if not vector or not isinstance(vector, list):
            raise ValidationError(
                message="Vector must be a non-empty list",
                details={"vector_length": len(vector) if vector else 0},
            )

        if not payload or not isinstance(payload, dict):
            raise ValidationError(
                message="Payload must be a non-empty dictionary",
            )

        # Generate point ID if not provided
        if point_id is None:
            point_id = str(uuid.uuid4())

        try:
            self.qdrant_client.client.upsert(
                collection_name=collection,
                points=[
                    models.PointStruct(
                        id=point_id,
                        vector=vector,
                        payload=payload,
                    )
                ],
            )
            logger.info(f"Upserted vector with ID: {point_id} to collection: {collection}")
            return point_id

        except UnexpectedResponse as e:
            logger.error(f"Failed to upsert vector: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Failed to upsert vector: {str(e)}",
                details={"collection": collection, "point_id": point_id},
            )
        except Exception as e:
            logger.error(f"Unexpected error upserting vector: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Unexpected error: {str(e)}",
                details={"collection": collection, "point_id": point_id},
            )

    def upsert_vectors_batch(
        self,
        vectors: list[list[float]],
        payloads: list[dict[str, Any]],
        point_ids: Optional[list[str]] = None,
        collection_name: Optional[str] = None,
        batch_size: int = 100,
    ) -> list[str]:
        """
        Insert or update multiple vectors in batches for efficiency.

        Args:
            vectors: List of embedding vectors
            payloads: List of metadata dictionaries
            point_ids: Optional list of point IDs (generates UUIDs if not provided)
            collection_name: Collection name (defaults to self.collection_name)
            batch_size: Number of vectors to upsert per batch (default: 100)

        Returns:
            List of point IDs of the upserted vectors

        Raises:
            ValidationError: If inputs are invalid
            ExternalServiceError: If batch upsert operation fails
        """
        collection = collection_name or self.collection_name

        # Validate inputs
        if not vectors or not isinstance(vectors, list):
            raise ValidationError(message="Vectors must be a non-empty list")

        if not payloads or not isinstance(payloads, list):
            raise ValidationError(message="Payloads must be a non-empty list")

        if len(vectors) != len(payloads):
            raise ValidationError(
                message="Vectors and payloads must have the same length",
                details={"vectors_count": len(vectors), "payloads_count": len(payloads)},
            )

        # Generate point IDs if not provided
        if point_ids is None:
            point_ids = [str(uuid.uuid4()) for _ in range(len(vectors))]
        elif len(point_ids) != len(vectors):
            raise ValidationError(
                message="Point IDs must have the same length as vectors",
                details={"point_ids_count": len(point_ids), "vectors_count": len(vectors)},
            )

        try:
            # Process in batches
            total_vectors = len(vectors)
            all_point_ids = []

            for i in range(0, total_vectors, batch_size):
                batch_end = min(i + batch_size, total_vectors)
                batch_vectors = vectors[i:batch_end]
                batch_payloads = payloads[i:batch_end]
                batch_point_ids = point_ids[i:batch_end]

                # Create points for this batch
                points = [
                    models.PointStruct(
                        id=point_id,
                        vector=vector,
                        payload=payload,
                    )
                    for point_id, vector, payload in zip(
                        batch_point_ids, batch_vectors, batch_payloads
                    )
                ]

                # Upsert batch
                self.qdrant_client.client.upsert(
                    collection_name=collection,
                    points=points,
                )

                all_point_ids.extend(batch_point_ids)
                logger.info(
                    f"Upserted batch {i // batch_size + 1}: "
                    f"{len(points)} vectors to collection: {collection}"
                )

            logger.info(
                f"Successfully upserted {total_vectors} vectors in "
                f"{(total_vectors + batch_size - 1) // batch_size} batches"
            )
            return all_point_ids

        except UnexpectedResponse as e:
            logger.error(f"Failed to upsert vectors batch: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Failed to upsert vectors batch: {str(e)}",
                details={"collection": collection, "total_vectors": len(vectors)},
            )
        except Exception as e:
            logger.error(f"Unexpected error upserting vectors batch: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Unexpected error: {str(e)}",
                details={"collection": collection, "total_vectors": len(vectors)},
            )

    def search_vectors(
        self,
        query_vector: list[float],
        limit: int = 5,
        score_threshold: Optional[float] = None,
        filter_conditions: Optional[dict[str, Any]] = None,
        collection_name: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """
        Search for similar vectors in the collection.

        Args:
            query_vector: The query embedding vector
            limit: Maximum number of results to return (default: 5)
            score_threshold: Minimum similarity score (optional)
            filter_conditions: Qdrant filter conditions (optional)
            collection_name: Collection name (defaults to self.collection_name)

        Returns:
            List of search results with id, score, and payload

        Raises:
            ValidationError: If query vector is invalid
            ExternalServiceError: If search operation fails
        """
        collection = collection_name or self.collection_name

        # Validate query vector
        if not query_vector or not isinstance(query_vector, list):
            raise ValidationError(
                message="Query vector must be a non-empty list",
                details={"vector_length": len(query_vector) if query_vector else 0},
            )

        try:
            # Build search request
            search_params = {
                "collection_name": collection,
                "query": query_vector,  # Use 'query' parameter for new API
                "limit": limit,
                "with_payload": True,
                "with_vectors": False,
            }

            if score_threshold is not None:
                search_params["score_threshold"] = score_threshold

            if filter_conditions:
                search_params["query_filter"] = models.Filter(**filter_conditions)

            # Perform search using query_points (correct Qdrant API method)
            search_results = self.qdrant_client.client.query_points(**search_params)

            # Format results - handle query_points response format
            if hasattr(search_results, 'points'):
                # query_points returns QueryResponse with points attribute
                points = search_results.points
            else:
                # Fallback for direct list
                points = search_results

            results = [
                {
                    "id": str(result.id),
                    "score": result.score,
                    "payload": result.payload,
                }
                for result in points
            ]

            logger.info(
                f"Search completed: found {len(results)} results "
                f"(limit={limit}, threshold={score_threshold})"
            )
            return results

        except UnexpectedResponse as e:
            logger.error(f"Failed to search vectors: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Failed to search vectors: {str(e)}",
                details={"collection": collection, "limit": limit},
            )
        except Exception as e:
            logger.error(f"Unexpected error searching vectors: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Unexpected error: {str(e)}",
                details={"collection": collection, "limit": limit},
            )

    def delete_vector(
        self,
        point_id: str,
        collection_name: Optional[str] = None,
    ) -> bool:
        """
        Delete a single vector from the collection.

        Args:
            point_id: The ID of the point to delete
            collection_name: Collection name (defaults to self.collection_name)

        Returns:
            True if deletion was successful

        Raises:
            ValidationError: If point_id is invalid
            ExternalServiceError: If delete operation fails
        """
        collection = collection_name or self.collection_name

        if not point_id:
            raise ValidationError(message="Point ID must not be empty")

        try:
            self.qdrant_client.client.delete(
                collection_name=collection,
                points_selector=models.PointIdsList(
                    points=[point_id],
                ),
            )
            logger.info(f"Deleted vector with ID: {point_id} from collection: {collection}")
            return True

        except UnexpectedResponse as e:
            logger.error(f"Failed to delete vector: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Failed to delete vector: {str(e)}",
                details={"collection": collection, "point_id": point_id},
            )
        except Exception as e:
            logger.error(f"Unexpected error deleting vector: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Unexpected error: {str(e)}",
                details={"collection": collection, "point_id": point_id},
            )

    def delete_vectors_batch(
        self,
        point_ids: list[str],
        collection_name: Optional[str] = None,
    ) -> bool:
        """
        Delete multiple vectors from the collection.

        Args:
            point_ids: List of point IDs to delete
            collection_name: Collection name (defaults to self.collection_name)

        Returns:
            True if deletion was successful

        Raises:
            ValidationError: If point_ids is invalid
            ExternalServiceError: If batch delete operation fails
        """
        collection = collection_name or self.collection_name

        if not point_ids or not isinstance(point_ids, list):
            raise ValidationError(message="Point IDs must be a non-empty list")

        try:
            self.qdrant_client.client.delete(
                collection_name=collection,
                points_selector=models.PointIdsList(
                    points=point_ids,
                ),
            )
            logger.info(
                f"Deleted {len(point_ids)} vectors from collection: {collection}"
            )
            return True

        except UnexpectedResponse as e:
            logger.error(f"Failed to delete vectors batch: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Failed to delete vectors batch: {str(e)}",
                details={"collection": collection, "count": len(point_ids)},
            )
        except Exception as e:
            logger.error(f"Unexpected error deleting vectors batch: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Unexpected error: {str(e)}",
                details={"collection": collection, "count": len(point_ids)},
            )

    def delete_vectors_by_filter(
        self,
        filter_conditions: dict[str, Any],
        collection_name: Optional[str] = None,
    ) -> bool:
        """
        Delete vectors matching filter conditions.

        Args:
            filter_conditions: Qdrant filter conditions
            collection_name: Collection name (defaults to self.collection_name)

        Returns:
            True if deletion was successful

        Raises:
            ValidationError: If filter_conditions is invalid
            ExternalServiceError: If delete operation fails
        """
        collection = collection_name or self.collection_name

        if not filter_conditions or not isinstance(filter_conditions, dict):
            raise ValidationError(message="Filter conditions must be a non-empty dictionary")

        try:
            self.qdrant_client.client.delete(
                collection_name=collection,
                points_selector=models.FilterSelector(
                    filter=models.Filter(**filter_conditions)
                ),
            )
            logger.info(f"Deleted vectors by filter from collection: {collection}")
            return True

        except UnexpectedResponse as e:
            logger.error(f"Failed to delete vectors by filter: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Failed to delete vectors by filter: {str(e)}",
                details={"collection": collection},
            )
        except Exception as e:
            logger.error(f"Unexpected error deleting vectors by filter: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Unexpected error: {str(e)}",
                details={"collection": collection},
            )

    def get_vector(
        self,
        point_id: str,
        collection_name: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Retrieve a single vector by ID.

        Args:
            point_id: The ID of the point to retrieve
            collection_name: Collection name (defaults to self.collection_name)

        Returns:
            Dictionary with id, vector, and payload, or None if not found

        Raises:
            ValidationError: If point_id is invalid
            ExternalServiceError: If retrieve operation fails
        """
        collection = collection_name or self.collection_name

        if not point_id:
            raise ValidationError(message="Point ID must not be empty")

        try:
            points = self.qdrant_client.client.retrieve(
                collection_name=collection,
                ids=[point_id],
                with_vectors=True,
            )

            if not points:
                logger.info(f"Vector with ID {point_id} not found in collection: {collection}")
                return None

            point = points[0]
            return {
                "id": str(point.id),
                "vector": point.vector,
                "payload": point.payload,
            }

        except UnexpectedResponse as e:
            logger.error(f"Failed to retrieve vector: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Failed to retrieve vector: {str(e)}",
                details={"collection": collection, "point_id": point_id},
            )
        except Exception as e:
            logger.error(f"Unexpected error retrieving vector: {e}")
            raise ExternalServiceError(
                service="Qdrant",
                message=f"Unexpected error: {str(e)}",
                details={"collection": collection, "point_id": point_id},
            )
