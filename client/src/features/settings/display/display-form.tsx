import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDisplayPreferences, type DisplayItemId } from '@/hooks/use-display-preferences'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'

const items: Array<{ id: DisplayItemId; label: string }> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
  },
  {
    id: 'tickets',
    label: 'Tickets',
  },
  {
    id: 'chats',
    label: 'Chats',
  },
  {
    id: 'chat-widgets',
    label: 'Chat Widgets',
  },
  {
    id: 'users',
    label: 'Users',
  },
  {
    id: 'kb-document',
    label: 'KB Document',
  },
  {
    id: 'worker-status',
    label: 'Worker Status',
  },
  {
    id: 'system-downtime',
    label: 'System Downtime',
  },
  {
    id: 'help-center',
    label: 'Help Center',
  },
] as const

const displayFormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one item.',
  }),
})

type DisplayFormValues = z.infer<typeof displayFormSchema>

export function DisplayForm() {
  const { preferences, updateItems } = useDisplayPreferences()
  
  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues: {
      items: preferences.items,
    },
  })

  // Update form when preferences change
  useEffect(() => {
    form.reset({ items: preferences.items })
  }, [preferences.items, form])

  const onSubmit = (data: DisplayFormValues) => {
    updateItems(data.items as DisplayItemId[])
    toast.success('Display preferences updated successfully!')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='items'
          render={() => (
            <FormItem>
              <div className='mb-4'>
                <FormLabel className='text-base'>Sidebar</FormLabel>
                <FormDescription>
                  Select the items you want to display in the sidebar.
                </FormDescription>
              </div>
              {items.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name='items'
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className='flex flex-row items-start'
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className='font-normal'>
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>Update display</Button>
      </form>
    </Form>
  )
}
