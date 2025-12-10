import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { requireRole } from '@/lib/auth-guard'

export const Route = createFileRoute('/_authenticated')({
  // Protect all routes under _authenticated - ADMIN ONLY
  beforeLoad: async ({ location }) => {
    await requireRole('admin', { location })
  },
  component: AuthenticatedLayout,
})
