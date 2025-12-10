import { useRouter } from '@tanstack/react-router'
import { useLogout } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export function ForbiddenError() {
  const { history } = useRouter()
  const logout = useLogout()

  const handleSignOut = () => {
    logout()
  }

  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-4 px-4'>
        <div className='flex flex-col items-center gap-2'>
          <AlertTriangle className='h-16 w-16 text-destructive' />
          <h1 className='text-[7rem] leading-tight font-bold'>403</h1>
          <span className='text-2xl font-medium'>Access Forbidden</span>
        </div>
        
        <div className='max-w-md text-center'>
          <p className='text-lg text-muted-foreground mb-2'>
            Admin Access Required
          </p>
          <p className='text-muted-foreground'>
            This application is restricted to administrators only.
            Please contact your system administrator if you need access.
          </p>
        </div>

        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            Go Back
          </Button>
          <Button variant='destructive' onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
