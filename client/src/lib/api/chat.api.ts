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
        const response = await apiClient.post<ChatResponse>('/formzed-chat', {
            message,
            thread_id: threadId,
        })
        return response.data
    },

    getHistory: async (threadId: string): Promise<{ thread_id: string; history: ChatMessage[]; final_json?: any }> => {
        const response = await apiClient.get<{ thread_id: string; history: ChatMessage[]; final_json?: any }>(
            `/formzed-chat/history/${threadId}`
        )
        return response.data
    },

    getThreads: async (): Promise<{ threads: string[] }> => {
        const response = await apiClient.get<{ threads: string[] }>('/formzed-chat/threads')
        return response.data
    },
    getSharedForm: async (threadId: string): Promise<{ final_json: any }> => {
        const response = await apiClient.get<{ final_json: any }>(`/formzed-chat/share/${threadId}`)
        return response.data
    },
}
