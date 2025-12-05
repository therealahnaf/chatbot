/**
 * Document Types
 * Types for knowledge base document management
 */

export interface Document {
  id: string
  user_id: string
  title: string
  filename: string
  file_type: string | null
  file_size: number | null
  status: 'processing' | 'done' | 'failed'
  chunk_count: number
  qdrant_collection: string | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface DocumentUpload {
  file: File
  title: string
  metadata?: Record<string, any>
  chunking_strategy?: 'section' | 'token'
  chunk_size?: number
  chunk_overlap?: number
}

export interface DocumentListParams {
  skip?: number
  limit?: number
  search?: string
  file_type?: string
  status?: 'processing' | 'done' | 'failed'
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedDocuments {
  items: Document[]
  total: number
  page: number
  size: number
  pages: number
}

export interface SearchRequest {
  query: string
  limit?: number
  score_threshold?: number
  document_id?: string // Optional: search within specific document
}

export interface SearchResult {
  document_id: string
  chunk_index: number
  text: string
  score: number
  metadata: Record<string, any> | null
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  total_results: number
}

export interface DocumentChunk {
  id: string
  chunk_index: number
  text: string
  metadata: Record<string, any>
}

export interface DocumentChunksResponse {
  document_id: string
  document_title: string
  total_chunks: number
  chunks: DocumentChunk[]
}
