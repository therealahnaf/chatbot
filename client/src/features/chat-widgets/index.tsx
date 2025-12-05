import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Search as SearchIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { chatWidgetsApi } from '@/lib/api/chat-widgets.api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { WidgetCard } from './components/widget-card'
import { ChatWidgetConfig } from './types/widget-types'

export function ChatWidgets() {
  const navigate = useNavigate()
  const [widgets, setWidgets] = useState<ChatWidgetConfig[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [widgetToDelete, setWidgetToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load widgets from API
  const loadWidgets = async () => {
    setIsLoading(true)
    try {
      const response = await chatWidgetsApi.listWidgets({
        page: 1,
        page_size: 100,
        search: searchQuery || undefined,
      })

      const parsedWidgets = response.items.map((widget: any) => {
        // Handle both snake_case (from API) and camelCase (from types)
        const createdAtValue = widget.created_at || widget.createdAt
        const updatedAtValue = widget.updated_at || widget.updatedAt

        // Normalize colors object (handle both snake_case and camelCase)
        const colors = widget.colors || {}
        const normalizedColors = {
          primary: colors.primary || '#3b82f6',
          background: colors.background || '#ffffff',
          text: colors.text || '#1f2937',
          userBubble: colors.userBubble || colors.user_bubble || '#3b82f6',
          botBubble: colors.botBubble || colors.bot_bubble || '#f3f4f6',
          userText: colors.userText || colors.user_text || '#ffffff',
          botText: colors.botText || colors.bot_text || '#1f2937',
        }

        // Normalize radius object (handle both snake_case and camelCase)
        const radius = widget.radius || {}
        const normalizedRadius = {
          widget: Number(radius.widget) || 16,
          messageBubble:
            Number(radius.messageBubble || radius.message_bubble) || 12,
          button: Number(radius.button) || 50,
        }

        return {
          id: widget.id,
          user_id: widget.user_id,
          name: widget.name,
          position: widget.position,
          colors: normalizedColors,
          radius: normalizedRadius,
          welcomeMessage: widget.welcome_message || widget.welcomeMessage || '',
          placeholder: widget.placeholder || '',
          apiEndpoint: widget.api_endpoint || widget.apiEndpoint || '',
          enabled: widget.enabled ?? true,
          initPage: widget.init_page ||
            widget.initPage || {
              enabled: false,
              faqs: [],
              showStartNewMessage: true,
              showContinueConversation: true,
            },
          showBotIcon: widget.show_bot_icon ?? widget.showBotIcon ?? true,
          showUserIcon: widget.show_user_icon ?? widget.showUserIcon ?? true,
          createdAt: createdAtValue ? new Date(createdAtValue) : new Date(),
          updatedAt: updatedAtValue ? new Date(updatedAtValue) : new Date(),
        }
      })

      setWidgets(parsedWidgets)
    } catch (error) {
      console.error('Failed to load widgets:', error)
      toast.error('Failed to load widgets')
    } finally {
      setIsLoading(false)
    }
  }

  // Load widgets on mount
  useEffect(() => {
    loadWidgets()
  }, [])

  // Reload widgets when window gains focus (user returns to the page)
  useEffect(() => {
    const handleFocus = () => {
      loadWidgets()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const handleEdit = (widget: ChatWidgetConfig) => {
    navigate({ to: `/chat-widgets/${widget.id}/edit` })
  }

  const handleCreate = () => {
    navigate({ to: '/chat-widgets/create' })
  }

  const handleDeleteClick = (id: string) => {
    setWidgetToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (widgetToDelete) {
      try {
        await chatWidgetsApi.deleteWidget(widgetToDelete)
        setWidgets(widgets.filter((widget) => widget.id !== widgetToDelete))
        toast.success('Chat widget deleted successfully!')
      } catch (error) {
        console.error('Failed to delete widget:', error)
        toast.error('Failed to delete widget')
      } finally {
        setWidgetToDelete(null)
        setDeleteDialogOpen(false)
      }
    }
  }

  const handleToggleEnabled = async (id: string) => {
    const widget = widgets.find((w) => w.id === id)
    if (!widget) return

    try {
      await chatWidgetsApi.updateWidget(id, { enabled: !widget.enabled })
      const updatedWidgets = widgets.map((w) =>
        w.id === id ? { ...w, enabled: !w.enabled, updatedAt: new Date() } : w
      )
      setWidgets(updatedWidgets)
      toast.success(
        `Widget ${widget.enabled ? 'disabled' : 'enabled'} successfully!`
      )
    } catch (error) {
      console.error('Failed to toggle widget:', error)
      toast.error('Failed to update widget')
    }
  }

  const filteredWidgets = widgets.filter(
    (widget) =>
      widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.apiEndpoint.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

      <Main>
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Chat Widgets</h1>
            <p className='text-muted-foreground mt-1'>
              Create and manage embeddable chat widgets for your websites
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className='mr-2 size-4' />
            Create Widget
          </Button>
        </div>

        <div className='mb-6'>
          <div className='relative max-w-md'>
            <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
            <Input
              type='text'
              placeholder='Search widgets...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9'
              disabled={isLoading}
            />
          </div>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
            <span className='text-muted-foreground ml-2'>
              Loading widgets...
            </span>
          </div>
        ) : filteredWidgets.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center'>
            <div className='bg-primary/10 mx-auto flex size-16 items-center justify-center rounded-full'>
              <Plus className='text-primary size-8' />
            </div>
            <h3 className='mt-4 text-lg font-semibold'>
              {searchQuery ? 'No widgets found' : 'No chat widgets yet'}
            </h3>
            <p className='text-muted-foreground mt-2 mb-4 max-w-sm'>
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Get started by creating your first chat widget'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreate}>
                <Plus className='mr-2 size-4' />
                Create Your First Widget
              </Button>
            )}
          </div>
        ) : (
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {filteredWidgets.map((widget) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onToggleEnabled={handleToggleEnabled}
              />
            ))}
          </div>
        )}
      </Main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              chat widget and remove it from your saved configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWidgetToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
