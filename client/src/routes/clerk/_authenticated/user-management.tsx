import { useEffect, useMemo, useState } from 'react'
import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { SignedIn, useAuth, UserButton } from '@clerk/clerk-react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { ClerkLogo } from '@/assets/clerk-logo'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { LearnMore } from '@/components/learn-more'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useUsers } from '@/hooks/use-users'
import { UsersDialogs } from '@/features/users/components/users-dialogs'
import { UsersPrimaryButtons } from '@/features/users/components/users-primary-buttons'
import { UsersProvider } from '@/features/users/components/users-provider'
import { UsersTable } from '@/features/users/components/users-table'
import type { User as BackendUser } from '@/types/user.types'
import type { User as TableUser } from '@/features/users/data/schema'

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
    role: backendUser.role === 'admin' ? 'admin' : 'user',
    createdAt: new Date(backendUser.created_at),
    updatedAt: new Date(backendUser.updated_at),
  }
}

export const Route = createFileRoute('/clerk/_authenticated/user-management')({
  component: UserManagement,
})

function UserManagement() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [opened, setOpened] = useState(true)
  const { isLoaded, isSignedIn } = useAuth()

  // Extract server-side params from URL search
  const searchParams = search as Record<string, unknown>
  const page = (searchParams.page as number) || 1
  const pageSize = (searchParams.pageSize as number) || 10
  const emailSearch = (searchParams.email as string) || ''
  const statusFilter = (searchParams.status as string[]) || []
  const roleFilter = (searchParams.role as string[]) || []
  const sortBy = (searchParams.sort_by as string) || undefined
  const sortOrder = (searchParams.sort_order as 'asc' | 'desc') || undefined

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

    if (emailSearch) {
      params.search = emailSearch
    }

    if (roleFilter.length > 0) {
      params.role = roleFilter[0]
    }

    if (statusFilter.length > 0) {
      if (statusFilter.includes('active') && !statusFilter.includes('inactive')) {
        params.is_active = true
      } else if (statusFilter.includes('inactive') && !statusFilter.includes('active')) {
        params.is_active = false
      }
    }

    if (sortBy) {
      params.sort_by = sortBy
    }

    if (sortOrder) {
      params.sort_order = sortOrder
    }

    return params
  }, [page, pageSize, emailSearch, statusFilter, roleFilter, sortBy, sortOrder])

  // Fetch users with server-side params
  const { data, isLoading, error } = useUsers(serverParams)

  // Transform API data to match table schema
  const transformedUsers = useMemo(() => {
    if (!data?.items) return []
    return data.items.map(transformUserData)
  }, [data])

  // Calculate total pages from server response
  const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0

  if (!isLoaded) {
    return (
      <div className='flex h-svh items-center justify-center'>
        <Loader2 className='size-8 animate-spin' />
      </div>
    )
  }

  if (!isSignedIn) {
    return <Unauthorized />
  }

  return (
    <>
      <SignedIn>
        <UsersProvider>
          <Header fixed>
            <Search />
            <div className='ms-auto flex items-center space-x-4'>
              <ThemeSwitch />
              <UserButton />
            </div>
          </Header>

          <Main>
            <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
              <div>
                <h2 className='text-2xl font-bold tracking-tight'>User List</h2>
                <div className='flex gap-1'>
                  <p className='text-muted-foreground'>
                    Manage your users and their roles here.
                  </p>
                  <LearnMore
                    open={opened}
                    onOpenChange={setOpened}
                    contentProps={{ side: 'right' }}
                  >
                    <p>
                      This is the same as{' '}
                      <Link
                        to='/users'
                        className='text-blue-500 underline decoration-dashed underline-offset-2'
                      >
                        '/users'
                      </Link>
                    </p>

                    <p className='mt-4'>
                      You can sign out or manage/delete your account via the
                      User Profile menu in the top-right corner of the page.
                      <ExternalLink className='inline-block size-4' />
                    </p>
                  </LearnMore>
                </div>
              </div>
              <UsersPrimaryButtons />
            </div>
            <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
              {isLoading && (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                  <span className='ml-2 text-muted-foreground'>Loading users...</span>
                </div>
              )}

              {error && (
                <Alert variant='destructive'>
                  <AlertTitle>Error loading users</AlertTitle>
                  <AlertDescription>
                    {error.message || 'Failed to fetch users. Please try again.'}
                  </AlertDescription>
                </Alert>
              )}

              {!isLoading && !error && (
                <UsersTable
                  data={transformedUsers}
                  navigate={navigate}
                  search={search}
                  pageCount={totalPages}
                />
              )}
            </div>
          </Main>

          <UsersDialogs />
        </UsersProvider>
      </SignedIn>
    </>
  )
}

const COUNTDOWN = 5 // Countdown second

function Unauthorized() {
  const navigate = useNavigate()
  const { history } = useRouter()

  const [opened, setOpened] = useState(true)
  const [cancelled, setCancelled] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN)

  // Set and run the countdown conditionally
  useEffect(() => {
    if (cancelled || opened) return
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [cancelled, opened])

  // Navigate to sign-in page when countdown hits 0
  useEffect(() => {
    if (countdown > 0) return
    navigate({ to: '/clerk/sign-in' })
  }, [countdown, navigate])

  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>401</h1>
        <span className='font-medium'>Unauthorized Access</span>
        <p className='text-muted-foreground text-center'>
          You must be authenticated via Clerk{' '}
          <sup>
            <LearnMore open={opened} onOpenChange={setOpened}>
              <p>
                This is the same as{' '}
                <Link
                  to='/users'
                  className='text-blue-500 underline decoration-dashed underline-offset-2'
                >
                  '/users'
                </Link>
                .{' '}
              </p>
              <p>You must first sign in using Clerk to access this route. </p>

              <p className='mt-4'>
                After signing in, you'll be able to sign out or delete your
                account via the User Profile dropdown on this page.
              </p>
            </LearnMore>
          </sup>
          <br />
          to access this resource.
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            Go Back
          </Button>
          <Button onClick={() => navigate({ to: '/clerk/sign-in' })}>
            <ClerkLogo className='invert' /> Sign in
          </Button>
        </div>
        <div className='mt-4 h-8 text-center'>
          {!cancelled && !opened && (
            <>
              <p>
                {countdown > 0
                  ? `Redirecting to Sign In page in ${countdown}s`
                  : `Redirecting...`}
              </p>
              <Button variant='link' onClick={() => setCancelled(true)}>
                Cancel Redirect
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
