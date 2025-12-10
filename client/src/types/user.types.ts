/**
 * User Management TypeScript Types
 * Matches backend Pydantic schemas
 */

export interface User {
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

export interface UserCreate {
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone_number?: string
}

export interface UserUpdate {
  email?: string
  first_name?: string
  last_name?: string
  phone_number?: string
  password?: string
  role?: 'admin' | 'user' | string
}

export interface PaginatedUsers {
  items: User[]
  total: number
  skip: number
  limit: number
}

export interface UserListParams {
  skip?: number
  limit?: number
  search?: string // Search by email, first_name, or last_name
  role?: 'admin' | 'user' | string // Filter by role
  is_active?: boolean // Filter by active status
  sort_by?: string // Sort column (e.g., 'email', 'created_at')
  sort_order?: 'asc' | 'desc' // Sort direction
}

export interface UserFilters {
  role?: 'admin' | 'user'
  is_active?: boolean
  search?: string
}


