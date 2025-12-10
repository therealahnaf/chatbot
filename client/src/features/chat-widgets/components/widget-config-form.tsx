import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  ChatWidgetConfig,
  ChatWidgetPosition,
  DEFAULT_WIDGET_COLORS,
  DEFAULT_WIDGET_RADIUS,
  DEFAULT_INIT_PAGE_CONFIG,
} from '../types/widget-types'

const widgetConfigSchema = z.object({
  name: z.string().min(1, 'Widget name is required'),
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']),
  welcomeMessage: z.string().min(1, 'Welcome message is required'),
  placeholder: z.string().min(1, 'Placeholder text is required'),
  apiEndpoint: z.string().url('Must be a valid URL'),
  enabled: z.boolean(),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    background: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    text: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    userBubble: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    botBubble: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    userText: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    botText: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  }),
  radius: z.object({
    widget: z.number().min(0).max(50),
    messageBubble: z.number().min(0).max(50),
    button: z.number().min(0).max(100),
  }),
  initPage: z.object({
    enabled: z.boolean(),
    welcomeMessage: z.string().optional(),
    faqs: z.array(
      z.object({
        question: z.string().min(1, 'Question is required'),
        answer: z.string().min(1, 'Answer is required'),
      })
    ),
    showStartNewMessage: z.boolean(),
    showContinueConversation: z.boolean(),
  }),
  showBotIcon: z.boolean(),
  showUserIcon: z.boolean(),
})

type WidgetConfigFormValues = z.infer<typeof widgetConfigSchema>

interface WidgetConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (config: ChatWidgetConfig) => void
  editWidget?: ChatWidgetConfig | null
}

export function WidgetConfigForm({
  open,
  onOpenChange,
  onSubmit,
  editWidget,
}: WidgetConfigFormProps) {
  const form = useForm<WidgetConfigFormValues>({
    resolver: zodResolver(widgetConfigSchema),
    defaultValues: editWidget
      ? {
          name: editWidget.name,
          position: editWidget.position,
          welcomeMessage: editWidget.welcomeMessage,
          placeholder: editWidget.placeholder,
          apiEndpoint: editWidget.apiEndpoint,
          enabled: editWidget.enabled,
          colors: editWidget.colors,
          radius: editWidget.radius || DEFAULT_WIDGET_RADIUS,
          initPage: editWidget.initPage || DEFAULT_INIT_PAGE_CONFIG,
          showBotIcon: editWidget.showBotIcon ?? true,
          showUserIcon: editWidget.showUserIcon ?? true,
        }
      : {
          name: '',
          position: 'bottom-right' as ChatWidgetPosition,
          welcomeMessage: 'Hi! How can I help you today?',
          placeholder: 'Type your message...',
          apiEndpoint: 'http://localhost:8000/api/v1/chat/stream',
          enabled: true,
          colors: DEFAULT_WIDGET_COLORS,
          radius: DEFAULT_WIDGET_RADIUS,
          initPage: DEFAULT_INIT_PAGE_CONFIG,
          showBotIcon: true,
          showUserIcon: true,
        },
  })

  const handleSubmit = (values: WidgetConfigFormValues) => {
    // Ensure initPage has all required boolean fields
    const initPageData = {
      ...DEFAULT_INIT_PAGE_CONFIG,
      ...values.initPage,
      showStartNewMessage:
        values.initPage?.showStartNewMessage ??
        DEFAULT_INIT_PAGE_CONFIG.showStartNewMessage,
      showContinueConversation:
        values.initPage?.showContinueConversation ??
        DEFAULT_INIT_PAGE_CONFIG.showContinueConversation,
    }

    // Ensure radius has all required fields
    const radiusData = {
      ...DEFAULT_WIDGET_RADIUS,
      ...values.radius,
      widget: values.radius?.widget ?? DEFAULT_WIDGET_RADIUS.widget,
      messageBubble:
        values.radius?.messageBubble ?? DEFAULT_WIDGET_RADIUS.messageBubble,
      button: values.radius?.button ?? DEFAULT_WIDGET_RADIUS.button,
    }

    const widgetConfig: ChatWidgetConfig = {
      id: editWidget?.id || Date.now().toString(),
      ...values,
      initPage: initPageData,
      radius: radiusData,
      createdAt: editWidget?.createdAt || new Date(),
      updatedAt: new Date(),
    }
    onSubmit(widgetConfig)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-3xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {editWidget ? 'Edit Chat Widget' : 'Create New Chat Widget'}
          </DialogTitle>
          <DialogDescription>
            Configure your chat widget settings including colors and appearance.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-6'
          >
            <Tabs defaultValue='general' className='w-full'>
              <TabsList className='grid w-full grid-cols-3'>
                <TabsTrigger value='general'>General</TabsTrigger>
                <TabsTrigger value='appearance'>Appearance</TabsTrigger>
                <TabsTrigger value='advanced'>Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value='general' className='space-y-4'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Widget Name</FormLabel>
                      <FormControl>
                        <Input placeholder='Support Chat Widget' {...field} />
                      </FormControl>
                      <FormDescription>
                        A unique name to identify this widget
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='welcomeMessage'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Welcome Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Hi! How can I help you today?'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Initial message shown to users
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='placeholder'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Input Placeholder</FormLabel>
                      <FormControl>
                        <Input placeholder='Type your message...' {...field} />
                      </FormControl>
                      <FormDescription>
                        Placeholder text for the input field
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='apiEndpoint'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Endpoint</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='https://api.example.com/chat'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Backend API endpoint for chat messages
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='enabled'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base'>
                          Widget Enabled
                        </FormLabel>
                        <FormDescription>
                          Enable or disable this chat widget
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Init Page Configuration */}
                <div className='bg-card rounded-lg border p-4'>
                  <FormField
                    control={form.control}
                    name='initPage.enabled'
                    render={({ field }) => (
                      <FormItem className='mb-4 flex flex-row items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel className='text-base font-semibold'>
                            Init Page
                          </FormLabel>
                          <FormDescription>
                            Show a welcome page with FAQs when the widget opens
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('initPage.enabled') && (
                    <div className='space-y-4'>
                      <FormField
                        control={form.control}
                        name='initPage.welcomeMessage'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Welcome Message</FormLabel>
                            <FormDescription className='text-xs'>
                              Multi-line welcome message shown on init page
                            </FormDescription>
                            <FormControl>
                              <Textarea
                                placeholder='Hello 👋&#10;I am a Virtual Assistant&#10;How may I help you?'
                                rows={4}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className='space-y-3'>
                        <div className='flex items-center justify-between'>
                          <FormLabel className='text-sm font-medium'>
                            Frequently Asked Questions
                          </FormLabel>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              const faqs = form.getValues('initPage.faqs') || []
                              form.setValue('initPage.faqs', [
                                ...faqs,
                                { question: '', answer: '' },
                              ])
                            }}
                          >
                            <Plus className='mr-2 size-4' />
                            Add FAQ
                          </Button>
                        </div>

                        {(form.watch('initPage.faqs') || []).map(
                          (_faq, index) => (
                            <div
                              key={index}
                              className='space-y-2 rounded-lg border p-3'
                            >
                              <div className='flex items-start justify-between gap-2'>
                                <div className='flex-1 space-y-2'>
                                  <FormField
                                    control={form.control}
                                    name={`initPage.faqs.${index}.question`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            placeholder='Question'
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`initPage.faqs.${index}.answer`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Textarea
                                            placeholder='Answer'
                                            rows={2}
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => {
                                    const faqs =
                                      form.getValues('initPage.faqs') || []
                                    form.setValue(
                                      'initPage.faqs',
                                      faqs.filter((_, i) => i !== index)
                                    )
                                  }}
                                >
                                  <X className='size-4' />
                                </Button>
                              </div>
                            </div>
                          )
                        )}

                        {(form.watch('initPage.faqs') || []).length === 0 && (
                          <p className='text-muted-foreground py-4 text-center text-sm'>
                            No FAQs added. Click "Add FAQ" to add one.
                          </p>
                        )}
                      </div>

                      <div className='space-y-3 border-t pt-4'>
                        <FormField
                          control={form.control}
                          name='initPage.showStartNewMessage'
                          render={({ field }) => (
                            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                              <div className='space-y-0.5'>
                                <FormLabel className='text-sm'>
                                  Show "Start New Message"
                                </FormLabel>
                                <FormDescription className='text-xs'>
                                  Display option to start a new conversation
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name='initPage.showContinueConversation'
                          render={({ field }) => (
                            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                              <div className='space-y-0.5'>
                                <FormLabel className='text-sm'>
                                  Show "Continue Conversation"
                                </FormLabel>
                                <FormDescription className='text-xs'>
                                  Display option to continue previous
                                  conversation
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value='appearance' className='space-y-6'>
                {/* Position */}
                <div className='bg-card rounded-lg border p-4'>
                  <FormField
                    control={form.control}
                    name='position'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-base font-semibold'>
                          Widget Position
                        </FormLabel>
                        <FormDescription className='mb-3'>
                          Choose where the widget appears on the page
                        </FormDescription>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className='h-11'>
                              <SelectValue placeholder='Select position' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='bottom-right'>
                              Bottom Right
                            </SelectItem>
                            <SelectItem value='bottom-left'>
                              Bottom Left
                            </SelectItem>
                            {/* <SelectItem value='top-right'>Top Right</SelectItem>
                            <SelectItem value='top-left'>Top Left</SelectItem> */}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Border Radius */}
                <div className='bg-card rounded-lg border p-4'>
                  <h3 className='mb-4 text-base font-semibold'>
                    Border Radius
                  </h3>
                  <div className='space-y-6'>
                    <FormField
                      control={form.control}
                      name='radius.widget'
                      render={({ field }) => (
                        <FormItem>
                          <div className='flex items-center justify-between'>
                            <FormLabel className='text-sm font-medium'>
                              Widget Window
                            </FormLabel>
                            <span className='text-muted-foreground font-mono text-sm'>
                              {field.value}px
                            </span>
                          </div>
                          <FormControl>
                            <div className='space-y-2'>
                              <input
                                type='range'
                                min={0}
                                max={50}
                                step={1}
                                value={field.value ?? 16}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                                className='range-slider w-full'
                              />
                              <div className='text-muted-foreground flex justify-between text-xs'>
                                <span>0px</span>
                                <span>50px</span>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='radius.messageBubble'
                      render={({ field }) => (
                        <FormItem>
                          <div className='flex items-center justify-between'>
                            <FormLabel className='text-sm font-medium'>
                              Message Bubbles
                            </FormLabel>
                            <span className='text-muted-foreground font-mono text-sm'>
                              {field.value}px
                            </span>
                          </div>
                          <FormControl>
                            <div className='space-y-2'>
                              <input
                                type='range'
                                min={0}
                                max={50}
                                step={1}
                                value={field.value ?? 12}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                                className='range-slider w-full'
                              />
                              <div className='text-muted-foreground flex justify-between text-xs'>
                                <span>0px</span>
                                <span>50px</span>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='radius.button'
                      render={({ field }) => (
                        <FormItem>
                          <div className='flex items-center justify-between'>
                            <FormLabel className='text-sm font-medium'>
                              Chat Button
                            </FormLabel>
                            <span className='text-muted-foreground font-mono text-sm'>
                              {field.value}%
                            </span>
                          </div>
                          <FormControl>
                            <div className='space-y-2'>
                              <input
                                type='range'
                                min={0}
                                max={100}
                                step={1}
                                value={field.value ?? 50}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                                className='range-slider w-full'
                              />
                              <div className='text-muted-foreground flex justify-between text-xs'>
                                <span>0%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription className='text-xs'>
                            Use 50% for a circular button
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className='bg-card rounded-lg border p-4'>
                  <h3 className='mb-4 text-base font-semibold'>Color Scheme</h3>
                  <div className='grid grid-cols-1 gap-5'>
                    <FormField
                      control={form.control}
                      name='colors.primary'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium'>
                            Primary Color
                          </FormLabel>
                          <FormDescription className='text-xs'>
                            Used for header, buttons, and accents
                          </FormDescription>
                          <FormControl>
                            <div className='flex gap-2'>
                              <Input
                                type='color'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className='h-10 w-14'
                              />
                              <Input
                                type='text'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder='#3b82f6'
                                className='flex-1 font-mono'
                                maxLength={7}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='colors.background'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium'>
                            Background Color
                          </FormLabel>
                          <FormDescription className='text-xs'>
                            Widget window background
                          </FormDescription>
                          <FormControl>
                            <div className='flex gap-2'>
                              <Input
                                type='color'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className='h-10 w-14'
                              />
                              <Input
                                type='text'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder='#ffffff'
                                className='flex-1 font-mono'
                                maxLength={7}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='colors.text'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium'>
                            Text Color
                          </FormLabel>
                          <FormDescription className='text-xs'>
                            Main text color
                          </FormDescription>
                          <FormControl>
                            <div className='flex gap-2'>
                              <Input
                                type='color'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className='h-10 w-14'
                              />
                              <Input
                                type='text'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder='#1f2937'
                                className='flex-1 font-mono'
                                maxLength={7}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='colors.userBubble'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium'>
                            User Message Bubble
                          </FormLabel>
                          <FormDescription className='text-xs'>
                            Color for user messages
                          </FormDescription>
                          <FormControl>
                            <div className='flex gap-2'>
                              <Input
                                type='color'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className='h-10 w-14'
                              />
                              <Input
                                type='text'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder='#3b82f6'
                                className='flex-1 font-mono'
                                maxLength={7}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='colors.botBubble'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium'>
                            Bot Message Bubble
                          </FormLabel>
                          <FormDescription className='text-xs'>
                            Color for bot/assistant messages
                          </FormDescription>
                          <FormControl>
                            <div className='flex gap-2'>
                              <Input
                                type='color'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className='h-10 w-14'
                              />
                              <Input
                                type='text'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder='#f3f4f6'
                                className='flex-1 font-mono'
                                maxLength={7}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='colors.userText'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium'>
                            User Message Text Color
                          </FormLabel>
                          <FormDescription className='text-xs'>
                            Text color for user messages
                          </FormDescription>
                          <FormControl>
                            <div className='flex gap-2'>
                              <Input
                                type='color'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className='h-10 w-14'
                              />
                              <Input
                                type='text'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder='#ffffff'
                                className='flex-1 font-mono'
                                maxLength={7}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='colors.botText'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-sm font-medium'>
                            Bot Message Text Color
                          </FormLabel>
                          <FormDescription className='text-xs'>
                            Text color for bot/assistant messages
                          </FormDescription>
                          <FormControl>
                            <div className='flex gap-2'>
                              <Input
                                type='color'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className='h-10 w-14'
                              />
                              <Input
                                type='text'
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder='#1f2937'
                                className='flex-1 font-mono'
                                maxLength={7}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Icon Visibility */}
                <div className='bg-card rounded-lg border p-4'>
                  <h3 className='mb-4 text-base font-semibold'>
                    Icon Visibility
                  </h3>
                  <div className='space-y-4'>
                    <FormField
                      control={form.control}
                      name='showBotIcon'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                          <div className='space-y-0.5'>
                            <FormLabel className='text-sm'>
                              Show Bot Icon
                            </FormLabel>
                            <FormDescription className='text-xs'>
                              Display bot icon next to bot messages
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='showUserIcon'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                          <div className='space-y-0.5'>
                            <FormLabel className='text-sm'>
                              Show User Icon
                            </FormLabel>
                            <FormDescription className='text-xs'>
                              Display user icon next to user messages
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='advanced' className='space-y-4'>
                <div className='text-muted-foreground text-sm'>
                  Advanced configuration options will be available here.
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type='submit'>
                {editWidget ? 'Update Widget' : 'Create Widget'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
