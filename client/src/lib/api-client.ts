import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Decode JWT token to get expiration time
 */
function decodeTokenExp(token: string): number | null {
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
    // JWT exp is in seconds, convert to milliseconds
    return payload.exp ? payload.exp * 1000 : null
  } catch (error) {
    console.error('Failed to decode token:', error)
    return null
  }
}

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
export const API_PREFIX = '/api/v1'

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { auth } = useAuthStore.getState()

    if (auth.accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Track if we're currently refreshing to prevent multiple simultaneous refresh attempts
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })

  failedQueue = []
}

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const state = useAuthStore.getState()
        const refreshToken = state.auth.refreshToken

        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        // Try to refresh the token using a new axios instance to avoid interceptors
        const response = await axios.post(
          `${API_BASE_URL || ''}${API_PREFIX}/auth/refresh`,
          { refresh_token: refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        const { access_token, refresh_token } = response.data

        // Update tokens in store
        state.auth.setAccessToken(access_token)
        state.auth.setRefreshToken(refresh_token)

        // Decode new token and update user expiration
        const newExp = decodeTokenExp(access_token)
        if (newExp && state.auth.user) {
          state.auth.setUser({
            ...state.auth.user,
            exp: newExp,
          })
        }

        // Process queued requests
        processQueue()

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`
        }

        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed, clear queue and logout user
        processQueue(refreshError)

        const state = useAuthStore.getState()
        state.auth.reset()

        // Redirect to login page
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          window.location.href = `/sign-in?redirect=${encodeURIComponent(currentPath)}`
        }

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient

