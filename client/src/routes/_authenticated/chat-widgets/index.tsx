import { createFileRoute } from '@tanstack/react-router'
import { ChatWidgets } from '@/features/chat-widgets'

export const Route = createFileRoute('/_authenticated/chat-widgets/')({
  component: ChatWidgets,
})
