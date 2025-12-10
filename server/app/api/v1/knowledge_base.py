"""Knowledge base API endpoints."""

import json
import logging
from datetime import datetime
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.exceptions import ResourceNotFoundError, ValidationError
from app.db.session import get_db
from app.models.user import User
from app.schemas.knowledge_base import (
    DocumentResponse,
    PaginatedDocumentsResponse,
    SearchRequest,
    SearchResponse,
    SearchResult as SearchResultSchema,
)
from app.services.knowledge_base.kb_service import KnowledgeBaseService
from app.vector_store.qdrant_client import get_qdrant_client
from app.core.constants import UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kb", tags=["knowledge_base"])


def get_kb_service(db: Annotated[AsyncSession, Depends(get_db)]) -> KnowledgeBaseService:
    """Get knowledge base service instance."""
    return KnowledgeBaseService(db=db)


@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_200_OK)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Document file to upload"),
    title: str = Form(..., description="Document title"),
    metadata: str = Form(None, description="Optional JSON metadata"),
    chunking_strategy: str = Form("section", description="Chunking strategy: 'section' or 'token'"),
    chunk_size: int = Form(500, description="Chunk size in tokens (for token-based chunking)"),
    chunk_overlap: int = Form(50, description="Chunk overlap in tokens (for token-based chunking)"),
    current_user: User = Depends(get_current_user),
    kb_service: KnowledgeBaseService = Depends(get_kb_service)
) -> DocumentResponse:
    """
    Upload a document to the knowledge base.

    Supported file types: PDF, TXT, DOCX, MD

    The document will be:
    1. Saved immediately with status='processing' (returns 200)
    2. Processed asynchronously (chunked, embedded, stored in Qdrant)
    3. Status updated to 'done' when complete

    Args:
        file: Document file (max 50MB)
        title: Document title
        metadata: Optional JSON metadata string (defaults to {})
        chunking_strategy: Chunking strategy - "section" (split by headings) or "token" (split by token count)
        chunk_size: Chunk size in tokens (used for token-based chunking, default: 500)
        chunk_overlap: Chunk overlap in tokens (used for token-based chunking, default: 50)
        current_user: Authenticated user
        kb_service: Knowledge base service

    Returns:
        Created document record with status='processing'

    Raises:
        HTTPException: If upload fails or invalid parameters
    """
    try:
        logger.info(
            "Document upload request (user_id: %s, filename: %s, title: %s)",
            current_user.id,
            file.filename,
            title
        )

        # Validate chunking parameters
        if chunking_strategy not in ["section", "token"]:
            raise ValidationError(
                message="Invalid chunking_strategy. Must be 'section' or 'token'",
                details={"valid_strategies": ["section", "token"]}
            )

        if chunk_size < 100 or chunk_size > 2000:
            raise ValidationError(
                message="chunk_size must be between 100 and 2000",
                details={"min": 100, "max": 2000}
            )

        if chunk_overlap < 0 or chunk_overlap >= chunk_size:
            raise ValidationError(
                message="chunk_overlap must be between 0 and chunk_size",
                details={"min": 0, "max": chunk_size - 1}
            )

        # Read file content
        file_content = await file.read()

        # Parse metadata if provided, default to empty dict
        doc_metadata = {}
        if metadata:
            try:
                doc_metadata = json.loads(metadata)
            except json.JSONDecodeError as e:
                raise ValidationError(message="Invalid JSON metadata") from e

        # Add chunking configuration to metadata
        doc_metadata["chunking_config"] = {
            "strategy": chunking_strategy,
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap
        }

        # Upload document with duplicate detection (returns immediately with status='processing')
        document, is_duplicate = await kb_service.upload_document(
            user_id=current_user.id,
            title=title,
            filename=file.filename or "untitled",
            file_content=file_content,
            metadata=doc_metadata
        )

        if is_duplicate:
            logger.info(
                "Duplicate file detected (user_id: %s, filename: %s, existing_doc_id: %s)",
                current_user.id,
                file.filename,
                document.id
            )
            # Return existing document with a warning header
            response = DocumentResponse.model_validate(document)
            # Note: FastAPI doesn't support custom headers in Pydantic models directly
            # The frontend should handle this by checking if the document already has status='done'
            # and showing a "duplicate detected" message
            logger.warning("Duplicate file upload ignored - returning existing document")
            return response

        # Schedule background processing with chunking config (only for new documents)
        background_tasks.add_task(
            kb_service.process_document_background,
            document.id,
            current_user.id,
            file_content,
            file.filename or "untitled",
            doc_metadata,
            chunking_strategy,
            chunk_size,
            chunk_overlap
        )

        logger.info("Document uploaded successfully (id: %s, status: %s)", document.id, document.status)
        return DocumentResponse.model_validate(document)

    except ValidationError as e:
        logger.warning("Document upload validation failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e

    except Exception as e:
        logger.error("Document upload failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        ) from e


@router.get("/documents", response_model=PaginatedDocumentsResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    file_type: str | None = None,
    status: str | None = None,
    sort_by: str | None = None,
    sort_order: str | None = "desc",
    current_user: User = Depends(get_current_user),
    kb_service: KnowledgeBaseService = Depends(get_kb_service)
) -> PaginatedDocumentsResponse:
    """
    List documents with pagination, search, filtering, and sorting.
    
    - Regular users: Only see their own documents
    - Admins: See all documents from all users

    Args:
        skip: Number of records to skip (offset)
        limit: Maximum number of records to return (max 100)
        search: Search term for title and filename
        file_type: Filter by file type (.pdf, .txt, .docx, .md)
        status: Filter by status (processing, done, failed)
        sort_by: Column to sort by (title, filename, file_type, file_size, status, chunk_count, created_at, updated_at)
        sort_order: Sort order (asc, desc)
        current_user: Authenticated user
        kb_service: Knowledge base service

    Returns:
        Paginated list of documents
    """
    try:
        # Admins can see all documents, regular users only their own
        from app.core.constants import UserRole
        user_id = None if current_user.role in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value] else current_user.id
        
        # Limit max page size to 100
        limit = min(limit, 100)
        
        documents, total = await kb_service.list_documents(
            user_id=user_id,
            skip=skip,
            limit=limit,
            search=search,
            file_type=file_type,
            status=status,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        # Calculate pagination metadata
        page = (skip // limit) + 1 if limit > 0 else 1
        pages = (total + limit - 1) // limit if limit > 0 else 0

        return PaginatedDocumentsResponse(
            items=[DocumentResponse.model_validate(doc) for doc in documents],
            total=total,
            page=page,
            size=limit,
            pages=pages,
        )

    except Exception as e:
        logger.error("Failed to list documents: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list documents"
        ) from e


@router.get("/documents/{document_id}/chunks")
async def get_document_chunks(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    kb_service: KnowledgeBaseService = Depends(get_kb_service)
) -> dict:
    """
    Get all chunks/points for a document from Qdrant.
    
    Returns all vector embeddings and their associated text chunks for the document.
    
    Args:
        document_id: Document UUID
        current_user: Authenticated user
        kb_service: Knowledge base service
        
    Returns:
        List of chunks with their content and metadata
        
    Raises:
        HTTPException: If document not found or access denied
    """
    try:
        # First, verify document exists and user has access
        document = await kb_service.get_document(document_id)
        
        # Check ownership (admins can view any document)
        from app.core.constants import UserRole
        is_admin = current_user.role in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]
        
        if not is_admin and document.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get Qdrant client and fetch all points for this document
        qdrant = get_qdrant_client()
        
        # Use scroll to get all points for this document
        points = []
        offset = None
        
        while True:
            result = qdrant.client.scroll(
                collection_name=qdrant.collection_name,
                scroll_filter={
                    "must": [
                        {
                            "key": "document_id",
                            "match": {"value": str(document_id)}
                        }
                    ]
                },
                limit=100,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )
            
            batch_points, next_offset = result
            
            if not batch_points:
                break
                
            points.extend(batch_points)
            
            if next_offset is None:
                break
                
            offset = next_offset
        
        # Transform points to response format
        chunks = []
        for point in points:
            chunks.append({
                "id": str(point.id),
                "chunk_index": point.payload.get("chunk_index", 0),
                "text": point.payload.get("text", ""),
                "metadata": point.payload.get("metadata", {}),
            })
        
        # Sort by chunk_index
        chunks.sort(key=lambda x: x["chunk_index"])
        
        logger.info(
            "Retrieved %d chunks for document %s (user: %s)",
            len(chunks),
            document_id,
            current_user.id
        )
        
        return {
            "document_id": str(document_id),
            "document_title": document.title,
            "total_chunks": len(chunks),
            "chunks": chunks,
        }
        
    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        ) from e
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error("Failed to get document chunks: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get document chunks: {str(e)}"
        ) from e


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    kb_service: KnowledgeBaseService = Depends(get_kb_service)
) -> DocumentResponse:
    """
    Get document metadata by ID.
    
    - Regular users: Can only view their own documents
    - Admins: Can view any document

    Args:
        document_id: Document UUID
        current_user: Authenticated user
        kb_service: Knowledge base service

    Returns:
        Document metadata

    Raises:
        HTTPException: If document not found or access denied
    """
    try:
        document = await kb_service.get_document(document_id)

        # Check ownership (admins can view any document)
        from app.core.constants import UserRole
        is_admin = current_user.role in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]
        
        if not is_admin and document.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        return DocumentResponse.model_validate(document)

    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        ) from e

    except HTTPException:
        raise

    except Exception as e:
        logger.error("Failed to get document: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document"
        ) from e


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    kb_service: KnowledgeBaseService = Depends(get_kb_service)
) -> None:
    """
    Delete a document and its vectors.

    This will:
    1. Delete all vector embeddings from Qdrant
    2. Delete document metadata from PostgreSQL
    
    - Regular users: Can only delete their own documents
    - Admins: Can delete any document

    Args:
        document_id: Document UUID
        current_user: Authenticated user
        kb_service: Knowledge base service

    Raises:
        HTTPException: If document not found or access denied
    """
    try:
        # Get document to check ownership
        document = await kb_service.get_document(document_id)

        # Check ownership (admins can delete any document)
        from app.core.constants import UserRole
        is_admin = current_user.role in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]
        
        if not is_admin and document.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Delete document
        await kb_service.delete_document(document_id)

        logger.info("Document deleted (id: %s) by user (id: %s)", document_id, current_user.id)

    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        ) from e

    except HTTPException:
        raise

    except Exception as e:
        logger.error("Failed to delete document: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        ) from e


@router.post("/search", response_model=SearchResponse)
async def search_knowledge_base(
    request: SearchRequest,
    document_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    kb_service: KnowledgeBaseService = Depends(get_kb_service)
) -> SearchResponse:
    """
    Perform semantic search in knowledge base.

    Search can be:
    - Across all user's documents (default)
    - Within a specific document (if document_id provided)

    Args:
        request: Search request with query and parameters
        document_id: Optional document ID to search within
        current_user: Authenticated user
        kb_service: Knowledge base service

    Returns:
        Search results with relevance scores

    Raises:
        HTTPException: If search fails
    """
    try:
        logger.info(
            "Knowledge base search (user_id: %s, query: %s, document_id: %s)",
            current_user.id,
            request.query[:50],
            document_id
        )

        # Perform search
        results = await kb_service.search(
            query=request.query,
            user_id=current_user.id,
            document_id=document_id,
            limit=request.limit,
            score_threshold=request.score_threshold
        )

        logger.info("Search returned %d results", len(results))

        # Convert to response schema
        search_results = [
            SearchResultSchema(
                document_id=UUID(result.document_id),
                chunk_index=result.chunk_index,
                text=result.text,
                score=result.reranked_score or result.score,
                metadata=result.metadata
            )
            for result in results
        ]

        return SearchResponse(
            query=request.query,
            results=search_results,
            total_results=len(search_results)
        )

    except ValidationError as e:
        logger.warning("Search validation failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e

    except Exception as e:
        logger.error("Search failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed"
        ) from e


@router.get("/stats")
async def get_document_stats(
    current_user: User = Depends(get_current_user),
    kb_service: KnowledgeBaseService = Depends(get_kb_service)
) -> dict:
    """
    Get statistics about user's documents.

    Returns:
        Statistics including:
        - Total number of documents
        - Total size in bytes
        - Total number of chunks
        - File type distribution

    Args:
        current_user: Authenticated user
        kb_service: Knowledge base service
    """
    try:
        stats = await kb_service.get_document_stats(current_user.id)
        return stats

    except Exception as e:
        logger.error("Failed to get document stats: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get statistics"
        ) from e


@router.get("/debug/qdrant")
async def debug_qdrant(
    _current_user: User = Depends(get_current_user),
) -> dict:
    """
    Debug endpoint to check Qdrant collection status.

    Returns collection info and sample points.
    """
    try:
        qdrant_client = get_qdrant_client()

        # Get collection info
        collection_info = qdrant_client.get_collection_info()

        # Try to get some points
        points = qdrant_client.client.scroll(
            collection_name=qdrant_client.collection_name,
            limit=5,
            with_payload=True,
            with_vectors=False
        )

        return {
            "collection_info": collection_info,
            "sample_points_count": len(points[0]) if points else 0,
            "sample_points": [
                {
                    "id": str(p.id),
                    "payload": p.payload
                }
                for p in (points[0] if points else [])
            ]
        }

    except Exception as e:
        logger.error("Debug endpoint failed: %s", str(e))
        return {
            "error": str(e),
            "collection_info": None
        }


@router.post("/snapshot", status_code=status.HTTP_200_OK)
async def create_qdrant_snapshot(
    current_user: User = Depends(get_current_user),
):
    """
    Create and download a Qdrant collection snapshot (Admin only).
    
    Creates a snapshot of the knowledge base vector collection and returns it as a downloadable file.
    The snapshot can be used for backup or migration purposes.
    
    Args:
        current_user: Authenticated user (must be admin)
        
    Returns:
        StreamingResponse with the snapshot file for download
        
    Raises:
        HTTPException: If user is not admin or snapshot creation fails
    """
    try:
        # Check if user is admin
        if current_user.role not in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can create snapshots"
            )
        
        # Get Qdrant client
        qdrant = get_qdrant_client()
        
        # Create snapshot
        snapshot_info = qdrant.client.create_snapshot(collection_name=qdrant.collection_name)
        
        snapshot_name = str(snapshot_info.name)
        
        # Handle creation_time - it might be a string or datetime object
        if snapshot_info.creation_time:
            if isinstance(snapshot_info.creation_time, str):
                created_at = snapshot_info.creation_time
            elif isinstance(snapshot_info.creation_time, datetime):
                created_at = snapshot_info.creation_time.isoformat()
            else:
                created_at = str(snapshot_info.creation_time)
        else:
            created_at = None
        
        logger.info(
            "Qdrant snapshot created by user (id: %s): name=%s, created_at=%s",
            current_user.id,
            snapshot_name,
            created_at
        )
        
        # Download snapshot from Qdrant
        snapshot_url = f"{qdrant.url}/collections/{qdrant.collection_name}/snapshots/{snapshot_name}"
        
        headers = {}
        if qdrant.api_key:
            headers["api-key"] = str(qdrant.api_key)
        
        async def generate():
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream("GET", snapshot_url, headers=headers) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to download snapshot from Qdrant: {response.status_code} - {error_text.decode()}"
                        )
                    
                    async for chunk in response.aiter_bytes():
                        yield chunk
        
        return StreamingResponse(
            generate(),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{snapshot_name}"; filename*=UTF-8\'\'{snapshot_name}',
                "X-Snapshot-Name": snapshot_name,
                "X-Created-At": created_at or "",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to create Qdrant snapshot: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create snapshot: {str(e)}"
        ) from e
