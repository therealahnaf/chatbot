import { useMemo } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useDocuments } from '@/hooks/use-document'
import { KBProvider } from './components/kb-provider'
import { KBPrimaryButtons } from './components/kb-primary-buttons'
import { KBTable } from './components/kb-table'
import { KBDialogs } from './components/kb-dialogs'
import type { Document as BackendDocument, DocumentListParams } from '@/types/document.types'
import type { Document as TableDocument } from './data/schema'

const route = getRouteApi('/_authenticated/knowledge-base/document')

/**
 * Transform backend document data to match table schema
 * Extracts title from filename (removes extension)
 */
function transformDocumentData(backendDoc: BackendDocument): TableDocument {
  return {
    id: backendDoc.id,
    userId: backendDoc.user_id,
    title: backendDoc.title,
    filename: backendDoc.filename,
    fileType: backendDoc.file_type,
    fileSize: backendDoc.file_size,
    status: backendDoc.status,
    chunkCount: backendDoc.chunk_count,
    createdAt: new Date(backendDoc.created_at),
    updatedAt: new Date(backendDoc.updated_at),
  }
}

export default function KBDocuments() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  // Extract server-side params from URL search
  const page = (search.page as number) || 1
  const pageSize = (search.pageSize as number) || 10
  const titleSearch = (search.title as string) || ''
  const fileTypeFilter = (search.fileType as string[]) || []
  const statusFilter = (search.status as string[]) || []
  const sortBy = (search.sort_by as string) || undefined
  const sortOrder = (search.sort_order as 'asc' | 'desc') || undefined

  // Convert table filters to server params
  const serverParams = useMemo(() => {
    const params: DocumentListParams = {
      skip: (page - 1) * pageSize,
      limit: pageSize,
    }

    if (titleSearch) {
      params.search = titleSearch
    }

    if (fileTypeFilter.length > 0) {
      params.file_type = fileTypeFilter[0]
    }

    if (statusFilter.length > 0) {
      params.status = statusFilter[0] as 'processing' | 'done' | 'failed'
    }

    if (sortBy) {
      params.sort_by = sortBy
    }
    if (sortOrder) {
      params.sort_order = sortOrder
    }

    return params
  }, [page, pageSize, titleSearch, fileTypeFilter, statusFilter, sortBy, sortOrder])

  // Fetch documents with server-side params
  const { data, isLoading, isFetching, error } = useDocuments(serverParams)

  // Transform API data to match table schema
  const transformedDocuments = useMemo(() => {
    if (!data?.items) return []
    return data.items.map(transformDocumentData)
  }, [data])

  // Calculate total pages from server response
  const totalPages = data?.pages || 0

  return (
    <KBProvider>
      <DashboardLayout
        title='Knowledge Base Documents'
        description='Upload and manage documents for your knowledge base'
        actions={<KBPrimaryButtons />}
      >
        {/* Error State */}
        {error && !data && (
          <Alert variant='destructive'>
            <AlertTitle>Error loading documents</AlertTitle>
            <AlertDescription>
              {error.message || 'Failed to fetch documents. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Table - Always render to prevent flickering */}
        {!isLoading || data ? (
          <div className='relative'>
            {/* Subtle loading indicator during refetch */}
            {isFetching && !isLoading && (
              <div className='absolute top-0 right-0 z-10 flex items-center gap-2 rounded-md bg-background/80 px-3 py-1.5 text-sm text-muted-foreground shadow-sm'>
                <Loader2 className='h-3 w-3 animate-spin' />
                <span>Updating...</span>
              </div>
            )}
            <KBTable
              data={transformedDocuments}
              search={search}
              navigate={navigate}
              pageCount={totalPages}
            />
          </div>
        ) : (
          /* Initial loading - only show on first load */
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <span className='ml-2 text-muted-foreground'>
              Loading documents...
            </span>
          </div>
        )}

        <KBDialogs />
      </DashboardLayout>
    </KBProvider>
  )
}
