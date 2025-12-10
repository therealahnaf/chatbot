import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { DowntimeNotices } from '@/features/knowledge-base/system-downtime'

const downtimeNoticesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  // Search filter
  search: z.string().optional().catch(''),
  // Status filter
  status: z.string().optional().catch(''),
  // Server-side sorting
  sort_by: z.string().optional().catch(undefined),
  sort_order: z.enum(['asc', 'desc']).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/knowledge-base/downtime/')({
  validateSearch: downtimeNoticesSearchSchema,
  component: DowntimeNotices,
})
