/**
 * Token Refresh Monitor
 * Automatically refreshes token before it expires
 */

import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { isTokenExpiringSoon, getTimeUntilExpiry } from '@/lib/auth-guard'
import { toast } from 'sonner'
import { API_PREFIX } from '@/lib/api-client'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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

export function TokenRefreshMonitor() {
  const { auth } = useAuthStore()
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  useEffect(() => {
    // Only monitor if user is authenticated
    if (!auth.accessToken || !auth.refreshToken || !auth.user) {
      return
    }

    // Check if token is already expired
    const now = Date.now()
    if (auth.user.exp && auth.user.exp <= now) {
      // Token already expired, logout
      console.warn('Token already expired, logging out')
      toast.error('Session expired. Please sign in again.')
      auth.reset()
      return
    }

    const scheduleTokenRefresh = () => {
      // Clear existing timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }

      const timeUntilExpiry = getTimeUntilExpiry()
      
      if (!timeUntilExpiry || timeUntilExpiry <= 0) {
        console.warn('Token has expired or no expiry time found')
        refreshToken()
        return
      }

      // If token expires in less than 5 minutes (or already expired), refresh now
      if (isTokenExpiringSoon() || timeUntilExpiry < 5 * 60 * 1000) {
        console.log('Token expiring soon, refreshing immediately')
        refreshToken()
        return
      }

      // Otherwise, schedule refresh for 5 minutes before expiry
      const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0)
      console.log(`Scheduling token refresh in ${Math.round(refreshTime / 1000)}s (${Math.round(refreshTime / 60000)} minutes)`)
      
      refreshTimerRef.current = setTimeout(() => {
        console.log('Scheduled token refresh triggered')
        refreshToken()
      }, refreshTime)
    }

    const refreshToken = async () => {
      // Prevent multiple simultaneous refreshes
      if (isRefreshingRef.current) {
        return
      }

      isRefreshingRef.current = true

      try {
        console.log('Refreshing token...')
        // Use raw axios call to bypass interceptor (refresh endpoint doesn't need auth header)
        const response = await axios.post(
          `${API_BASE_URL}${API_PREFIX}/auth/refresh`,
          { refresh_token: auth.refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        const { access_token, refresh_token } = response.data

        // Update tokens
        auth.setAccessToken(access_token)
        auth.setRefreshToken(refresh_token)

        // Decode new token and update user expiration
        const newExp = decodeTokenExp(access_token)
        if (newExp && auth.user) {
          const expiryDate = new Date(newExp)
          console.log(`Token refreshed successfully. New expiration: ${expiryDate.toLocaleString()}`)
          auth.setUser({
            ...auth.user,
            exp: newExp,
          })
        } else {
          console.warn('Failed to decode new token expiration')
        }

        // Schedule next refresh
        scheduleTokenRefresh()
      } catch (error: any) {
        console.error('Failed to refresh token:', error)
        console.error('Error details:', error.response?.data || error.message)
        
        // If refresh fails, logout user
        toast.error('Session expired. Please sign in again.')
        auth.reset()
      } finally {
        isRefreshingRef.current = false
      }
    }

    // Initial schedule
    scheduleTokenRefresh()

    // Cleanup on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [auth.accessToken, auth.refreshToken, auth.user?.exp])

  // This component doesn't render anything
  return null
}


