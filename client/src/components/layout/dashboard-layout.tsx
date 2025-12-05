import { Outlet } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'

interface DashboardLayoutProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children?: React.ReactNode
}

/**
 * Shared dashboard layout with Header, Main, and common navigation
 * Wraps child routes automatically using <Outlet />
 */
export function DashboardLayout({
  title,
  description,
  actions,
  children,
}: DashboardLayoutProps) {
  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {/* Optional page header */}
        {(title || description || actions) && (
          <div className='flex flex-wrap items-end justify-between gap-2'>
            {(title || description) && (
              <div>
                {title && (
                  <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
                )}
                {description && (
                  <p className='text-muted-foreground'>{description}</p>
                )}
              </div>
            )}
            {actions}
          </div>
        )}

        {/* Render children or nested routes */}
        {children ?? <Outlet />}
      </Main>
    </>
  )
}

