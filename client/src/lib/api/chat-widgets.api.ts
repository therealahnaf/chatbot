/**
 * Chat Widget API client functions
 */

import apiClient from '@/lib/api-client'
import type {
  ChatWidgetConfig,
  ChatWidgetCreate,
  ChatWidgetUpdate,
  ChatWidgetListResponse,
} from '@/features/chat-widgets/types/widget-types'

export interface ChatWidgetListParams {
  page?: number
  page_size?: number
  search?: string
  enabled?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export const chatWidgetsApi = {
  /**
   * List chat widgets with pagination and filters
   */
  listWidgets: async (params?: ChatWidgetListParams): Promise<ChatWidgetListResponse> => {
    const response = await apiClient.get<ChatWidgetListResponse>('/chat-widgets', {
      params,
    })
    return response.data
  },

  /**
   * Get widget by ID
   */
  getWidgetById: async (id: string): Promise<ChatWidgetConfig> => {
    const response = await apiClient.get<ChatWidgetConfig>(`/chat-widgets/${id}`)
    return response.data
  },

  /**
   * Create a new widget
   */
  createWidget: async (data: ChatWidgetCreate): Promise<ChatWidgetConfig> => {
    const response = await apiClient.post<ChatWidgetConfig>('/chat-widgets', data)
    return response.data
  },

  /**
   * Update widget
   */
  updateWidget: async (id: string, data: ChatWidgetUpdate): Promise<ChatWidgetConfig> => {
    const response = await apiClient.patch<ChatWidgetConfig>(`/chat-widgets/${id}`, data)
    return response.data
  },

  /**
   * Delete widget
   */
  deleteWidget: async (id: string): Promise<void> => {
    await apiClient.delete(`/chat-widgets/${id}`)
  },
}
