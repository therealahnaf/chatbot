/**
 * Document/Knowledge Base API
 * All document and knowledge base related API calls
 */

import apiClient from '@/lib/api-client'
import type {
  Document,
  DocumentUpload,
  DocumentListParams,
  PaginatedDocuments,
  SearchRequest,
  SearchResponse,
  DocumentChunksResponse,
} from '@/types/document.types'

export const documentsApi = {
  /**
   * Upload a document to the knowledge base
   * Supported file types: PDF, TXT, DOCX, MD
   */
  uploadDocument: async (data: DocumentUpload): Promise<Document> => {
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('title', data.title)

    // Always send metadata, default to empty object
    formData.append('metadata', JSON.stringify(data.metadata || {}))

    // Add chunking configuration (with defaults)
    formData.append('chunking_strategy', data.chunking_strategy || 'section')
    formData.append('chunk_size', String(data.chunk_size || 500))
    formData.append('chunk_overlap', String(data.chunk_overlap || 50))

    const response = await apiClient.post<Document>('/kb/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * List all documents for current user (with pagination, search, filtering, sorting)
   */
  listDocuments: async (params?: DocumentListParams): Promise<PaginatedDocuments> => {
    const response = await apiClient.get<PaginatedDocuments>('/kb/documents', {
      params,
    })
    return response.data
  },

  /**
   * Get document by ID
   */
  getDocumentById: async (documentId: string): Promise<Document> => {
    const response = await apiClient.get<Document>(`/kb/documents/${documentId}`)
    return response.data
  },

  /**
   * Get all chunks/points for a document from Qdrant
   */
  getDocumentChunks: async (documentId: string): Promise<DocumentChunksResponse> => {
    const response = await apiClient.get<DocumentChunksResponse>(
      `/kb/documents/${documentId}/chunks`
    )
    return response.data
  },

  /**
   * Delete document by ID
   * This will delete the document metadata and all associated vector embeddings
   */
  deleteDocument: async (documentId: string): Promise<void> => {
    await apiClient.delete(`/kb/documents/${documentId}`)
  },

  /**
   * Perform semantic search in knowledge base
   * Can search across all user's documents or within a specific document
   */
  searchKnowledgeBase: async (request: SearchRequest): Promise<SearchResponse> => {
    const params: Record<string, unknown> = {}
    
    if (request.document_id) {
      params.document_id = request.document_id
    }

    const response = await apiClient.post<SearchResponse>(
      '/kb/search',
      {
        query: request.query,
        limit: request.limit ?? 5,
        score_threshold: request.score_threshold ?? 0.5,
      },
      {
        params,
      }
    )
    return response.data
  },

  /**
   * Create and download a Qdrant snapshot (Admin only)
   * Creates a snapshot of the knowledge base vector collection and downloads it
   */
  createSnapshot: async (): Promise<void> => {
    const response = await apiClient.post('/kb/snapshot', {}, {
      responseType: 'blob',
    })
    
    // Get snapshot name from headers (axios lowercases header names)
    const snapshotName = 
      (response.headers['x-snapshot-name'] as string) || 
      (response.headers['X-Snapshot-Name'] as string) ||
      'snapshot.snapshot'
    
    // Create blob and trigger download
    const blob = response.data as Blob
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = snapshotName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}
