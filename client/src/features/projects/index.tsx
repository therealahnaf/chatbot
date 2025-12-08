import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { projectsApi } from '@/lib/api/projects.api'
import { ProjectChat } from './components/project-chat'

export function ProjectDetailsPage() {
    const { projectId } = useParams({
        from: '/_authenticated/projects/$projectId',
    })

    const { data: project, isLoading } = useQuery({
        queryKey: ['projects', projectId],
        queryFn: () => projectsApi.getProject(projectId),
    })

    if (isLoading) {
        return <div className='p-4'>Loading project...</div>
    }

    if (!project) {
        return <div className='p-4'>Project not found</div>
    }

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
                    <ProjectChat projectId={project.id} />
                </div>
            </main>
        </>
    )
}
