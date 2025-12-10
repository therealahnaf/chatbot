export type ChatWidgetPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'

export interface ChatWidgetColors {
  primary: string
  background: string
  text: string
  userBubble: string
  botBubble: string
  userText: string
  botText: string
  // Support snake_case format from backend (optional, for backward compatibility)
  user_bubble?: string
  bot_bubble?: string
  user_text?: string
  bot_text?: string
}

export interface ChatWidgetRadius {
  widget: number // Widget window border radius in pixels
  messageBubble: number // Message bubble border radius in pixels
  button: number // Chat button border radius in pixels
  // Support snake_case format from backend (optional, for backward compatibility)
  message_bubble?: number
}

export interface FAQItem {
  question: string
  answer: string
}

export interface InitPageConfig {
  enabled: boolean
  welcomeMessage?: string
  faqs: FAQItem[]
  showStartNewMessage: boolean
  showContinueConversation: boolean
}

export interface ChatWidgetConfig {
  id: string
  user_id?: string
  name: string
  position: ChatWidgetPosition
  colors: ChatWidgetColors
  radius: ChatWidgetRadius
  welcomeMessage: string
  placeholder: string
  apiEndpoint: string
  enabled: boolean
  initPage: InitPageConfig
  showBotIcon: boolean
  showUserIcon: boolean
  createdAt: Date
  updatedAt: Date
}

export type ChatWidgetCreate = Omit<
  ChatWidgetConfig,
  'id' | 'user_id' | 'createdAt' | 'updatedAt'
>
export type ChatWidgetUpdate = Partial<ChatWidgetCreate>

export interface ChatWidgetListResponse {
  items: ChatWidgetConfig[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export const DEFAULT_WIDGET_COLORS: ChatWidgetColors = {
  primary: '#3b82f6',
  background: '#ffffff',
  text: '#1f2937',
  userBubble: '#3b82f6',
  botBubble: '#f3f4f6',
  userText: '#ffffff',
  botText: '#1f2937',
}

export const DEFAULT_WIDGET_RADIUS: ChatWidgetRadius = {
  widget: 16, // 16px rounded corners for widget window
  messageBubble: 12, // 12px rounded corners for message bubbles
  button: 50, // 50% for circular button (use percentage for full circle)
}

export const DEFAULT_INIT_PAGE_CONFIG: InitPageConfig = {
  enabled: false,
  welcomeMessage: 'Hello 👋\nI am a Virtual Assistant\nHow may I help you?',
  faqs: [],
  showStartNewMessage: true,
  showContinueConversation: true,
}
