import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ProjectChat } from '@/features/projects/components/project-chat'

export const Route = createFileRoute('/_authenticated/formly/')({
  component: FormlyPage,
})

function FormlyPage() {
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

      <main className='flex-1 p-4 h-screen flex flex-col'>
        <div className="flex-1">
          <ProjectChat projectId="formly" />
        </div>
      </main>
    </>
  )
}
