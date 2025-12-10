/**
 * Require Role Component
 * Shows content only to users with specific role
 */

import { ReactNode } from 'react'
import { Navigate } from '@tanstack/react-router'
import { hasRole } from '@/lib/auth-guard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface RequireRoleProps {
  role: 'admin' | 'user'
  children: ReactNode
  fallback?: ReactNode
  redirectTo?: string
}

export function RequireRole({ 
  role, 
  children, 
  fallback,
  redirectTo = '/403' 
}: RequireRoleProps) {
  if (!hasRole(role)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} />
    }

    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this content. 
            {role === 'admin' && ' This area is restricted to administrators only.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <>{children}</>
}


