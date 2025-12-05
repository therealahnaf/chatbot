/**
 * Authentication Provider
 * Wraps the app and provides auth context
 */

import { useEffect } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { TokenRefreshMonitor } from './token-refresh-monitor'
import { isAuthenticated } from '@/lib/auth-guard'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth } = useAuthStore()

  useEffect(() => {
    // Check auth status on mount and when location changes
    const currentPath = location.pathname
    
    // Skip check for public routes
    const publicRoutes = [
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/otp',
      '/401',
      '/403',
      '/404',
      '/500',
      '/503',
    ]

    const isPublicRoute = publicRoutes.some(route => 
      currentPath.startsWith(route)
    )

    if (isPublicRoute) {
      return
    }

    // Check if user is authenticated
    if (!isAuthenticated()) {
      // Store current location for redirect after login
      navigate({
        to: '/sign-in',
        search: { redirect: currentPath },
        replace: true,
      })
    }
  }, [location.pathname, auth.accessToken, auth.user])

  return (
    <>
      {children}
      <TokenRefreshMonitor />
    </>
  )
}


