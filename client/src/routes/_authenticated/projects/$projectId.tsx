import { createFileRoute } from '@tanstack/react-router'
import { ProjectDetailsPage } from '@/features/projects'

export const Route = createFileRoute('/_authenticated/projects/$projectId')({
  component: ProjectDetailsPage,
})
