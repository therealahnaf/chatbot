import { useMemo } from 'react'
import { useLayout } from '@/context/layout-provider'
import { useDisplayPreferences } from '@/hooks/use-display-preferences'
import { useCurrentUser } from '@/hooks/use-users'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'
import { filterSidebarItems } from './utils/sidebar-filter'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { preferences } = useDisplayPreferences()
  const { data: currentUser, isLoading } = useCurrentUser()



  // Filter sidebar items based on display preferences
  const filteredNavGroups = filterSidebarItems(
    sidebarData.navGroups,
    preferences.items
  )

  // Transform user data for NavUser component
  const userData = useMemo(() => {
    if (!currentUser) {
      // Fallback to default if no user data
      return {
        name: 'Guest User',
        email: 'guest@example.com',
        avatar: '/avatars/shadcn.jpg',
      }
    }

    const firstName = currentUser.first_name || ''
    const lastName = currentUser.last_name || ''
    const fullName =
      `${firstName} ${lastName}`.trim() || currentUser.email.split('@')[0]

    // Generate initials for avatar fallback
    const getInitials = (name: string) => {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    }

    return {
      name: fullName,
      email: currentUser.email,
      avatar: `/avatars/${getInitials(fullName)}.jpg`, // You can customize this
    }
  }, [currentUser])

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {filteredNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}


      </SidebarContent>
      <SidebarFooter>{!isLoading && <NavUser user={userData} />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
