import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { projectsApi } from '@/lib/api/projects.api'

export function ProjectDetailsPage() {
    const { projectId } = useParams({
        from: '/_authenticated/projects/$projectId',
    })

    const { data: project, isLoading } = useQuery({
        queryKey: ['projects', projectId],
        queryFn: () => projectsApi.getProject(projectId),
    })

    if (isLoading) {
        return (
            <DashboardLayout title='Loading...'>
                <div className='p-4'>Loading project...</div>
            </DashboardLayout>
        )
    }

    if (!project) {
        return (
            <DashboardLayout title='Error'>
                <div className='p-4'>Project not found</div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout
            title={project.title}
            description={`Project ID: ${project.id}`}
        >
            <div className='p-4'>
                {/* Add more project details here */}
                <p>Project content goes here...</p>
            </div>
        </DashboardLayout>
    )
}
