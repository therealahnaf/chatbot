import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import KBDocuments from '@/features/knowledge-base/documents'
import { fileTypes } from '@/features/knowledge-base/documents/data/data'

const documentsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  // Per-column text filter (for title)
  title: z.string().optional().catch(''),
  // File type filter
  fileType: z
    .array(z.enum(fileTypes.map((t) => t.value as (typeof fileTypes)[number]['value'])))
    .optional()
    .catch([]),
  // Status filter
  status: z
    .array(z.enum(['processing', 'done', 'failed']))
    .optional()
    .catch([]),
  // Sorting
  sort_by: z.string().optional().catch(undefined),
  sort_order: z.enum(['asc', 'desc']).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/knowledge-base/document')({
  validateSearch: documentsSearchSchema,
  component: KBDocuments,
})
