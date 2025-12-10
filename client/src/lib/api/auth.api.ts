/**
 * Authentication API endpoints
 */

import apiClient from '@/lib/api-client'
import type { 
  LoginRequest, 
  RegisterRequest, 
  TokenResponse, 
  RefreshRequest,
  UserResponse 
} from '@/types/auth.types'

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<UserResponse> => {
    const response = await apiClient.post<UserResponse>('/auth/register', data)
    return response.data
  },

  /**
   * Login with email and password
   */
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/auth/login', data)
    return response.data
  },

  /**
   * Refresh access token
   */
  refresh: async (data: RefreshRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/auth/refresh', data)
    return response.data
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await apiClient.get<UserResponse>('/users/me')
    return response.data
  },
}


