import { useState, useEffect } from 'react'
import { Loader2, FileText, Hash, Search, X, Sparkles } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDocumentChunks, useSearchKnowledgeBase } from '@/hooks/use-document'
import type { Document } from '../data/schema'

interface KBViewDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Document | null
}

export function KBViewDrawer({
  open,
  onOpenChange,
  document,
}: KBViewDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const { data, isLoading, error } = useDocumentChunks(
    document?.id || '',
    open && !!document && !isSearching
  )

  const searchMutation = useSearchKnowledgeBase()

  // Reset search when drawer closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setIsSearching(false)
    }
  }, [open])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !document) return

    setIsSearching(true)
    await searchMutation.mutateAsync({
      query: searchQuery,
      document_id: document.id,
      limit: 20,
      score_threshold: 0.4,
    })
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setIsSearching(false)
    searchMutation.reset()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Determine what data to display
  const displayData = isSearching && searchMutation.data ? searchMutation.data : null
  const displayChunks = !isSearching ? data?.chunks : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-full sm:max-w-3xl'>
        <SheetHeader>
          <SheetTitle className='flex items-center gap-2'>
            <FileText className='h-5 w-5' />
            {document?.title || 'Document Chunks'}
          </SheetTitle>
          <SheetDescription>
            {isSearching
              ? 'Semantic search results within this document'
              : 'View all text chunks and embeddings stored in Qdrant'}
          </SheetDescription>
        </SheetHeader>

        <div className='mt-6 space-y-4 px-4'>
          {/* Search Input */}
          <div className='flex gap-2'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search within document...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className='pl-9'
              />
            </div>
            {isSearching ? (
              <Button variant='outline' onClick={handleClearSearch} size='icon'>
                <X className='h-4 w-4' />
              </Button>
            ) : (
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Sparkles className='mr-2 h-4 w-4' />
                )}
                Search
              </Button>
            )}
          </div>

          {/* Loading State */}
          {(isLoading || searchMutation.isPending) && (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              <span className='ml-2 text-muted-foreground'>
                {searchMutation.isPending ? 'Searching...' : 'Loading chunks...'}
              </span>
            </div>
          )}

          {/* Error State */}
          {(error || searchMutation.error) && (
            <Alert variant='destructive'>
              <AlertDescription>
                {(error as any)?.response?.data?.detail ||
                  (searchMutation.error as any)?.response?.data?.detail ||
                  'Failed to load data'}
              </AlertDescription>
            </Alert>
          )}

          {/* Search Results */}
          {isSearching && displayData && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between rounded-lg border bg-muted/50 p-4'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Search Results</p>
                  <p className='text-2xl font-bold'>{displayData.total_results}</p>
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Query</p>
                  <p className='text-xs text-muted-foreground'>
                    "{displayData.query}"
                  </p>
                </div>
              </div>

              <ScrollArea className='h-[calc(100vh-20rem)]'>
                <div className='space-y-4 pr-4'>
                  {displayData.results.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-8 text-center'>
                      <Search className='h-12 w-12 text-muted-foreground/50 mb-3' />
                      <p className='text-sm font-medium'>No results found</p>
                      <p className='text-xs text-muted-foreground'>
                        Try different search terms
                      </p>
                    </div>
                  ) : (
                    displayData.results.map((result, index) => (
                      <div
                        key={`${result.document_id}-${result.chunk_index}`}
                        className='rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50'
                      >
                        <div className='mb-3 flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <Badge variant='outline' className='font-mono text-xs'>
                              <Hash className='mr-1 h-3 w-3' />
                              Chunk {result.chunk_index}
                            </Badge>
                            <Badge
                              variant='secondary'
                              className='text-xs bg-blue-100/50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200'
                            >
                              Score: {(result.score * 100).toFixed(1)}%
                            </Badge>
                            {index === 0 && (
                              <Badge variant='default' className='text-xs'>
                                Best Match
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className='space-y-3'>
                          <div>
                            <p className='text-sm font-medium mb-2'>Text Content</p>
                            <p className='text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap'>
                              {result.text}
                            </p>
                          </div>

                          {result.metadata &&
                            Object.keys(result.metadata).length > 0 && (
                              <div>
                                <p className='text-sm font-medium mb-2'>Metadata</p>
                                <div className='rounded-md bg-muted p-3 font-mono text-xs'>
                                  <pre className='overflow-x-auto'>
                                    {JSON.stringify(result.metadata, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* All Chunks View */}
          {!isSearching && data && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between rounded-lg border bg-muted/50 p-4'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Total Chunks</p>
                  <p className='text-2xl font-bold'>{data.total_chunks}</p>
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Document ID</p>
                  <p className='font-mono text-xs text-muted-foreground'>
                    {data.document_id.slice(0, 8)}...
                  </p>
                </div>
              </div>

              <ScrollArea className='h-[calc(100vh-20rem)]'>
                <div className='space-y-4 pr-4'>
                  {data.chunks.map((chunk, index) => (
                    <div
                      key={chunk.id}
                      className='rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50'
                    >
                      <div className='mb-3 flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <Badge variant='outline' className='font-mono text-xs'>
                            <Hash className='mr-1 h-3 w-3' />
                            Chunk {chunk.chunk_index}
                          </Badge>
                          {index === 0 && (
                            <Badge variant='secondary' className='text-xs'>
                              First
                            </Badge>
                          )}
                          {index === data.chunks.length - 1 && (
                            <Badge variant='secondary' className='text-xs'>
                              Last
                            </Badge>
                          )}
                        </div>
                        <span className='text-xs text-muted-foreground font-mono'>
                          {chunk.id.slice(0, 8)}
                        </span>
                      </div>

                      <div className='space-y-3'>
                        <div>
                          <p className='text-sm font-medium mb-2'>Text Content</p>
                          <p className='text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap'>
                            {chunk.text}
                          </p>
                        </div>

                        {chunk.metadata &&
                          Object.keys(chunk.metadata).length > 0 && (
                            <div>
                              <p className='text-sm font-medium mb-2'>Metadata</p>
                              <div className='rounded-md bg-muted p-3 font-mono text-xs'>
                                <pre className='overflow-x-auto'>
                                  {JSON.stringify(chunk.metadata, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

