import { useState, useEffect } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { chatWidgetsApi } from '@/lib/api/chat-widgets.api'
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
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { WidgetPreview } from '../components/widget-preview'
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

interface WidgetEditorProps {
  widgetId?: string
}

export function WidgetEditor({ widgetId }: WidgetEditorProps) {
  const navigate = useNavigate()
  const [editWidget, setEditWidget] = useState<ChatWidgetConfig | undefined>(
    undefined
  )
  const [isLoading, setIsLoading] = useState(false)
  const [previewConfig, setPreviewConfig] = useState<Partial<ChatWidgetConfig>>(
    {
      position: 'bottom-right',
      colors: DEFAULT_WIDGET_COLORS,
      radius: DEFAULT_WIDGET_RADIUS,
      welcomeMessage: 'Hi! How can I help you today?',
      placeholder: 'Type your message...',
    }
  )

  const form = useForm<WidgetConfigFormValues>({
    resolver: zodResolver(widgetConfigSchema),
    defaultValues: editWidget
      ? {
          name: editWidget.name,
          position: editWidget.position,
          welcomeMessage: editWidget.welcomeMessage,
          placeholder: editWidget.placeholder,
          enabled: editWidget.enabled,
          colors: editWidget.colors,
          radius: editWidget.radius || DEFAULT_WIDGET_RADIUS,
          initPage: {
            ...DEFAULT_INIT_PAGE_CONFIG,
            ...(editWidget.initPage || {}),
            showStartNewMessage:
              editWidget.initPage?.showStartNewMessage ??
              DEFAULT_INIT_PAGE_CONFIG.showStartNewMessage,
            showContinueConversation:
              editWidget.initPage?.showContinueConversation ??
              DEFAULT_INIT_PAGE_CONFIG.showContinueConversation,
          },
          showBotIcon: editWidget.showBotIcon ?? true,
          showUserIcon: editWidget.showUserIcon ?? true,
        }
      : {
          name: '',
          position: 'bottom-right' as ChatWidgetPosition,
          welcomeMessage: 'Hi! How can I help you today?',
          placeholder: 'Type your message...',
          enabled: true,
          colors: DEFAULT_WIDGET_COLORS,
          radius: DEFAULT_WIDGET_RADIUS,
          initPage: DEFAULT_INIT_PAGE_CONFIG,
          showBotIcon: true,
          showUserIcon: true,
        },
  })

  // Load widget from API if editing
  useEffect(() => {
    if (widgetId) {
      setIsLoading(true)
      chatWidgetsApi
        .getWidgetById(widgetId)
        .then((widget: any) => {
          console.log('Raw widget data from API:', widget)
          // Handle both snake_case (from API) and camelCase (from types)
          const createdAtValue = widget.created_at || widget.createdAt
          const updatedAtValue = widget.updated_at || widget.updatedAt

          // Normalize colors object (handle both snake_case and camelCase)
          const colors = widget.colors || {}
          console.log('Raw colors from API:', colors)
          const normalizedColors = {
            primary: colors.primary || DEFAULT_WIDGET_COLORS.primary,
            background: colors.background || DEFAULT_WIDGET_COLORS.background,
            text: colors.text || DEFAULT_WIDGET_COLORS.text,
            userBubble:
              colors.userBubble ||
              colors.user_bubble ||
              DEFAULT_WIDGET_COLORS.userBubble,
            botBubble:
              colors.botBubble ||
              colors.bot_bubble ||
              DEFAULT_WIDGET_COLORS.botBubble,
            userText:
              colors.userText ||
              colors.user_text ||
              DEFAULT_WIDGET_COLORS.userText,
            botText:
              colors.botText ||
              colors.bot_text ||
              DEFAULT_WIDGET_COLORS.botText,
          }

          // Normalize radius object (handle both snake_case and camelCase)
          const radius = widget.radius || {}
          console.log('Raw radius from API:', radius)
          const normalizedRadius = {
            widget: Number(radius.widget) || DEFAULT_WIDGET_RADIUS.widget,
            messageBubble:
              Number(radius.messageBubble || radius.message_bubble) ||
              DEFAULT_WIDGET_RADIUS.messageBubble,
            button: Number(radius.button) || DEFAULT_WIDGET_RADIUS.button,
          }

          console.log('Normalized colors:', normalizedColors)
          console.log('Normalized radius:', normalizedRadius)

          const editWidgetData = {
            id: widget.id,
            user_id: widget.user_id,
            name: widget.name,
            position: widget.position,
            colors: normalizedColors,
            radius: normalizedRadius,
            welcomeMessage:
              widget.welcome_message || widget.welcomeMessage || '',
            placeholder: widget.placeholder || '',
            apiEndpoint: widget.api_endpoint || widget.apiEndpoint || '',
            enabled: widget.enabled ?? true,
            initPage: {
              ...DEFAULT_INIT_PAGE_CONFIG,
              ...(widget.init_page || widget.initPage || {}),
              showStartNewMessage:
                widget.init_page?.show_start_new_message ??
                widget.initPage?.showStartNewMessage ??
                DEFAULT_INIT_PAGE_CONFIG.showStartNewMessage,
              showContinueConversation:
                widget.init_page?.show_continue_conversation ??
                widget.initPage?.showContinueConversation ??
                DEFAULT_INIT_PAGE_CONFIG.showContinueConversation,
            },
            showBotIcon: widget.show_bot_icon ?? widget.showBotIcon ?? true,
            showUserIcon: widget.show_user_icon ?? widget.showUserIcon ?? true,
            createdAt: createdAtValue ? new Date(createdAtValue) : new Date(),
            updatedAt: updatedAtValue ? new Date(updatedAtValue) : new Date(),
          }

          console.log('Setting editWidget with:', editWidgetData)
          setEditWidget(editWidgetData)
        })
        .catch((error) => {
          console.error('Failed to load widget:', error)
          toast.error('Failed to load widget')
          navigate({ to: '/chat-widgets' })
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [widgetId, navigate])

  // Reset form when editWidget becomes available
  useEffect(() => {
    if (editWidget) {
      console.log('Resetting form with editWidget:', editWidget)
      // Ensure colors are fully normalized
      const formColors = {
        primary: editWidget.colors?.primary || DEFAULT_WIDGET_COLORS.primary,
        background:
          editWidget.colors?.background || DEFAULT_WIDGET_COLORS.background,
        text: editWidget.colors?.text || DEFAULT_WIDGET_COLORS.text,
        userBubble:
          editWidget.colors?.userBubble || DEFAULT_WIDGET_COLORS.userBubble,
        botBubble:
          editWidget.colors?.botBubble || DEFAULT_WIDGET_COLORS.botBubble,
        userText: editWidget.colors?.userText || DEFAULT_WIDGET_COLORS.userText,
        botText: editWidget.colors?.botText || DEFAULT_WIDGET_COLORS.botText,
      }

      // Ensure radius is fully normalized
      const formRadius = {
        widget:
          Number(editWidget.radius?.widget) || DEFAULT_WIDGET_RADIUS.widget,
        messageBubble:
          Number(editWidget.radius?.messageBubble) ||
          DEFAULT_WIDGET_RADIUS.messageBubble,
        button:
          Number(editWidget.radius?.button) || DEFAULT_WIDGET_RADIUS.button,
      }

      const formResetValues = {
        name: editWidget.name || '',
        position: editWidget.position || 'bottom-right',
        welcomeMessage: editWidget.welcomeMessage || '',
        placeholder: editWidget.placeholder || '',
        enabled: editWidget.enabled ?? true,
        colors: formColors,
        radius: formRadius,
        initPage: {
          ...DEFAULT_INIT_PAGE_CONFIG,
          ...(editWidget.initPage || {}),
          showStartNewMessage:
            editWidget.initPage?.showStartNewMessage ??
            DEFAULT_INIT_PAGE_CONFIG.showStartNewMessage,
          showContinueConversation:
            editWidget.initPage?.showContinueConversation ??
            DEFAULT_INIT_PAGE_CONFIG.showContinueConversation,
        },
        showBotIcon: editWidget.showBotIcon ?? true,
        showUserIcon: editWidget.showUserIcon ?? true,
      }

      console.log('Form reset values:', {
        name: formResetValues.name,
        colors: formResetValues.colors,
        radius: formResetValues.radius,
      })

      form.reset(formResetValues)
      setPreviewConfig(editWidget)
    }
  }, [editWidget, form])

  // Update preview when form values change
  useEffect(() => {
    const subscription = form.watch((values) => {
      // Ensure initPage has required fields for preview
      const previewValues = {
        ...values,
        initPage: {
          ...DEFAULT_INIT_PAGE_CONFIG,
          ...values.initPage,
          showStartNewMessage:
            values.initPage?.showStartNewMessage ??
            DEFAULT_INIT_PAGE_CONFIG.showStartNewMessage,
          showContinueConversation:
            values.initPage?.showContinueConversation ??
            DEFAULT_INIT_PAGE_CONFIG.showContinueConversation,
        },
        radius: {
          ...DEFAULT_WIDGET_RADIUS,
          ...values.radius,
          widget: values.radius?.widget ?? DEFAULT_WIDGET_RADIUS.widget,
          messageBubble:
            values.radius?.messageBubble ?? DEFAULT_WIDGET_RADIUS.messageBubble,
          button: values.radius?.button ?? DEFAULT_WIDGET_RADIUS.button,
        },
      }
      setPreviewConfig(previewValues as Partial<ChatWidgetConfig>)
    })
    return () => subscription.unsubscribe()
  }, [form])

  const handleSubmit = async (values: WidgetConfigFormValues) => {
    if (isLoading) return // Prevent double submission

    setIsLoading(true)
    try {
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

      // Ensure apiEndpoint is included
      const widgetData: any = {
        ...values,
        initPage: initPageData,
        radius: radiusData,
      }

      // Only include apiEndpoint if editing (preserve existing) or use default for new widgets
      if (editWidget) {
        widgetData.apiEndpoint = editWidget.apiEndpoint || '/api/v1/chat/stream'
      } else {
        widgetData.apiEndpoint = '/api/v1/chat/stream'
      }

      console.log('Submitting widget data:', widgetData)
      console.log('Is editing:', !!editWidget)

      if (editWidget) {
        await chatWidgetsApi.updateWidget(editWidget.id, widgetData)
        toast.success('Chat widget updated successfully!')
      } else {
        await chatWidgetsApi.createWidget(widgetData)
        toast.success('Chat widget created successfully!')
      }

      navigate({ to: '/chat-widgets' })
    } catch (error: any) {
      console.error('Failed to save widget:', error)
      const errorMessage =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to save widget'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmitError = (errors: any) => {
    console.error('Form validation errors:', errors)
    toast.error('Please fix the form errors before submitting')
  }

  const handleCancel = () => {
    navigate({ to: '/chat-widgets' })
  }

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <div className='flex h-full flex-col'>
          {/* Header */}
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Button
                variant='ghost'
                size='icon'
                onClick={handleCancel}
                className='shrink-0'
              >
                <ArrowLeft className='size-4' />
              </Button>
              <div>
                <h1 className='text-2xl font-bold'>
                  {editWidget ? 'Edit Chat Widget' : 'Create Chat Widget'}
                </h1>
                <p className='text-muted-foreground text-sm'>
                  Configure your widget and preview changes in real-time
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                form.handleSubmit(handleSubmit, handleFormSubmitError)()
              }}
              disabled={isLoading}
            >
              <Save className='mr-2 size-4' />
              {isLoading
                ? 'Saving...'
                : editWidget
                  ? 'Update Widget'
                  : 'Create Widget'}
            </Button>
          </div>

          {/* Main Content */}
          <div className='grid flex-1 gap-6 overflow-hidden lg:grid-cols-2'>
            {/* Left Side - Configuration Form */}
            <div className='overflow-hidden rounded-lg border'>
              <ScrollArea className='h-full'>
                <div className='p-6'>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(
                        handleSubmit,
                        handleFormSubmitError
                      )}
                      className='space-y-6'
                    >
                      <Tabs defaultValue='general' className='w-full'>
                        <TabsList className='grid w-full grid-cols-2'>
                          <TabsTrigger value='general'>General</TabsTrigger>
                          <TabsTrigger value='appearance'>
                            Appearance
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value='general' className='space-y-4'>
                          <FormField
                            control={form.control}
                            name='name'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Widget Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder='Support Chat Widget'
                                    {...field}
                                  />
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
                                  <Input
                                    placeholder='Type your message...'
                                    {...field}
                                  />
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
                                      Show a welcome page with FAQs when the
                                      widget opens
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      disabled={true}
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
                                        Multi-line welcome message shown on init
                                        page
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
                                        const faqs =
                                          form.getValues('initPage.faqs') || []
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
                                                form.getValues(
                                                  'initPage.faqs'
                                                ) || []
                                              form.setValue(
                                                'initPage.faqs',
                                                faqs.filter(
                                                  (_, i) => i !== index
                                                )
                                              )
                                            }}
                                          >
                                            <X className='size-4' />
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  )}

                                  {(form.watch('initPage.faqs') || [])
                                    .length === 0 && (
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
                                            Display option to start a new
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
                                      {/* <SelectItem value='top-right'>
                                        Top Right
                                      </SelectItem>
                                      <SelectItem value='top-left'>
                                        Top Left
                                      </SelectItem> */}
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
                                            field.onChange(
                                              parseInt(e.target.value) || 0
                                            )
                                          }
                                          className='w-full'
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
                                            field.onChange(
                                              parseInt(e.target.value) || 0
                                            )
                                          }
                                          className='w-full'
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
                                            field.onChange(
                                              parseInt(e.target.value) || 0
                                            )
                                          }
                                          className='w-full'
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
                            <h3 className='mb-4 text-base font-semibold'>
                              Color Scheme
                            </h3>
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
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
                                          className='h-10 w-14'
                                        />
                                        <Input
                                          type='text'
                                          value={field.value}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
                                          placeholder='#3b82f6'
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
                                          {...field}
                                          className='h-10 w-14'
                                        />
                                        <Input
                                          type='text'
                                          value={field.value}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
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
                                          {...field}
                                          className='h-10 w-14'
                                        />
                                        <Input
                                          type='text'
                                          value={field.value}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
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
                                          {...field}
                                          className='h-10 w-14'
                                        />
                                        <Input
                                          type='text'
                                          value={field.value}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
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
                                          {...field}
                                          className='h-10 w-14'
                                        />
                                        <Input
                                          type='text'
                                          value={field.value}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
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
                                          {...field}
                                          className='h-10 w-14'
                                        />
                                        <Input
                                          type='text'
                                          value={field.value}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
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
                      </Tabs>

                      {/* Submit Button */}
                      <div className='flex justify-end gap-3 border-t pt-6'>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                        <Button type='submit' disabled={isLoading}>
                          <Save className='mr-2 size-4' />
                          {isLoading
                            ? 'Saving...'
                            : editWidget
                              ? 'Update Widget'
                              : 'Create Widget'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </ScrollArea>
            </div>

            {/* Right Side - Live Preview */}
            <div className='overflow-hidden rounded-lg border'>
              <div className='bg-muted/50 border-b p-4'>
                <h2 className='font-semibold'>Live Preview</h2>
                <p className='text-muted-foreground text-sm'>
                  See your changes in real-time
                </p>
              </div>
              <div className='h-[calc(100%-73px)]'>
                <WidgetPreview config={previewConfig} />
              </div>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}
