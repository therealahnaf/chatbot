/**
 * User Management Hooks using TanStack React Query
 * Provides caching, automatic refetching, and optimistic updates
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api/users.api'
import type {
  User,
  UserUpdate,
  UserListParams,
} from '@/types/user.types'
import { toast } from 'sonner'

/**
 * Query Keys for user management
 * Organized by entity and operation
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  currentUser: () => [...userKeys.all, 'current'] as const,
}

/**
 * Hook: Get current user profile
 * Cached for 5 minutes
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.currentUser(),
    queryFn: usersApi.getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })
}

/**
 * Hook: Update current user profile
 */
export function useUpdateCurrentUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.updateCurrentUser,
    onSuccess: (updatedUser) => {
      // Update current user cache
      queryClient.setQueryData(userKeys.currentUser(), updatedUser)
      
      // Also update in lists if present
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      
      toast.success('Profile updated successfully!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update profile'
      toast.error(message)
    },
  })
}

/**
 * Hook: List all users with pagination
 * Cached with pagination params
 */
export function useUsers(params?: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersApi.listUsers(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Keep previous data while fetching new data to prevent flickering
    placeholderData: (previousData) => previousData,
    // Refetch on window focus but don't show loading state immediately
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook: Get user by ID
 * Cached for 5 minutes
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => usersApi.getUserById(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!userId, // Only run if userId exists
  })
}

/**
 * Hook: Create new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      // Invalidate all user lists to refetch with new user
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      
      toast.success('User created successfully!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to create user'
      toast.error(message)
    },
  })
}

/**
 * Hook: Update user by ID
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdate }) =>
      usersApi.updateUser(userId, data),
    onMutate: async ({ userId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) })

      // Snapshot previous value
      const previousUser = queryClient.getQueryData<User>(userKeys.detail(userId))

      // Optimistically update
      if (previousUser) {
        queryClient.setQueryData<User>(userKeys.detail(userId), (old) => {
          if (!old) return old
          return {
            ...old,
            ...data,
            role: (data.role as 'admin' | 'user') || old.role,
          }
        })
      }

      return { previousUser }
    },
    onSuccess: (updatedUser, { userId }) => {
      // Update detail cache
      queryClient.setQueryData(userKeys.detail(userId), updatedUser)
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      
      toast.success('User updated successfully!')
    },
    onError: (error: any, { userId }, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), context.previousUser)
      }
      
      const message = error.response?.data?.detail || error.response?.data?.message || 'Failed to update user'
      toast.error(message)
    },
  })
}

/**
 * Hook: Delete user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: (_, userId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: userKeys.detail(userId) })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      
      toast.success('User deleted successfully!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete user'
      toast.error(message)
    },
  })
}

/**
 * Hook: Activate user
 */
export function useActivateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.activateUser,
    onSuccess: (_, userId) => {
      // Optimistically update is_active
      queryClient.setQueryData<User>(
        userKeys.detail(userId),
        (old) => old ? { ...old, is_active: true } : undefined
      )
      
      // Invalidate to refetch accurate data
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      
      toast.success('User activated successfully!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to activate user'
      toast.error(message)
    },
  })
}

/**
 * Hook: Deactivate user
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.deactivateUser,
    onSuccess: (_, userId) => {
      // Optimistically update is_active
      queryClient.setQueryData<User>(
        userKeys.detail(userId),
        (old) => old ? { ...old, is_active: false } : undefined
      )
      
      // Invalidate to refetch accurate data
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      
      toast.success('User deactivated successfully!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to deactivate user'
      toast.error(message)
    },
  })
}

/**
 * Hook: Bulk update user status
 */
export function useBulkUpdateUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      userIds,
      isActive,
    }: {
      userIds: string[]
      isActive: boolean
    }) => usersApi.bulkUpdateUserStatus(userIds, isActive),
    onSuccess: (updatedUsers, { isActive }) => {
      // Update cache for each updated user
      updatedUsers.forEach((user) => {
        queryClient.setQueryData<User>(userKeys.detail(user.id), (old) => {
          if (!old) return old
          return {
            ...old,
            is_active: isActive,
          }
        })
      })

      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })

      const count = updatedUsers.length
      const action = isActive ? 'activated' : 'deactivated'
      toast.success(`Successfully ${action} ${count} user${count > 1 ? 's' : ''}!`)
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        `Failed to update user status`
      toast.error(message)
    },
  })
}

/**
 * Hook: Bulk delete users
 */
export function useBulkDeleteUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userIds: string[]) => usersApi.bulkDeleteUsers(userIds),
    onSuccess: (deletedUserIds) => {
      // Remove deleted users from cache
      deletedUserIds.forEach((userId) => {
        queryClient.removeQueries({ queryKey: userKeys.detail(userId) })
      })

      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })

      const count = deletedUserIds.length
      toast.success(`Successfully deleted ${count} user${count > 1 ? 's' : ''}!`)
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to delete users'
      toast.error(message)
    },
  })
}

/**
 * Hook: Prefetch user data
 * Useful for hover states or predictive loading
 */
export function usePrefetchUser() {
  const queryClient = useQueryClient()

  return (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: userKeys.detail(userId),
      queryFn: () => usersApi.getUserById(userId),
      staleTime: 5 * 60 * 1000,
    })
  }
}

/**
 * Hook: Invite user by email
 */
export function useInviteUser() {
  return useMutation({
    mutationFn: usersApi.inviteUser,
    onSuccess: (data) => {
      toast.success(data.message || 'Invitation sent successfully!')
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to send invitation'
      toast.error(message)
    },
  })
}


