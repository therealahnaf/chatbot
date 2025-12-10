/**
 * Authentication hooks using React Query
 * Provides caching, automatic refetching, and optimistic updates
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from '@/lib/api/auth.api'
import { useAuthStore } from '@/stores/auth-store'
import type { 
  LoginRequest, 
  RegisterRequest, 
  TokenResponse,
  UserResponse,
  AuthUser 
} from '@/types/auth.types'
import { toast } from 'sonner'

/**
 * Decode JWT token to get user data
 */
function decodeToken(token: string): AuthUser | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    
    const payload = JSON.parse(jsonPayload)
    
    // The backend stores user_id in 'sub' field
    return {
      id: payload.sub,
      email: payload.email || '',
      first_name: payload.first_name || null,
      last_name: payload.last_name || null,
      phone_number: payload.phone_number || null,
      role: payload.role || 'user',
      exp: payload.exp * 1000, // Convert to milliseconds
    }
  } catch (error) {
    console.error('Failed to decode token:', error)
    return null
  }
}

/**
 * Hook for user registration
 */
export function useRegister() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data: UserResponse) => {
      toast.success('Account created successfully! Please sign in.')
      navigate({ to: '/sign-in' })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Registration failed. Please try again.'
      toast.error(message)
    },
  })
}

/**
 * Hook for user login
 */
export function useLogin() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data: TokenResponse) => {
      // Store tokens
      auth.setAccessToken(data.access_token)
      auth.setRefreshToken(data.refresh_token)

      // Decode token to get expiration and user_id
      const tokenPayload = decodeToken(data.access_token)
      
      // Fetch full user data from API
      let user: AuthUser
      try {
        const userData = await authApi.getCurrentUser()
        user = {
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone_number: userData.phone_number,
          role: userData.role,
          exp: tokenPayload?.exp || Date.now() + 24 * 60 * 60 * 1000,
        }
        auth.setUser(user)
      } catch (error) {
        console.error('Failed to fetch user data:', error)
        // If we can't fetch user data, at least set minimal info from token
        if (tokenPayload) {
          user = {
            id: tokenPayload.id,
            email: '',
            first_name: null,
            last_name: null,
            phone_number: null,
            role: 'user',
            exp: tokenPayload.exp,
          }
          auth.setUser(user)
        } else {
          // No token payload, cannot proceed
          return
        }
      }

      // Invalidate and refetch any cached data
      queryClient.invalidateQueries()


      // Check if user is admin
      if (user.role !== 'admin') {
        // Non-admin users cannot access the app
        toast.error('Access denied. Admin privileges required.')
        
        // Sign them out and redirect to sign-in
        auth.reset()
        navigate({ to: '/sign-in', replace: true })
        return
      }

      toast.success('Welcome back!')
      
      // Navigate to dashboard (admin only)
      navigate({ to: '/', replace: true })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Invalid email or password.'
      toast.error(message)
    },
  })
}

/**
 * Hook for user logout
 */
export function useLogout() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()

  return () => {
    // Clear auth state
    auth.reset()
    
    // Clear all cached queries
    queryClient.clear()
    
    toast.success('Logged out successfully')
    
    // Navigate to sign-in
    navigate({ to: '/sign-in', replace: true })
  }
}

/**
 * Hook to get current user data
 * Uses React Query for caching and automatic refetching
 */
export function useCurrentUser() {
  const { auth } = useAuthStore()

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getCurrentUser,
    enabled: !!auth.accessToken, // Only run if user is authenticated
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
    retry: 1,
  })
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { auth } = useAuthStore()
  const now = Date.now()

  // Check if token exists and is not expired
  return !!auth.accessToken && !!auth.user && auth.user.exp > now
}

