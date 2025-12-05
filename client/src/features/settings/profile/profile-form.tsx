import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCurrentUser, useUpdateCurrentUser } from '@/hooks/use-users'
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

const profileFormSchema = z.object({
  first_name: z
    .string()
    .max(50, 'First name must not be longer than 50 characters.')
    .optional()
    .nullable()
    .or(z.literal('')),
  last_name: z
    .string()
    .max(50, 'Last name must not be longer than 50 characters.')
    .optional()
    .nullable()
    .or(z.literal('')),
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Please enter a valid email address.'),
  phone_number: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine(
      (val) =>
        !val ||
        val === '' ||
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(
          val
        ),
      'Please enter a valid phone number.'
    ),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm() {
  const { data: currentUser, isLoading } = useCurrentUser()
  const updateUser = useUpdateCurrentUser()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
    },
  })

  // Load user data into form
  useEffect(() => {
    if (currentUser) {
      form.reset({
        first_name: currentUser.first_name || '',
        last_name: currentUser.last_name || '',
        email: currentUser.email,
        phone_number: currentUser.phone_number || '',
      })
    }
  }, [currentUser, form])

  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser) return

    try {
      // Build update payload with only changed fields
      // Note: Email is disabled in the form, so we don't send it to avoid backend conflicts
      const updatePayload: {
        first_name?: string
        last_name?: string
        phone_number?: string
      } = {}

      // Only include fields that have changed
      const trimmedFirstName = data.first_name?.trim() || undefined
      const trimmedLastName = data.last_name?.trim() || undefined
      const trimmedPhone = data.phone_number?.trim() || undefined

      if (trimmedFirstName !== (currentUser.first_name || '')) {
        updatePayload.first_name = trimmedFirstName
      }
      if (trimmedLastName !== (currentUser.last_name || '')) {
        updatePayload.last_name = trimmedLastName
      }
      if (trimmedPhone !== (currentUser.phone_number || '')) {
        updatePayload.phone_number = trimmedPhone
      }

      // Only send update if there are changes
      if (Object.keys(updatePayload).length > 0) {
        await updateUser.mutateAsync(updatePayload)
      }
    } catch (error) {
      // Error is handled by the hook (toast notification)
      console.error('Failed to update profile:', error)
    }
  }

  if (isLoading) {
    return (
      <div className='space-y-8'>
        <div className='space-y-2'>
          <div className='bg-muted h-4 w-32 animate-pulse rounded' />
          <div className='bg-muted h-10 w-full animate-pulse rounded' />
        </div>
        <div className='space-y-2'>
          <div className='bg-muted h-4 w-32 animate-pulse rounded' />
          <div className='bg-muted h-10 w-full animate-pulse rounded' />
        </div>
        <div className='space-y-2'>
          <div className='bg-muted h-4 w-32 animate-pulse rounded' />
          <div className='bg-muted h-10 w-full animate-pulse rounded' />
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <div className='grid gap-4 md:grid-cols-2'>
          <FormField
            control={form.control}
            name='first_name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder='John'
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  Your first name as it appears on your profile.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='last_name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Doe'
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  Your last name as it appears on your profile.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  disabled={true}
                  placeholder='john.doe@example.com'
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This is your email address. It will be used for account
                notifications and login.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='phone_number'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input
                  type='tel'
                  placeholder='+1 (555) 123-4567'
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Your phone number (optional). Include country code for
                international numbers.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={updateUser.isPending}>
          {updateUser.isPending ? 'Updating...' : 'Update profile'}
        </Button>
      </form>
    </Form>
  )
}
