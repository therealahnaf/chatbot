import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Workers } from '@/features/knowledge-base/work-status'

const workersSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  // Search filter
  search: z.string().optional().catch(''),
  // Status filter
  status: z.string().optional().catch(''),
  // Contact info filter (client-side)
  hasContactInfo: z
    .union([
      z.literal('has_email'),
      z.literal('no_email'),
      z.literal('has_address'),
      z.literal('no_address'),
    ])
    .optional()
    .catch(undefined),
  // Server-side sorting
  sort_by: z.string().optional().catch(undefined),
  sort_order: z.enum(['asc', 'desc']).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/knowledge-base/worker-status/')({
  validateSearch: workersSearchSchema,
  component: Workers,
})
