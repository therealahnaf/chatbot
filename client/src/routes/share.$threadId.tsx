import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { chatApi } from '@/lib/api/chat.api'
import { CustomSurveyRenderer } from '@/features/projects/components/form-builder/renderer/CustomSurveyRenderer'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/share/$threadId')({
  component: ShareFormPage,
})

function ShareFormPage() {
  const { threadId } = Route.useParams()
  const [surveyJson, setSurveyJson] = useState<any>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-form', threadId],
    queryFn: () => chatApi.getSharedForm(threadId),
    retry: false,
  })

  useEffect(() => {
    if (data?.final_json) {
      try {
        const parsed = typeof data.final_json === 'string' ? JSON.parse(data.final_json) : data.final_json
        setSurveyJson(parsed)
      } catch (e) {
        console.error("Failed to parse shared form JSON:", e)
      }
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading form...</p>
        </div>
      </div>
    )
  }

  if (error || !surveyJson) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md p-6 text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Form Not Found</h1>
          <p className="text-muted-foreground">
            The form you are looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex justify-center">
      <Card className="w-full max-w-4xl h-fit shadow-lg overflow-hidden">
        <div className="p-6">
          <CustomSurveyRenderer
            json={surveyJson}
            onJsonChange={() => { }} // Read-only in terms of structure, but interactive for inputs
            previewMode={true} // Use preview mode to render the form as user sees it
          />
        </div>
      </Card>
    </div>
  )
}
