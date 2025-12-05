/**
 * Feedback API client functions
 */
import apiClient from '@/lib/api-client'

export interface FeedbackCreate {
  message_id: string
  rating: number // 1-5
  comment?: string
}

export interface FeedbackResponse {
  id: string
  message_id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
}

/**
 * Create or update feedback for a message
 */
export async function createFeedback(
  feedback: FeedbackCreate
): Promise<FeedbackResponse> {
  const response = await apiClient.post<FeedbackResponse>('/feedback', feedback)
  return response.data
}

/**
 * Get feedback for a specific message
 */
export async function getFeedbackByMessage(
  messageId: string
): Promise<FeedbackResponse | null> {
  const response = await apiClient.get<FeedbackResponse | null>(
    `/feedback/message/${messageId}`
  )
  return response.data
}

/**
 * Delete feedback for a message
 */
export async function deleteFeedback(messageId: string): Promise<void> {
  await apiClient.delete(`/feedback/message/${messageId}`)
}

