import { z } from 'zod'

const documentStatusSchema = z.union([
  z.literal('processing'),
  z.literal('done'),
  z.literal('failed'),
])
export type DocumentStatus = z.infer<typeof documentStatusSchema>

const documentSchema = z.object({
  id: z.string(),
  userId: z.string(), // Document owner ID
  title: z.string(),
  filename: z.string(),
  fileType: z.string().nullable(),
  fileSize: z.number().nullable(),
  status: documentStatusSchema,
  chunkCount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Document = z.infer<typeof documentSchema>

export const documentListSchema = z.array(documentSchema)

