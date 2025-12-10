/**
 * Document/Knowledge Base Hooks using TanStack React Query
 * Provides caching, automatic refetching, and optimistic updates
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '@/lib/api/document.api'
import type {
  DocumentListParams,
  SearchRequest,
} from '@/types/document.types'
import { toast } from 'sonner'

/**
 * Query Keys for document management
 * Organized by entity and operation
 */
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (params?: DocumentListParams) => [...documentKeys.lists(), params] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  search: (query: string) => [...documentKeys.all, 'search', query] as const,
  chunks: (id: string) => [...documentKeys.all, 'chunks', id] as const,
}

/**
 * Hook: List all documents with pagination
 * Cached with pagination params
 */
export function useDocuments(params?: DocumentListParams) {
  return useQuery({
    queryKey: documentKeys.list(params),
    queryFn: () => documentsApi.listDocuments(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook: Get document by ID
 * Cached for 5 minutes
 */
export function useDocument(documentId: string) {
  return useQuery({
    queryKey: documentKeys.detail(documentId),
    queryFn: () => documentsApi.getDocumentById(documentId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!documentId,
  })
}

/**
 * Hook: Upload new document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: documentsApi.uploadDocument,
    onSuccess: () => {
      // Invalidate all document lists to refetch with new document
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })

      toast.success('Document uploaded successfully!')
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to upload document'
      toast.error(message)
    },
  })
}

/**
 * Hook: Delete document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => documentsApi.deleteDocument(documentId),
    onSuccess: (_, documentId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: documentKeys.detail(documentId) })

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })

      toast.success('Document deleted successfully!')
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to delete document'
      toast.error(message)
    },
  })
}

/**
 * Hook: Search knowledge base
 * Note: This uses a mutation instead of query because search is typically
 * triggered by user action, not automatically
 */
export function useSearchKnowledgeBase() {
  return useMutation({
    mutationFn: documentsApi.searchKnowledgeBase,
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to search knowledge base'
      toast.error(message)
    },
  })
}

/**
 * Hook: Search knowledge base as a query (for persistent search results)
 * Use this if you want to cache search results
 */
export function useSearchQuery(request: SearchRequest, enabled: boolean = true) {
  return useQuery({
    queryKey: documentKeys.search(request.query),
    queryFn: () => documentsApi.searchKnowledgeBase(request),
    enabled: enabled && !!request.query,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook: Bulk delete documents
 */
export function useBulkDeleteDocuments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentIds: string[]) => 
      Promise.all(documentIds.map(id => documentsApi.deleteDocument(id))),
    onSuccess: (_, documentIds) => {
      // Remove deleted documents from cache
      documentIds.forEach((documentId) => {
        queryClient.removeQueries({ queryKey: documentKeys.detail(documentId) })
      })

      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })

      const count = documentIds.length
      toast.success(`Successfully deleted ${count} document${count > 1 ? 's' : ''}!`)
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to delete documents'
      toast.error(message)
    },
  })
}

/**
 * Hook: Prefetch document data
 * Useful for hover states or predictive loading
 */
export function usePrefetchDocument() {
  const queryClient = useQueryClient()

  return (documentId: string) => {
    queryClient.prefetchQuery({
      queryKey: documentKeys.detail(documentId),
      queryFn: () => documentsApi.getDocumentById(documentId),
      staleTime: 5 * 60 * 1000,
    })
  }
}

/**
 * Hook: Create Qdrant snapshot (Admin only)
 * Creates a backup snapshot of the vector database collection and downloads it
 */
export function useCreateSnapshot() {
  return useMutation({
    mutationFn: documentsApi.createSnapshot,
    onSuccess: () => {
      toast.success('Snapshot created and downloaded successfully')
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to create snapshot'
      toast.error(message)
    },
  })
}

/**
 * Hook: Get document chunks
 * Fetches all chunks/points for a document from Qdrant
 */
export function useDocumentChunks(documentId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: documentKeys.chunks(documentId),
    queryFn: () => documentsApi.getDocumentChunks(documentId),
    enabled: enabled && !!documentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  })
}
