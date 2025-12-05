import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  createFeedback,
  getFeedbackByMessage,
  deleteFeedback,
  type FeedbackResponse,
} from '@/lib/api/feedback.api'
import { toast } from 'sonner'

interface MessageFeedbackProps {
  messageId: string
  className?: string
}

export function MessageFeedback({
  messageId,
  className,
}: MessageFeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  // Fetch existing feedback
  useEffect(() => {
    async function fetchFeedback() {
      try {
        const existingFeedback = await getFeedbackByMessage(messageId)
        setFeedback(existingFeedback)
      } catch (error) {
        console.error('Failed to fetch feedback:', error)
      } finally {
        setFetching(false)
      }
    }

    if (messageId) {
      fetchFeedback()
    }
  }, [messageId])

  const handleFeedback = async (rating: number) => {
    if (loading) return

    // If clicking the same rating, remove feedback
    if (feedback?.rating === rating) {
      try {
        setLoading(true)
        await deleteFeedback(messageId)
        setFeedback(null)
        toast.success('Feedback removed')
      } catch (error) {
        console.error('Failed to delete feedback:', error)
        toast.error('Failed to remove feedback')
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      setLoading(true)
      const newFeedback = await createFeedback({
        message_id: messageId,
        rating,
      })
      setFeedback(newFeedback)
      toast.success(
        rating >= 4
          ? 'Thank you for your positive feedback!'
          : 'Thank you for your feedback!'
      )
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      toast.error('Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Loader2 className='h-3.5 w-3.5 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant='ghost'
        size='sm'
        className={cn(
          'h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted',
          feedback?.rating === 5 && 'opacity-100'
        )}
        onClick={() => handleFeedback(5)}
        disabled={loading}
        title='Helpful'
      >
        <ThumbsUp
          className={cn(
            'h-3.5 w-3.5',
            feedback?.rating === 5 && 'fill-primary text-primary'
          )}
        />
      </Button>
      <Button
        variant='ghost'
        size='sm'
        className={cn(
          'h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted',
          feedback?.rating === 1 && 'opacity-100'
        )}
        onClick={() => handleFeedback(1)}
        disabled={loading}
        title='Not helpful'
      >
        <ThumbsDown
          className={cn(
            'h-3.5 w-3.5',
            feedback?.rating === 1 && 'fill-destructive text-destructive'
          )}
        />
      </Button>
    </div>
  )
}

