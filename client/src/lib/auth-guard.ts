/**
 * Authentication Guard Utilities
 * Provides route protection and token validation
 */

import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Check if user is authenticated with a valid token
 */
export function isAuthenticated(): boolean {
  const { auth } = useAuthStore.getState()
  
  // Check if access token exists
  if (!auth.accessToken) {
    return false
  }

  // Check if user data exists
  if (!auth.user) {
    return false
  }

  // Check if token is expired
  const now = Date.now()
  if (auth.user.exp && auth.user.exp < now) {
    return false
  }

  return true
}

/**
 * Get authentication redirect URL
 */
export function getAuthRedirect(currentPath: string) {
  return {
    to: '/sign-in',
    search: {
      redirect: currentPath,
    },
  }
}

/**
 * Check if token is about to expire (within 5 minutes)
 */
export function isTokenExpiringSoon(): boolean {
  const { auth } = useAuthStore.getState()
  
  if (!auth.user?.exp) {
    return false
  }

  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000
  
  return auth.user.exp - now < fiveMinutes
}

/**
 * Get time until token expires (in milliseconds)
 */
export function getTimeUntilExpiry(): number | null {
  const { auth } = useAuthStore.getState()
  
  if (!auth.user?.exp) {
    return null
  }

  return auth.user.exp - Date.now()
}

/**
 * Route guard for protected routes
 * Use in route.beforeLoad
 */
export async function requireAuth(opts: { 
  location: { href: string }
}): Promise<void> {
  if (!isAuthenticated()) {
    throw redirect(getAuthRedirect(opts.location.href))
  }
}

/**
 * Check if user has required role
 */
export function hasRole(requiredRole: 'admin' | 'user'): boolean {
  const { auth } = useAuthStore.getState()
  
  if (!auth.user) {
    return false
  }

  // Admin has access to everything
  if (auth.user.role === 'admin') {
    return true
  }

  return auth.user.role === requiredRole
}

/**
 * Route guard for role-based access
 */
export async function requireRole(
  requiredRole: 'admin' | 'user',
  opts: { location: { href: string } }
): Promise<void> {
  // First check if authenticated
  if (!isAuthenticated()) {
    throw redirect(getAuthRedirect(opts.location.href))
  }

  // Then check role
  if (!hasRole(requiredRole)) {
    throw redirect({ to: '/403' })
  }
}

/**
 * Redirect authenticated users away from auth pages
 */
export async function redirectIfAuthenticated(): Promise<void> {
  if (isAuthenticated()) {
    throw redirect({ to: '/' })
  }
}


