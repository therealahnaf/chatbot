/**
 * User Management API
 * All user-related API calls
 */

import apiClient from '@/lib/api-client'
import type {
  User,
  UserCreate,
  UserUpdate,
  PaginatedUsers,
  UserListParams,
} from '@/types/user.types'

export const usersApi = {
  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me')
    return response.data
  },

  /**
   * Update current user profile
   */
  updateCurrentUser: async (data: UserUpdate): Promise<User> => {
    const response = await apiClient.put<User>('/users/me', data)
    return response.data
  },

  /**
   * List all users (admin only, with pagination, search, filter, sort)
   */
  listUsers: async (params?: UserListParams): Promise<PaginatedUsers> => {
    const queryParams: Record<string, unknown> = {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 20,
    }

    // Add search parameter
    if (params?.search) {
      queryParams.search = params.search
    }

    // Add filter parameters
    if (params?.role) {
      queryParams.role = params.role
    }

    if (params?.is_active !== undefined) {
      queryParams.is_active = params.is_active
    }

    // Add sort parameters
    if (params?.sort_by) {
      queryParams.sort_by = params.sort_by
    }

    if (params?.sort_order) {
      queryParams.sort_order = params.sort_order
    }

    const response = await apiClient.get<PaginatedUsers>('/users', {
      params: queryParams,
    })
    return response.data
  },

  /**
   * Get user by ID (admin only)
   */
  getUserById: async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${userId}`)
    return response.data
  },

  /**
   * Create new user (admin only)
   */
  createUser: async (data: UserCreate & { role?: string }): Promise<User> => {
    const { role, ...userData } = data
    const response = await apiClient.post<User>('/users', userData, {
      params: role ? { role } : undefined,
    })
    return response.data
  },

  /**
   * Update user by ID (admin only)
   */
  updateUser: async (userId: string, data: UserUpdate): Promise<User> => {
    const response = await apiClient.put<User>(`/users/${userId}`, data)
    return response.data
  },

  /**
   * Delete user by ID (admin only)
   */
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}`)
  },

  /**
   * Activate user (admin only)
   */
  activateUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/users/${userId}/activate`)
  },

  /**
   * Deactivate user (admin only)
   */
  deactivateUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/users/${userId}/deactivate`)
  },

  /**
   * Bulk update user status (admin only)
   */
  bulkUpdateUserStatus: async (
    userIds: string[],
    isActive: boolean,
  ): Promise<User[]> => {
    const response = await apiClient.post<User[]>('/users/bulk-update-status', {
      user_ids: userIds,
      is_active: isActive,
    })
    return response.data
  },

  /**
   * Bulk delete users (admin only)
   */
  bulkDeleteUsers: async (userIds: string[]): Promise<string[]> => {
    const response = await apiClient.post<{ deleted_user_ids: string[] }>(
      '/users/bulk-delete',
      {
        user_ids: userIds,
      },
    )
    return response.data.deleted_user_ids
  },

  /**
   * Invite a new user by email (admin only)
   */
  inviteUser: async (data: {
    email: string
    role: string
    description?: string
  }): Promise<{
    message: string
    invitation_token: string
    invitation_link: string
    email: string
    role: string
    expires_at: string
  }> => {
    const response = await apiClient.post('/users/invite', data)
    return response.data
  },
}


