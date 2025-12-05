import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Bot, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import {
  ChatWidgetConfig,
  ChatWidgetColors,
  ChatWidgetPosition,
} from '../types/widget-types'

interface WidgetPreviewProps {
  config: Partial<ChatWidgetConfig>
}

export function WidgetPreview({ config }: WidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showInitPage, setShowInitPage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const rawColors: Partial<ChatWidgetColors> = config.colors || {}
  const colors: ChatWidgetColors = {
    primary: rawColors.primary || '#3b82f6',
    background: rawColors.background || '#ffffff',
    text: rawColors.text || '#1f2937',
    userBubble: rawColors.userBubble || rawColors.user_bubble || '#3b82f6',
    botBubble: rawColors.botBubble || rawColors.bot_bubble || '#f3f4f6',
    userText: rawColors.userText || rawColors.user_text || '#ffffff',
    botText: rawColors.botText || rawColors.bot_text || '#1f2937',
  }

  const radius = config.radius || {
    widget: 16,
    messageBubble: 12,
    button: 50,
  }

  const position = config.position || 'bottom-right'
  const widgetName = config.name || 'Chat Support'
  const welcomeMessage =
    config.welcomeMessage || 'Hi! How can I help you today?'
  const placeholder = config.placeholder || 'Type your message...'
  const initPage = config.initPage
  const showBotIcon = config.showBotIcon ?? true
  const showUserIcon = config.showUserIcon ?? true

  useEffect(() => {
    if (isOpen && initPage?.enabled) {
      setShowInitPage(true)
    } else if (isOpen && !initPage?.enabled) {
      setShowInitPage(false)
    }
  }, [isOpen, initPage?.enabled])

  useEffect(() => {
    if (isOpen && !showInitPage && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isOpen, showInitPage])

  const getPositionClasses = (pos: ChatWidgetPosition) => {
    const positions = {
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
    }
    return positions[pos] || positions['bottom-right']
  }

  return (
    <div className='relative h-full w-full overflow-hidden rounded-lg border bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='text-muted-foreground text-sm'>Widget Preview Area</div>
      </div>

      {/* Preview Container */}
      <div className={cn('absolute', getPositionClasses(position))}>
        {/* Chat Window */}
        {isOpen && (
          <div
            className='absolute flex w-[380px] flex-col shadow-2xl'
            style={{
              backgroundColor: colors.background,
              minHeight: '400px',
              maxHeight: 'calc(100% - 80px)',
              height: 'calc(100% - 80px)',
              maxWidth: 'calc(100vw - 40px)',
              borderRadius: `${radius.widget}px`,
              bottom: '70px',
              [position.includes('right') ? 'right' : 'left']: '0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              className='flex items-center justify-between p-4'
              style={{ backgroundColor: colors.primary }}
            >
              <h3 className='font-semibold text-white'>{widgetName}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className='text-white transition-opacity hover:opacity-80'
              >
                <X className='size-5' />
              </button>
            </div>

            {/* Init Page */}
            {showInitPage && initPage?.enabled ? (
              <div
                className='flex-1 overflow-x-hidden overflow-y-auto p-5'
                style={{ minHeight: 0 }}
              >
                <div
                  className='mb-6 text-center whitespace-pre-line'
                  style={{
                    color: colors.text,
                    fontSize: '14px',
                    lineHeight: '1.6',
                  }}
                >
                  {initPage.welcomeMessage ||
                    'Hello 👋\nI am a Virtual Assistant\nHow may I help you?'}
                </div>

                {initPage.faqs && initPage.faqs.length > 0 && (
                  <>
                    <div
                      className='mb-4 flex items-center gap-2 font-semibold'
                      style={{ color: colors.text, fontSize: '16px' }}
                    >
                      Frequently Asked Questions ?
                    </div>
                    <div className='space-y-2'>
                      {initPage.faqs.map((faq, index) => (
                        <div
                          key={index}
                          className='flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors'
                          style={{
                            backgroundColor: colors.botBubble,
                            borderRadius: `${radius.messageBubble}px`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              colors.primary + '15'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              colors.botBubble
                          }}
                        >
                          <div
                            className='h-2 w-2 flex-shrink-0 rounded-full'
                            style={{ backgroundColor: colors.primary }}
                          />
                          <div
                            className='flex-1 text-sm'
                            style={{ color: colors.text }}
                          >
                            {faq.question || 'Question'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {(initPage.showStartNewMessage ||
                  initPage.showContinueConversation) && (
                  <div
                    className='mt-5 space-y-3 border-t pt-5'
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    {initPage.showStartNewMessage && (
                      <button
                        className='flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors'
                        style={{
                          borderColor: colors.primary,
                          color: colors.primary,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.primary
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = colors.primary
                        }}
                      >
                        Start new message →
                      </button>
                    )}
                    {initPage.showContinueConversation && (
                      <button
                        className='flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors'
                        style={{
                          borderColor: colors.primary,
                          color: colors.primary,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.primary
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = colors.primary
                        }}
                      >
                        Continue conversation →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Messages */}
                <div
                  className='flex-1 space-y-4 overflow-x-hidden overflow-y-auto p-4'
                  style={{ minHeight: 0 }}
                >
                  {/* Welcome Message */}
                  <div className='flex gap-2'>
                    {showBotIcon && (
                      <div
                        className='flex size-8 shrink-0 items-center justify-center rounded-full'
                        style={{
                          backgroundColor: '#e5e7eb',
                        }}
                      >
                        <Bot
                          className='size-4'
                          style={{ color: colors.primary }}
                        />
                      </div>
                    )}
                    <div
                      className='max-w-[75%] px-4 py-2 text-sm [&>*]:first:mt-0 [&>*]:last:mb-0'
                      style={{
                        backgroundColor: colors.botBubble,
                        color: colors.botText || colors.text,
                        borderTopLeftRadius: `${radius.messageBubble}px`,
                        borderTopRightRadius: `${radius.messageBubble}px`,
                        borderBottomRightRadius: `${radius.messageBubble}px`,
                        borderBottomLeftRadius: '4px',
                      }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1
                              className='my-2 text-lg font-semibold'
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className='my-2 text-base font-semibold'
                              {...props}
                            />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3
                              className='my-1 text-sm font-semibold'
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p className='my-1 leading-relaxed' {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul
                              className='my-2 list-inside list-disc space-y-1'
                              {...props}
                            />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                              className='my-2 list-inside list-decimal space-y-1'
                              {...props}
                            />
                          ),
                          li: ({ node, ...props }) => (
                            <li className='text-sm' {...props} />
                          ),
                          code: ({ node, ...props }) => {
                            const inline =
                              (props as { inline?: boolean }).inline ?? true
                            return inline ? (
                              <code
                                className='rounded bg-black/10 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10'
                                {...props}
                              />
                            ) : (
                              <code
                                className='my-2 block overflow-x-auto rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/5'
                                {...props}
                              />
                            )
                          },
                          pre: ({ node, ...props }) => (
                            <pre
                              className='my-2 overflow-x-auto rounded bg-black/5 p-2 dark:bg-white/5'
                              {...props}
                            />
                          ),
                          a: ({ node, ...props }) => (
                            <a
                              className='underline'
                              style={{ color: colors.primary }}
                              target='_blank'
                              rel='noopener noreferrer'
                              {...props}
                            />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className='font-semibold' {...props} />
                          ),
                          em: ({ node, ...props }) => (
                            <em className='italic' {...props} />
                          ),
                        }}
                      >
                        {welcomeMessage}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Sample User Message */}
                  <div className='flex flex-row-reverse gap-2'>
                    {showUserIcon && (
                      <div
                        className='flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium'
                        style={{
                          backgroundColor: '#e5e7eb',
                          color: colors.text,
                        }}
                      >
                        U
                      </div>
                    )}
                    <div
                      className='max-w-[75%] px-4 py-2 text-sm'
                      style={{
                        backgroundColor: colors.userBubble,
                        color: colors.userText || '#ffffff',
                        borderTopLeftRadius: `${radius.messageBubble}px`,
                        borderTopRightRadius: `${radius.messageBubble}px`,
                        borderBottomLeftRadius: `${radius.messageBubble}px`,
                        borderBottomRightRadius: '4px',
                      }}
                    >
                      Hello! I need some help.
                    </div>
                  </div>

                  {/* Sample Bot Response */}
                  <div className='flex gap-2'>
                    {showBotIcon && (
                      <div
                        className='flex size-8 shrink-0 items-center justify-center rounded-full'
                        style={{
                          backgroundColor: '#e5e7eb',
                        }}
                      >
                        <Bot
                          className='size-4'
                          style={{ color: colors.primary }}
                        />
                      </div>
                    )}
                    <div
                      className='max-w-[75%] px-4 py-2 text-sm [&>*]:first:mt-0 [&>*]:last:mb-0'
                      style={{
                        backgroundColor: colors.botBubble,
                        color: colors.botText || colors.text,
                        borderTopLeftRadius: `${radius.messageBubble}px`,
                        borderTopRightRadius: `${radius.messageBubble}px`,
                        borderBottomRightRadius: `${radius.messageBubble}px`,
                        borderBottomLeftRadius: '4px',
                      }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1
                              className='my-2 text-lg font-semibold'
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className='my-2 text-base font-semibold'
                              {...props}
                            />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3
                              className='my-1 text-sm font-semibold'
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p className='my-1 leading-relaxed' {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul
                              className='my-2 list-inside list-disc space-y-1'
                              {...props}
                            />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                              className='my-2 list-inside list-decimal space-y-1'
                              {...props}
                            />
                          ),
                          li: ({ node, ...props }) => (
                            <li className='text-sm' {...props} />
                          ),
                          code: ({ node, ...props }) => {
                            const inline =
                              (props as { inline?: boolean }).inline ?? true
                            return inline ? (
                              <code
                                className='rounded bg-black/10 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10'
                                {...props}
                              />
                            ) : (
                              <code
                                className='my-2 block overflow-x-auto rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/5'
                                {...props}
                              />
                            )
                          },
                          pre: ({ node, ...props }) => (
                            <pre
                              className='my-2 overflow-x-auto rounded bg-black/5 p-2 dark:bg-white/5'
                              {...props}
                            />
                          ),
                          a: ({ node, ...props }) => (
                            <a
                              className='underline'
                              style={{ color: colors.primary }}
                              target='_blank'
                              rel='noopener noreferrer'
                              {...props}
                            />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className='font-semibold' {...props} />
                          ),
                          em: ({ node, ...props }) => (
                            <em className='italic' {...props} />
                          ),
                        }}
                      >
                        {`Of course! I'm here to help. What can I assist you with today?

You can use **bold**, *italic*, and \`code\` formatting in messages.`}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div
                  className='border-t p-4'
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      placeholder={placeholder}
                      className='flex-1 rounded-lg border px-3 py-3 text-sm outline-none'
                      style={{
                        borderColor: '#d1d5db',
                        color: colors.text,
                      }}
                      disabled
                    />
                    <button
                      className='rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90'
                      style={{ backgroundColor: colors.primary }}
                      disabled
                    >
                      <ArrowUp className='size-4' />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Chat Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className='flex size-14 items-center justify-center shadow-2xl transition-transform hover:scale-110'
          style={{
            backgroundColor: colors.primary,
            borderRadius: `${radius.button}px`,
          }}
        >
          <Bot className='size-6 text-white' />
        </button>
      </div>
    </div>
  )
}
