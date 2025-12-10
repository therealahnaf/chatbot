import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUpdateCurrentUser } from '@/hooks/use-users'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

const accountFormSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(100, 'Password must not be longer than 100 characters.'),
    confirm_password: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match.",
    path: ['confirm_password'],
  })
  .refine(
    (data) => data.current_password !== data.new_password,
    {
      message: 'New password must be different from current password.',
      path: ['new_password'],
    }
  )

type AccountFormValues = z.infer<typeof accountFormSchema>

export function AccountForm() {
  const updateUser = useUpdateCurrentUser()
  const [showPasswordFields, setShowPasswordFields] = useState(false)

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  const onSubmit = async (data: AccountFormValues) => {
    try {
      await updateUser.mutateAsync({
        password: data.new_password,
      })
      // Reset form and hide password fields on success
      form.reset()
      setShowPasswordFields(false)
    } catch (error) {
      // Error is handled by the hook (toast notification)
      console.error('Failed to update password:', error)
    }
  }

  return (
    <div className='space-y-8'>
      <div>
        <h3 className='text-lg font-medium'>Change Password</h3>
        <p className='text-sm text-muted-foreground'>
          Update your password to keep your account secure. Make sure to use a
          strong password.
        </p>
      </div>

      <Separator />

      {!showPasswordFields ? (
        <div className='space-y-4'>
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              Your password is securely stored. Click the button below to change
              it.
            </AlertDescription>
          </Alert>
          <Button
            type='button'
            variant='outline'
            onClick={() => setShowPasswordFields(true)}
          >
            Change Password
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='current_password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder='Enter your current password'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter your current password to verify your identity.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='new_password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder='Enter your new password'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Password must be at least 8 characters long.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='confirm_password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder='Confirm your new password'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Re-enter your new password to confirm.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex gap-2'>
              <Button
                type='submit'
                disabled={updateUser.isPending}
              >
                {updateUser.isPending ? 'Updating...' : 'Update password'}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  form.reset()
                  setShowPasswordFields(false)
                }}
                disabled={updateUser.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  )
}
