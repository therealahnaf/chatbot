import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { useNavigate } from '@tanstack/react-router'
import { History, Search as SearchIcon, Loader2, Trash2 } from 'lucide-react'
import apiClient from '@/lib/api-client'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConfirmDialog } from '@/components/confirm-dialog'

type Conversation = {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    created_at: string
  }>
}

type PaginatedResponse = {
  items: Conversation[]
  total: number
  skip: number
  limit: number
}

interface ChatHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  onNewChat: () => void
}

export function ChatHistoryModal({
  open,
  onOpenChange,
  currentConversationId,
  onSelectConversation,
  onNewChat,
}: ChatHistoryModalProps) {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)
  const [conversationToDelete, setConversationToDelete] =
    useState<Conversation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const observerTarget = useRef<HTMLDivElement>(null)

  const limit = 10

  // Fetch conversations from API
  const fetchConversations = useCallback(
    async (skipValue: number, append: boolean = false) => {
      try {
        setIsLoading(true)
        const response = await apiClient.get<PaginatedResponse>(
          `/conversations`,
          {
            params: {
              skip: skipValue,
              limit,
              order_by: '-created_at', // Descending order (newest first)
            },
          }
        )

        const data = response.data
        if (append) {
          setConversations((prev) => [...prev, ...data.items])
        } else {
          setConversations(data.items)
        }

        // Check if there are more items to load
        setHasMore(data.skip + data.items.length < data.total)
        setSkip(data.skip + data.items.length)
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
        handleServerError(error)
      } finally {
        setIsLoading(false)
      }
    },
    [limit]
  )

  // Initial load when modal opens
  useEffect(() => {
    if (open) {
      setSkip(0)
      setHasMore(true)
      fetchConversations(0, false)
    }
  }, [open, fetchConversations])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchConversations(skip, true)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoading, skip, fetchConversations])

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      conv.title?.toLowerCase().includes(query) ||
      conv.messages.some((msg) => msg.content.toLowerCase().includes(query))
    )
  })

  const handleLoadConversation = (conversationId: string) => {
    onSelectConversation(conversationId)
    navigate({
      to: '/chats/$conversationId',
      params: { conversationId },
    })
    onOpenChange(false)
  }

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return

    try {
      setIsDeleting(true)
      await apiClient.delete(`/conversations/${conversationToDelete.id}`)

      // Remove the conversation from the list
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationToDelete.id)
      )

      // If the deleted conversation is the current one, navigate to new chat
      if (currentConversationId === conversationToDelete.id) {
        onNewChat()
        navigate({ to: '/chats' })
      }

      setConversationToDelete(null)
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      handleServerError(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[80vh] max-w-2xl flex-col overflow-auto'>
        <DialogHeader>
          <div className='flex items-center justify-between'>
            <div>
              <DialogTitle>Chat History</DialogTitle>
              <DialogDescription>
                Search and load your previous conversations
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Input */}
        <div className='relative'>
          <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            type='text'
            placeholder='Search conversations...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
        <Button variant='outline' size='sm' onClick={onNewChat}>
          New Chat
        </Button>

        {/* History List */}
        <ScrollArea className='mt-4 min-h-0 flex-1' ref={scrollAreaRef}>
          {isLoading && conversations.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <Loader2 className='text-muted-foreground mb-4 size-8 animate-spin' />
              <p className='text-muted-foreground text-sm'>
                Loading conversations...
              </p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <History className='text-muted-foreground mb-4 size-12' />
              <p className='text-muted-foreground'>
                {searchQuery.trim()
                  ? 'No conversations found matching your search'
                  : 'No conversation history yet. Start a new conversation to see it here.'}
              </p>
            </div>
          ) : (
            <div className='flex flex-col gap-2'>
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    'group relative flex flex-col gap-2 rounded-lg border p-4 transition-colors',
                    currentConversationId === conversation.id
                      ? 'border-primary bg-primary/5 hover:bg-primary/10'
                      : 'bg-card hover:bg-accent'
                  )}
                >
                  <button
                    type='button'
                    onClick={() => handleLoadConversation(conversation.id)}
                    className='flex-1 text-start'
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0 flex-1'>
                        <h3 className='truncate text-sm font-semibold'>
                          {conversation.title || 'Untitled Conversation'}
                        </h3>
                        <p className='text-muted-foreground mt-1 line-clamp-2 text-xs'>
                          {conversation.messages[0]?.content ||
                            'Empty conversation'}
                        </p>
                      </div>
                    </div>
                    <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                      <span>{conversation.messages.length} messages</span>
                      <span>•</span>
                      <span>
                        {format(
                          new Date(conversation.updated_at),
                          'MMM d, yyyy h:mm a'
                        )}
                      </span>
                    </div>
                  </button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='absolute top-2 right-2 size-8 opacity-0 transition-opacity group-hover:opacity-100'
                    onClick={(e) => {
                      e.stopPropagation()
                      setConversationToDelete(conversation)
                    }}
                    aria-label='Delete conversation'
                  >
                    <Trash2 className='text-destructive size-4' />
                  </Button>
                </div>
              ))}
              {/* Observer target for infinite scroll */}
              {hasMore && (
                <div ref={observerTarget} className='py-4 text-center'>
                  {isLoading ? (
                    <div className='flex items-center justify-center gap-2'>
                      <Loader2 className='size-4 animate-spin' />
                      <span className='text-muted-foreground text-sm'>
                        Loading more...
                      </span>
                    </div>
                  ) : (
                    <div className='text-muted-foreground text-xs'>
                      Scroll for more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!conversationToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setConversationToDelete(null)
          }
        }}
        handleConfirm={handleDeleteConversation}
        disabled={isDeleting}
        isLoading={isDeleting}
        title='Delete Conversation'
        desc={
          <p>
            Are you sure you want to delete this conversation?{' '}
            <strong>
              {conversationToDelete?.title || 'Untitled Conversation'}
            </strong>
            <br />
            This action cannot be undone.
          </p>
        }
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        destructive
      />
    </Dialog>
  )
}
