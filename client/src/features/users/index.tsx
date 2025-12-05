import { useMemo } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useUsers } from '@/hooks/use-users'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import type { User as BackendUser } from '@/types/user.types'
import type { User as TableUser } from './data/schema'

const route = getRouteApi('/_authenticated/users/')

/**
 * Transform backend user data to match table schema
 */
function transformUserData(backendUser: BackendUser): TableUser {
  const firstName = backendUser.first_name || ''
  const lastName = backendUser.last_name || ''
  const email = backendUser.email

  return {
    id: backendUser.id,
    firstName: firstName || email.split('@')[0], // Fallback to email prefix if no first name
    lastName: lastName || '',
    email: email,
    phoneNumber: backendUser.phone_number || '',
    status: backendUser.is_active ? 'active' : 'inactive',
    role: backendUser.role === 'admin' ? 'admin' : 'user', // Map roles to table schema
    createdAt: new Date(backendUser.created_at),
    updatedAt: new Date(backendUser.updated_at),
  }
}

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  // Extract server-side params from URL search
  const page = (search.page as number) || 1
  const pageSize = (search.pageSize as number) || 10
  const emailSearch = (search.email as string) || ''
  const statusFilter = (search.status as string[]) || []
  const roleFilter = (search.role as string[]) || []

  // Extract sort params from URL
  const sortBy = (search.sort_by as string) || undefined
  const sortOrder = (search.sort_order as 'asc' | 'desc') || undefined

  // Convert table filters to server params
  const serverParams = useMemo(() => {
    const params: {
      skip: number
      limit: number
      search?: string
      role?: string
      is_active?: boolean
      sort_by?: string
      sort_order?: 'asc' | 'desc'
    } = {
      skip: (page - 1) * pageSize,
      limit: pageSize,
    }

    // Search parameter
    if (emailSearch) {
      params.search = emailSearch
    }

    // Role filter (take first if multiple)
    if (roleFilter.length > 0) {
      params.role = roleFilter[0] // Backend may need single value
    }

    // Status filter (convert to is_active boolean)
    if (statusFilter.length > 0) {
      if (statusFilter.includes('active') && !statusFilter.includes('inactive')) {
        params.is_active = true
      } else if (statusFilter.includes('inactive') && !statusFilter.includes('active')) {
        params.is_active = false
      }
      // If both selected, don't filter by status
    }

    // Sort parameters
    if (sortBy) {
      params.sort_by = sortBy
    }
    if (sortOrder) {
      params.sort_order = sortOrder
    }

    return params
  }, [page, pageSize, emailSearch, statusFilter, roleFilter, sortBy, sortOrder])

  // Fetch users with server-side params
  const { data, isLoading, isFetching, error } = useUsers(serverParams)

  // Transform API data to match table schema
  const transformedUsers = useMemo(() => {
    if (!data?.items) return []
    return data.items.map(transformUserData)
  }, [data])

  // Calculate total pages from server response
  const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0

  return (
    <UsersProvider>
      <DashboardLayout
        title='User List'
        description='Manage your users and their roles here.'
        actions={<UsersPrimaryButtons />}
      >
        {/* Error State */}
        {error && !data && (
          <Alert variant='destructive'>
            <AlertTitle>Error loading users</AlertTitle>
            <AlertDescription>
              {error.message || 'Failed to fetch users. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Table - Always render to prevent flickering */}
        {!isLoading || data ? (
          <div className='relative'>
            {/* Subtle loading indicator during refetch */}
            {isFetching && !isLoading && (
              <div className='absolute top-0 right-0 z-10 flex items-center gap-2 rounded-md bg-background/80 px-3 py-1.5 text-sm text-muted-foreground shadow-sm'>
                <Loader2 className='h-3 w-3 animate-spin' />
                <span>Updating...</span>
              </div>
            )}
            <UsersTable
              data={transformedUsers}
              search={search}
              navigate={navigate}
              pageCount={totalPages}
            />
          </div>
        ) : (
          /* Initial loading - only show on first load */
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <span className='ml-2 text-muted-foreground'>Loading users...</span>
          </div>
        )}

        <UsersDialogs />
      </DashboardLayout>
    </UsersProvider>
  )
}
