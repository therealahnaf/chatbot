import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { redirectIfAuthenticated } from '@/lib/auth-guard'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  // Redirect to dashboard if already authenticated
  beforeLoad: async () => {
    await redirectIfAuthenticated()
  },
  component: SignIn,
  validateSearch: searchSchema,
})
