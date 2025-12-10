import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@/features/auth/sign-up'
import { redirectIfAuthenticated } from '@/lib/auth-guard'

export const Route = createFileRoute('/(auth)/sign-up')({
  // Redirect to dashboard if already authenticated
  beforeLoad: async () => {
    await redirectIfAuthenticated()
  },
  component: SignUp,
})
