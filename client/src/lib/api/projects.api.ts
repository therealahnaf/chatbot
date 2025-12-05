import apiClient from '@/lib/api-client'
import type {
    Project,
    ProjectCreate,
    ProjectUpdate,
} from '@/features/projects/types/project-types'

export const projectsApi = {
    listProjects: async (skip = 0, limit = 100): Promise<Project[]> => {
        const response = await apiClient.get<Project[]>('/projects', {
            params: { skip, limit },
        })
        return response.data
    },

    getProject: async (id: string): Promise<Project> => {
        const response = await apiClient.get<Project>(`/projects/${id}`)
        return response.data
    },

    createProject: async (data: ProjectCreate): Promise<Project> => {
        const response = await apiClient.post<Project>('/projects', data)
        return response.data
    },

    updateProject: async (id: string, data: ProjectUpdate): Promise<Project> => {
        const response = await apiClient.put<Project>(`/projects/${id}`, data)
        return response.data
    },

    deleteProject: async (id: string): Promise<void> => {
        await apiClient.delete(`/projects/${id}`)
    },
}
