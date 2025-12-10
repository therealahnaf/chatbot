/**
 * Authentication related TypeScript types
 * These match the backend Pydantic schemas
 */

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name?: string
  last_name?: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface RefreshRequest {
  refresh_token: string
}

export interface UserResponse {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  role: 'admin' | 'user'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  role: 'admin' | 'user'
  exp: number
}

export interface ApiError {
  error: string
  message: string
  details?: Record<string, unknown>
}


