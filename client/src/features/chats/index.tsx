import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { useLocation, useParams, useNavigate } from '@tanstack/react-router'
import 'highlight.js/styles/github-dark.css'
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  History,
  UserIcon,
  Copy,
  Check,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { useAuthStore } from '@/stores/auth-store'
import apiClient from '@/lib/api-client'
import { handleServerError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ChatHistoryModal } from './chat-history-modal'
import { MessageActions } from './components/message-actions'
import { MessageFeedback } from './components/message-feedback'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function Chats() {
  const location = useLocation()
  const navigate = useNavigate()
  const isChatsRoute =
    location.pathname === '/chats' || location.pathname.startsWith('/chats/')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null)
  const [conversationTitle, setConversationTitle] = useState<string | null>(
    null
  )
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get conversationId from route params
  const params = useParams({ strict: false })
  const conversationIdFromParams = params?.conversationId

  // Fetch messages from API when conversationId is available
  useEffect(() => {
    const fetchMessages = async () => {
      if (conversationIdFromParams) {
        try {
          setIsLoading(true)
          const response = await apiClient.get(
            `/conversations/${conversationIdFromParams}/messages`
          )

          // Map API response to Message format
          const apiMessages = response.data as Array<{
            id: string
            role: 'user' | 'assistant'
            content: string
            created_at: string
            metadata?: Record<string, unknown> | null
            feedback?: unknown | null
          }>

          const mappedMessages: Message[] = apiMessages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }))

          setMessages(mappedMessages)
          setCurrentConversationId(conversationIdFromParams)
        } catch (error) {
          console.error('Failed to fetch messages:', error)
          handleServerError(error)
          // If error, start with empty messages
          setMessages([])
        } finally {
          setIsLoading(false)
        }
      } else {
        // No conversationId, start with empty messages
        setMessages([])
        setCurrentConversationId(null)
      }
    }

    fetchMessages()
  }, [conversationIdFromParams])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    // Create a placeholder AI message that will be updated as chunks arrive
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '...', // Show loading indicator
      timestamp: new Date(),
    }
    setMessages([...newMessages, aiMessage])

    try {
      // Build conversation history - only send last 5 messages for context
      const conversationHistory = messages
        .slice(-5) // Take only the last 5 messages
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

      // Get auth token for the request
      const { auth } = useAuthStore.getState()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (auth.accessToken) {
        headers['Authorization'] = `Bearer ${auth.accessToken}`
      }

      // Call the streaming chat API
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/chat/stream`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_input: userMessage.content,
            conversation_history: conversationHistory,
            conversation_id: currentConversationId,
            conversation_title: conversationTitle,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Read the stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.error) {
                throw new Error(data.error)
              }

              // Handle conversation_id on first message response
              if (data?.conversation_id && !currentConversationId) {
                setCurrentConversationId(data.conversation_id)
                setConversationTitle(
                  data?.conversation_title ||
                    newMessages[0]?.content.slice(0, 50) ||
                    'New Conversation'
                )
                navigate({
                  to: '/chats/$conversationId',
                  params: { conversationId: data.conversation_id },
                  replace: true,
                })
              }

              if (data.chunk) {
                accumulatedContent += data.chunk

                // Update the AI message with accumulated content
                // Replace "..." placeholder with actual content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: accumulatedContent || '...' }
                      : msg
                  )
                )
              }

              if (data.done) {
                setIsLoading(false)

                // Update message IDs with proper UUIDs from backend
                if (data.user_message_id || data.assistant_message_id) {
                  setMessages((prev) =>
                    prev.map((msg) => {
                      // Update user message ID
                      if (msg.id === userMessage.id && data.user_message_id) {
                        return { ...msg, id: data.user_message_id }
                      }
                      // Update AI message ID
                      if (msg.id === aiMessageId && data.assistant_message_id) {
                        return { ...msg, id: data.assistant_message_id }
                      }
                      return msg
                    })
                  )
                }
                // Conversation is already saved on the backend via the API
                // No need to maintain local state
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              console.warn('Failed to parse SSE data:', parseError)
            }
          }
        }
      }
    } catch (error) {
      // Handle error
      handleServerError(error)
      setIsLoading(false)

      // Show error message to user
      const errorMessage: Message = {
        id: aiMessageId,
        role: 'assistant',
        content:
          'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) =>
        prev.map((msg) => (msg.id === aiMessageId ? errorMessage : msg))
      )
    }
  }

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    // Messages will be loaded by the useEffect that watches conversationIdFromParams
  }

  const handleNewChat = () => {
    setMessages([])
    setCurrentConversationId(null)
    setHistoryOpen(false)
    setConversationTitle(null)
    navigate({
      to: '/chats',
      replace: true,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      // Remove markdown code blocks if present for cleaner copy
      const textToCopy = content.replace(/```[\s\S]*?```/g, (match) => {
        // Extract code from code blocks
        const codeMatch = match.match(/```[\w]*\n?([\s\S]*?)```/)
        return codeMatch ? codeMatch[1].trim() : match
      })

      await navigator.clipboard.writeText(textToCopy)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          {isChatsRoute && (
            <Button
              type='button'
              size='icon'
              variant='ghost'
              onClick={() => setHistoryOpen(true)}
              className='rounded-md'
            >
              <History className='size-4' />
              <span className='sr-only'>View chat history</span>
            </Button>
          )}
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <div className='flex h-full flex-col overflow-hidden'>
          {/* Chat Area */}
          <div className='flex-1 overflow-hidden'>
            <ScrollArea className='h-full px-4'>
              <div className='mx-auto flex max-w-3xl flex-col gap-6 py-8'>
                {messages.length === 0 ? (
                  // Empty State
                  <div className='flex flex-1 flex-col items-center justify-center space-y-6 py-16'>
                    <div className='bg-primary/10 flex size-16 items-center justify-center rounded-full'>
                      <Sparkles className='text-primary size-8' />
                    </div>
                    <div className='space-y-2 text-center'>
                      <h1 className='text-2xl font-semibold'>
                        How can I help you today?
                      </h1>
                      <p className='text-muted-foreground text-sm'>
                        Start a conversation by typing a message below.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Messages
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'group flex w-full gap-4',
                          message.role === 'user'
                            ? 'justify-end'
                            : 'justify-start'
                        )}
                      >
                        {message.role === 'assistant' && (
                          <div className='bg-primary/10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full'>
                            <Bot className='text-primary size-5' />
                          </div>
                        )}
                        <div
                          className={cn(
                            'flex max-w-[85%] flex-col gap-2 md:max-w-[75%]',
                            message.role === 'user' && 'items-end'
                          )}
                        >
                          <div
                            className={cn(
                              'relative rounded-2xl px-4 py-3 shadow-sm',
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            {message.role === 'assistant' ? (
                              <div className='prose prose-sm dark:prose-invert max-w-none'>
                                {message.content === '...' ||
                                (message.content === '' && isLoading) ? (
                                  <div className='text-muted-foreground flex items-center gap-2'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    <span>Thinking...</span>
                                  </div>
                                ) : (
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                    components={{
                                      // Customize markdown rendering
                                      a: ({ node, ...props }) => (
                                        <a
                                          {...props}
                                          className='text-primary hover:underline'
                                          target='_blank'
                                          rel='noopener noreferrer'
                                        />
                                      ),
                                      code: ({
                                        node,
                                        className,
                                        children,
                                        ...props
                                      }) => {
                                        const isInline = !className
                                        return isInline ? (
                                          <code
                                            className='bg-muted-foreground/10 text-foreground rounded px-1 py-0.5 font-mono text-xs'
                                            {...props}
                                          >
                                            {children}
                                          </code>
                                        ) : (
                                          <code
                                            className={className}
                                            {...props}
                                          >
                                            {children}
                                          </code>
                                        )
                                      },
                                      pre: ({ node, ...props }) => (
                                        <pre
                                          className='bg-muted-foreground/10 overflow-x-auto rounded-lg p-3'
                                          {...props}
                                        />
                                      ),
                                      ul: ({ node, ...props }) => (
                                        <ul
                                          className='list-inside list-disc space-y-1'
                                          {...props}
                                        />
                                      ),
                                      ol: ({ node, ...props }) => (
                                        <ol
                                          className='list-inside list-decimal space-y-1'
                                          {...props}
                                        />
                                      ),
                                      li: ({ node, ...props }) => (
                                        <li className='text-sm' {...props} />
                                      ),
                                    }}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                )}
                              </div>
                            ) : (
                              <p className='text-sm leading-relaxed break-words whitespace-pre-wrap'>
                                {message.content}
                              </p>
                            )}
                            {/* Message Actions - only for assistant messages */}
                            {message.role === 'assistant' && (
                              <div className='absolute top-2 -right-2 flex items-center gap-1'>
                                <MessageActions
                                  messageId={message.id}
                                  content={message.content}
                                />
                              </div>
                            )}
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='text-muted-foreground px-1 text-xs'>
                              {format(message.timestamp, 'h:mm a')}
                            </span>
                            {/* Copy button - for all messages */}
                            <Button
                              variant='ghost'
                              size='sm'
                              className='hover:bg-muted h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                              onClick={() =>
                                handleCopyMessage(message.content, message.id)
                              }
                              title='Copy message'
                            >
                              {copiedMessageId === message.id ? (
                                <Check className='text-primary h-3.5 w-3.5' />
                              ) : (
                                <Copy className='h-3.5 w-3.5' />
                              )}
                            </Button>
                            {/* Feedback - only for saved assistant messages (UUID format) */}
                            {message.role === 'assistant' &&
                              message.id.includes('-') && (
                                <MessageFeedback messageId={message.id} />
                              )}
                          </div>
                        </div>
                        {message.role === 'user' && (
                          <div className='bg-muted mt-1 flex size-8 shrink-0 items-center justify-center rounded-full'>
                            <span className='text-muted-foreground text-xs font-medium'>
                              <UserIcon className='size-4' />
                            </span>
                          </div>
                        )}
                      </div>
                    ))}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className='bg-background shrink-0 border-t'>
            <div className='mx-auto max-w-3xl px-4 pt-4 pb-1'>
              <form onSubmit={handleSubmit} className='relative'>
                <div className='bg-card focus-within:ring-ring relative flex items-end gap-2 rounded-lg border shadow-sm focus-within:ring-2'>
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Type your message... (Press Enter to send, Shift+Enter for new line)'
                    className='max-h-[200px] min-h-[52px] resize-none border-0 bg-transparent px-4 py-3 pr-12 focus-visible:ring-0 focus-visible:ring-offset-0'
                    rows={1}
                    disabled={isLoading}
                  />
                  <Button
                    type='submit'
                    size='icon'
                    className='absolute right-2 bottom-2 h-8 w-8 shrink-0 rounded-md'
                    disabled={!input.trim() || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className='size-4 animate-spin' />
                    ) : (
                      <Send className='size-4' />
                    )}
                    <span className='sr-only'>Send message</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Main>

      {/* History Modal */}
      <ChatHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />
    </>
  )
}
