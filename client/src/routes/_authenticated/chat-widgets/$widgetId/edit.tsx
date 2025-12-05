import { createFileRoute } from '@tanstack/react-router'
import { WidgetEditor } from '@/features/chat-widgets/pages/widget-editor'

export const Route = createFileRoute(
  '/_authenticated/chat-widgets/$widgetId/edit'
)({
  component: WidgetEditPage,
})

function WidgetEditPage() {
  const { widgetId } = Route.useParams()
  return <WidgetEditor widgetId={widgetId} />
}
