import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

    const isFormzed = project.title === 'Formzed'

    return (
        <DashboardLayout
            title={project.title}
            description={`Project ID: ${project.id}`}
        >
            <div className='p-4'>
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        {isFormzed && <TabsTrigger value="chat">Chat</TabsTrigger>}
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <div className="p-4 border rounded-lg">
                            <h3 className="text-lg font-medium">Project Overview</h3>
                            <p className="text-muted-foreground mt-2">
                                Details for project {project.title}
                            </p>
                        </div>
                    </TabsContent>

                    {isFormzed && (
                        <TabsContent value="chat" className="space-y-4">
                            <ProjectChat projectId={project.id} />
                        </TabsContent>
                    )}

                    <TabsContent value="settings" className="space-y-4">
                        <div className="p-4 border rounded-lg">
                            <h3 className="text-lg font-medium">Project Settings</h3>
                            <p className="text-muted-foreground mt-2">
                                Settings configuration would go here.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    )
}
