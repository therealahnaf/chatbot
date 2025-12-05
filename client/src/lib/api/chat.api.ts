import apiClient from '@/lib/api-client'

export interface ChatMessage {
    type: 'human' | 'ai' | 'unknown'
    content: string
}

export interface ChatResponse {
    response: string
    thread_id: string
    history: ChatMessage[]
}

export const chatApi = {
    sendMessage: async (message: string, threadId?: string): Promise<ChatResponse> => {
        const response = await apiClient.post<ChatResponse>('/chat', {
            message,
            thread_id: threadId,
        })
        return response.data
    },

    getHistory: async (threadId: string): Promise<{ thread_id: string; history: ChatMessage[] }> => {
        const response = await apiClient.get<{ thread_id: string; history: ChatMessage[] }>(
            `/chat/history/${threadId}`
        )
        return response.data
    },
}
