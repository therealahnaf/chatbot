"""Knowledge base orchestration service coordinating document operations."""

import hashlib
import logging
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.repositories.document_repository import DocumentRepository
from app.services.knowledge_base.document_processor import (
    DocumentProcessor,
    DocumentChunk,
)
from app.services.knowledge_base.embedding_service import (
    EmbeddingService,
    get_embedding_service,
)
from app.services.knowledge_base.retrieval_service import (
    RetrievalService,
    SearchResult,
    get_retrieval_service,
)
from app.vector_store.vector_operations import VectorOperations
from app.vector_store.qdrant_client import get_qdrant_client
from app.core.exceptions import ValidationError, ResourceNotFoundError
from app.core.config import settings

logger = logging.getLogger(__name__)


class KnowledgeBaseService:
    """Orchestrates knowledge base operations: upload, processing, search, and deletion."""

    # Supported file types
    SUPPORTED_FILE_TYPES = {".pdf", ".txt", ".docx", ".doc", ".md", ".markdown"}

    # Maximum file size (50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024

    def __init__(
        self,
        db: AsyncSession,
        document_processor: Optional[DocumentProcessor] = None,
        embedding_service: Optional[EmbeddingService] = None,
        retrieval_service: Optional[RetrievalService] = None,
        vector_operations: Optional[VectorOperations] = None,
    ):
        """
        Initialize knowledge base service.

        Args:
            db: Database session
            document_processor: Document processor instance
            embedding_service: Embedding service instance
            retrieval_service: Retrieval service instance
            vector_operations: Vector operations instance
        """
        self.db = db
        self.document_repo = DocumentRepository(db)
        self.document_processor = document_processor or DocumentProcessor(
            chunk_size=settings.KB_CHUNK_SIZE,
            chunk_overlap=settings.KB_CHUNK_OVERLAP,
            chunking_strategy=settings.KB_CHUNKING_STRATEGY,
        )
        self.embedding_service = embedding_service or get_embedding_service()
        self.retrieval_service = retrieval_service or get_retrieval_service()

        if vector_operations is None:
            qdrant_client = get_qdrant_client()
            # Ensure collection exists on initialization
            qdrant_client.ensure_collection_exists()
            vector_operations = VectorOperations(qdrant_client)
        self.vector_operations = vector_operations

    def _compute_file_hash(self, file_content: bytes) -> str:
        """
        Compute SHA256 hash of file content for duplicate detection.

        Args:
            file_content: Raw file bytes

        Returns:
            Hexadecimal hash string
        """
        sha256_hash = hashlib.sha256(file_content).hexdigest()
        logger.debug("Computed file hash: %s", sha256_hash)
        return sha256_hash

    async def check_duplicate_file(self, file_hash: str, user_id: UUID) -> Optional[Document]:
        """
        Check if a file with the same hash already exists for this user.

        Args:
            file_hash: SHA256 hash of the file
            user_id: User ID to check against

        Returns:
            Existing document if duplicate found, None otherwise
        """
        # Query for existing document with same hash for this user
        from sqlalchemy import select
        from app.models.document import Document

        stmt = select(Document).where(
            Document.file_hash == file_hash,
            Document.user_id == user_id
        )
        result = await self.db.execute(stmt)
        existing_doc = result.scalar_one_or_none()

        if existing_doc:
            logger.info(
                "Duplicate file detected (hash: %s, existing_doc_id: %s)",
                file_hash,
                existing_doc.id
            )

        return existing_doc

    async def upload_document(
        self,
        user_id: UUID,
        title: str,
        filename: str,
        file_content: bytes,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Document, bool]:
        """
        Upload and process a document with duplicate detection.

        Args:
            user_id: ID of user uploading the document
            title: Document title
            filename: Name of the file
            file_content: Raw file bytes
            metadata: Optional metadata to attach

        Returns:
            Tuple of (document, is_duplicate)
            - document: Created or existing document record
            - is_duplicate: True if file already exists, False if newly created

        Raises:
            ValidationError: If file is invalid
        """
        # Validate file
        self._validate_file(filename, file_content)

        # Compute file hash for duplicate detection
        file_hash = self._compute_file_hash(file_content)

        # Check for duplicate
        existing_doc = await self.check_duplicate_file(file_hash, user_id)
        if existing_doc:
            logger.info(
                "Duplicate file found (user_id: %s, filename: %s, existing_doc: %s)",
                user_id,
                filename,
                existing_doc.id
            )
            return existing_doc, True

        logger.info(
            "Uploading new document (user_id: %s, filename: %s, size: %d, hash: %s)",
            user_id,
            filename,
            len(file_content),
            file_hash
        )

        try:
            # Extract file extension
            file_ext = Path(filename).suffix.lower()
            doc_metadata = metadata or {}

            # Step 1: Create document record immediately with status='processing'
            document = await self.document_repo.create(
                obj_in={
                    "user_id": user_id,
                    "title": title,
                    "filename": filename,
                    "file_type": file_ext,
                    "file_size": len(file_content),
                    "file_hash": file_hash,
                    "status": "processing",
                    "chunk_count": 0,
                    "qdrant_collection": self.vector_operations.collection_name,
                    "doc_metadata": doc_metadata,
                }
            )

            logger.info("Document record created (id: %s, status: processing, hash: %s)", document.id, file_hash)

            # Step 2: Schedule async processing (use BackgroundTasks in API layer)
            # For now, we'll commit the document and let the caller handle background processing
            await self.db.commit()
            await self.db.refresh(document)

            # Return immediately with status='processing'
            # Note: Background processing will be triggered from the API layer
            return document, False

        except Exception as e:
            logger.error("Document upload failed: %s", str(e))
            raise

    async def get_document(self, document_id: UUID) -> Document:
        """
        Get document by ID.

        Args:
            document_id: Document ID

        Returns:
            Document record

        Raises:
            ResourceNotFoundError: If document not found
        """
        document = await self.document_repo.get(document_id)
        if not document:
            raise ResourceNotFoundError(
                resource="Document", resource_id=str(document_id)
            )
        return document

    async def list_documents(
        self,
        user_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        file_type: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = "desc",
    ) -> tuple[List[Document], int]:
        """
        List documents with pagination, search, filtering, and sorting.
        
        If user_id is None (admin access), returns all documents.
        If user_id is provided, returns only that user's documents.

        Args:
            user_id: User ID (None for admin to see all documents)
            skip: Number of records to skip
            limit: Maximum number of records
            search: Search term for title and filename
            file_type: Filter by file type
            status: Filter by status
            sort_by: Column to sort by
            sort_order: Sort order (asc/desc)

        Returns:
            Tuple of (documents list, total count)
        """
        if user_id is None:
            # Admin access: return all documents
            return await self.document_repo.get_all_documents(
                skip=skip,
                limit=limit,
                search=search,
                file_type=file_type,
                status=status,
                sort_by=sort_by,
                sort_order=sort_order,
            )
        else:
            # Regular user: return only their documents
            return await self.document_repo.get_by_user_id(
                user_id=user_id,
                skip=skip,
                limit=limit,
                search=search,
                file_type=file_type,
                status=status,
                sort_by=sort_by,
                sort_order=sort_order,
            )

    async def delete_document(self, document_id: UUID) -> bool:
        """
        Delete a document and its vectors.

        Args:
            document_id: Document ID

        Returns:
            True if deletion successful

        Raises:
            ResourceNotFoundError: If document not found
        """
        logger.info("Deleting document (id: %s)", document_id)

        # Get document
        document = await self.get_document(document_id)

        try:
            # Delete vectors from Qdrant
            filter_conditions = {
                "must": [{"key": "document_id", "match": {"value": str(document_id)}}]
            }

            self.vector_operations.delete_vectors_by_filter(
                filter_conditions=filter_conditions
            )

            logger.info("Deleted vectors for document (id: %s)", document_id)

            # Delete document record
            await self.document_repo.delete(document_id)

            logger.info("Document deleted successfully (id: %s)", document_id)
            return True

        except Exception as e:
            logger.error("Document deletion failed: %s", str(e))
            raise

    async def update_document_metadata(
        self, document_id: UUID, metadata: Dict[str, Any]
    ) -> Document:
        """
        Update document metadata.

        Args:
            document_id: Document ID
            metadata: New metadata

        Returns:
            Updated document

        Raises:
            ResourceNotFoundError: If document not found
        """
        # Verify document exists
        await self.get_document(document_id)

        # Update metadata
        updated_document = await self.document_repo.update(
            record_id=document_id, obj_in={"doc_metadata": metadata}
        )

        logger.info("Document metadata updated (id: %s)", document_id)
        return updated_document

    async def search(
        self,
        query: str,
        user_id: Optional[UUID] = None,
        document_id: Optional[UUID] = None,
        limit: int = 5,
        score_threshold: float = 0.7,
    ) -> List[SearchResult]:
        """
        Search in knowledge base.

        Args:
            query: Search query
            user_id: Optional user ID to filter by user's documents
            document_id: Optional document ID to search within
            limit: Maximum number of results
            score_threshold: Minimum similarity score

        Returns:
            List of search results
        """
        logger.info("=" * 60)
        logger.info("KNOWLEDGE BASE SEARCH INITIATED")
        logger.info("=" * 60)
        logger.info(
            "Search params: query='%s', user_id=%s, document_id=%s, limit=%d, score_threshold=%.2f",
            query,
            user_id,
            document_id,
            limit,
            score_threshold,
        )

        # Search based on filters
        if document_id:
            logger.info("Search mode: DOCUMENT-SPECIFIC (document_id=%s)", document_id)
            results = await self.retrieval_service.search_by_document(
                query=query,
                document_id=str(document_id),
                limit=limit,
                score_threshold=score_threshold,
            )
        elif user_id:
            logger.info("Search mode: USER-SPECIFIC (user_id=%s)", user_id)
            results = await self.retrieval_service.search_by_user(
                query=query,
                user_id=str(user_id),
                limit=limit,
                score_threshold=score_threshold,
            )
        else:
            logger.info("Search mode: GLOBAL (all documents)")
            results = await self.retrieval_service.search(
                query=query, limit=limit, score_threshold=score_threshold
            )

        logger.info("KB Search completed: found %d results", len(results))
        if results:
            logger.info("Top result: score=%.3f, doc=%s", results[0].score, results[0].document_id)
        logger.info("=" * 60)
        return results

    async def get_document_stats(self, user_id: UUID) -> Dict[str, Any]:
        """
        Get statistics about user's documents.

        Args:
            user_id: User ID

        Returns:
            Dictionary with statistics
        """
        documents = await self.list_documents(user_id=user_id, limit=1000)

        total_size = sum(doc.file_size or 0 for doc in documents)
        total_chunks = sum(doc.chunk_count for doc in documents)

        file_types = {}
        for doc in documents:
            file_type = doc.file_type or "unknown"
            file_types[file_type] = file_types.get(file_type, 0) + 1

        return {
            "total_documents": len(documents),
            "total_size_bytes": total_size,
            "total_chunks": total_chunks,
            "file_types": file_types,
        }

    def _validate_file(self, filename: str, file_content: bytes) -> None:
        """
        Validate file before processing.

        Args:
            filename: File name
            file_content: File bytes

        Raises:
            ValidationError: If file is invalid
        """
        # Check file extension
        file_ext = Path(filename).suffix.lower()
        if file_ext not in self.SUPPORTED_FILE_TYPES:
            raise ValidationError(
                message=f"Unsupported file type: {file_ext}",
                details={"supported_types": list(self.SUPPORTED_FILE_TYPES)},
            )

        # Check file size
        if len(file_content) > self.MAX_FILE_SIZE:
            raise ValidationError(
                message=f"File too large: {len(file_content)} bytes",
                details={
                    "max_size_bytes": self.MAX_FILE_SIZE,
                    "max_size_mb": self.MAX_FILE_SIZE / (1024 * 1024),
                },
            )

        # Check file is not empty
        if len(file_content) == 0:
            raise ValidationError(message="File is empty")

    async def process_document_background(
        self,
        document_id: UUID,
        user_id: UUID,
        file_content: bytes,
        filename: str,
        doc_metadata: Dict[str, Any],
        chunking_strategy: str = None,
        chunk_size: int = None,
        chunk_overlap: int = None,
    ) -> None:
        """
        Process document in background: chunk, embed, store vectors, and update status.

        This method creates its own database session for background processing.

        Args:
            document_id: Document ID
            user_id: User ID
            file_content: Raw file bytes
            filename: Filename
            doc_metadata: Document metadata
            chunking_strategy: Chunking strategy to use (overrides default)
            chunk_size: Chunk size in tokens (overrides default)
            chunk_overlap: Chunk overlap in tokens (overrides default)
        """
        # Import here to avoid circular imports
        from app.db.session import get_db_session
        
        try:
            logger.info("Starting background processing for document (id: %s)", document_id)

            # Add user_id to metadata
            doc_metadata["user_id"] = str(user_id)

            # Create document processor with custom parameters if provided
            if chunking_strategy is not None or chunk_size is not None or chunk_overlap is not None:
                # Use custom parameters (fallback to defaults if not provided)
                processor = DocumentProcessor(
                    chunk_size=chunk_size or settings.KB_CHUNK_SIZE,
                    chunk_overlap=chunk_overlap or settings.KB_CHUNK_OVERLAP,
                    chunking_strategy=chunking_strategy or settings.KB_CHUNKING_STRATEGY,
                )
                logger.info(
                    "Using custom chunking config (strategy: %s, size: %d, overlap: %d)",
                    chunking_strategy, chunk_size, chunk_overlap
                )
            else:
                # Use default processor
                processor = self.document_processor
                logger.info("Using default chunking config from settings")

            # Process document: parse and chunk
            chunks = await processor.process_file(
                file_content=file_content, filename=filename, metadata=doc_metadata
            )

            logger.info("Document processed into %d chunks (id: %s)", len(chunks), document_id)

            # Generate embeddings and store in vector database
            await self._store_chunks(document_id, user_id, chunks)

            # Update document status to 'done' and set chunk_count using a new DB session
            async with get_db_session() as db:
                from app.repositories.document_repository import DocumentRepository
                doc_repo = DocumentRepository(db)
                await doc_repo.update(
                    document_id,
                    obj_in={
                        "status": "done",
                        "chunk_count": len(chunks),
                    }
                )
                await db.commit()

            logger.info("Document processing completed (id: %s, status: done)", document_id)

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error("Document processing failed (id: %s): %s", document_id, str(e))
            logger.error("Full traceback:\n%s", error_details)

            # Update status to 'failed' using a new DB session
            try:
                async with get_db_session() as db:
                    from app.repositories.document_repository import DocumentRepository
                    doc_repo = DocumentRepository(db)
                    await doc_repo.update(
                        document_id,
                        obj_in={"status": "failed"}
                    )
                    await db.commit()
                    logger.info("Document status updated to failed (id: %s)", document_id)
            except Exception as update_error:
                logger.error("Failed to update document status (id: %s): %s", document_id, str(update_error))

    async def _store_chunks(
        self, document_id: UUID, user_id: UUID, chunks: List[DocumentChunk]
    ) -> None:
        """
        Generate embeddings and store chunks in vector database.

        Args:
            document_id: Document ID
            user_id: User ID
            chunks: List of document chunks
        """
        if not chunks:
            logger.warning("No chunks to store for document (id: %s)", document_id)
            return

        logger.info("Storing %d chunks for document (id: %s)", len(chunks), document_id)

        # Extract texts for embedding
        texts = [chunk.text for chunk in chunks]

        # Generate embeddings in batch
        embeddings = await self.embedding_service.generate_embeddings_batch(texts)

        # Prepare payloads
        payloads = []
        for chunk in chunks:
            payload = {
                "document_id": str(document_id),
                "user_id": str(user_id),
                "chunk_index": chunk.chunk_index,
                "text": chunk.text,
                "metadata": chunk.metadata,
            }
            payloads.append(payload)

        # Store in Qdrant
        self.vector_operations.upsert_vectors_batch(
            vectors=embeddings, payloads=payloads
        )

        logger.info("Successfully stored %d chunks in vector database", len(chunks))
