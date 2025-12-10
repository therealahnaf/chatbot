import { useState } from 'react'
import { format } from 'date-fns'
import {
  Code,
  Copy,
  Edit,
  MoreVertical,
  Power,
  PowerOff,
  Trash2,
  Globe,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChatWidgetConfig } from '../types/widget-types'

interface WidgetCardProps {
  widget: ChatWidgetConfig
  onEdit: (widget: ChatWidgetConfig) => void
  onDelete: (id: string) => void
  onToggleEnabled: (id: string) => void
}

export function WidgetCard({
  widget,
  onEdit,
  onDelete,
  onToggleEnabled,
}: WidgetCardProps) {
  const [showEmbedCode, setShowEmbedCode] = useState(false)

  const embedCode = `<!-- Chat Widget Embed Code -->
<div id="chat-widget-${widget.id}"></div>
<script>
  (function() {
    // Optional: Set custom API base URL (defaults to http://localhost:8000)
    // window.CHAT_WIDGET_API_BASE_URL = 'https://your-api-domain.com';
    
    // Load widget script
    var script = document.createElement('script');
    script.src = '${window.location.origin}/chat-widget.js';
    script.async = true;
    script.onload = function() {
      if (window.ChatWidget) {
        // Initialize widget by ID - config will be fetched from API
        window.ChatWidget.init('${widget.id}');
      }
    };
    document.body.appendChild(script);
  })();
</script>`

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode)
    toast.success('Embed code copied to clipboard!')
  }

  return (
    <>
      <Card className='group relative overflow-hidden transition-all hover:shadow-lg'>
        {/* Status Indicator Strip */}
        <div
          className={`absolute top-0 right-0 left-0 h-1 ${widget.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
        />

        <CardHeader className='pb-3'>
          <div className='flex items-start justify-between gap-3'>
            <div className='flex-1 space-y-1'>
              <div className='flex items-center gap-2'>
                <CardTitle className='text-lg'>{widget.name}</CardTitle>
                {widget.enabled ? (
                  <Badge variant='default' className='gap-1'>
                    <CheckCircle2 className='size-3' />
                    Active
                  </Badge>
                ) : (
                  <Badge variant='secondary' className='gap-1'>
                    <XCircle className='size-3' />
                    Inactive
                  </Badge>
                )}
              </div>
              <CardDescription className='flex items-center gap-1 text-xs'>
                <Clock className='size-3' />
                Created{' '}
                {(() => {
                  try {
                    const date =
                      widget.createdAt instanceof Date
                        ? widget.createdAt
                        : new Date(widget.createdAt)
                    return !isNaN(date.getTime())
                      ? format(date, 'MMM d, yyyy')
                      : 'Unknown'
                  } catch {
                    return 'Unknown'
                  }
                })()}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='size-8'>
                  <MoreVertical className='size-4' />
                  <span className='sr-only'>Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={() => onEdit(widget)}>
                  <Edit className='mr-2 size-4' />
                  Edit Widget
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowEmbedCode(true)}>
                  <Code className='mr-2 size-4' />
                  Get Embed Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleEnabled(widget.id)}>
                  {widget.enabled ? (
                    <>
                      <PowerOff className='mr-2 size-4' />
                      Disable Widget
                    </>
                  ) : (
                    <>
                      <Power className='mr-2 size-4' />
                      Enable Widget
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(widget.id)}
                  className='text-destructive focus:text-destructive'
                >
                  <Trash2 className='mr-2 size-4' />
                  Delete Widget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className='space-y-4'>
          {/* Welcome Message Preview */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <MessageSquare className='text-muted-foreground size-4' />
              <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                Welcome Message
              </p>
            </div>
            <p className='text-foreground/80 line-clamp-2 text-sm leading-relaxed'>
              "{widget.welcomeMessage || 'No welcome message'}"
            </p>
          </div>

          {/* Configuration Details */}
          <div className='bg-muted/50 space-y-3 rounded-lg p-3'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-xs'>Position</p>
                <p className='text-foreground text-sm font-medium capitalize'>
                  {widget.position.replace('-', ' ')}
                </p>
              </div>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-xs'>Border Radius</p>
                <p className='text-foreground text-sm font-medium'>
                  Widget: {widget.radius?.widget ?? 16}px
                </p>
              </div>
            </div>

            {/* API Endpoint */}
            <div className='space-y-1'>
              <div className='flex items-center gap-1.5'>
                <Globe className='text-muted-foreground size-3' />
                <p className='text-muted-foreground text-xs'>API Endpoint</p>
              </div>
              <p className='text-foreground truncate font-mono text-xs'>
                {widget.apiEndpoint || 'Not configured'}
              </p>
            </div>

            {/* Additional Badges */}
            <div className='flex flex-wrap gap-2'>
              {widget.colors?.primary && (
                <Badge
                  variant='outline'
                  className='gap-1 text-xs'
                  style={{ borderColor: widget.colors.primary }}
                >
                  <div
                    className='size-3 rounded-full border-2 border-white'
                    style={{ backgroundColor: widget.colors.primary }}
                  />
                  Primary
                </Badge>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className='bg-muted/30 flex items-center justify-between border-t pt-4'>
          <div className='text-muted-foreground flex items-center gap-1 text-xs'>
            <Clock className='size-3' />
            Updated{' '}
            {(() => {
              try {
                const date =
                  widget.updatedAt instanceof Date
                    ? widget.updatedAt
                    : new Date(widget.updatedAt)
                return !isNaN(date.getTime())
                  ? format(date, 'MMM d, h:mm a')
                  : 'Unknown'
              } catch {
                return 'Unknown'
              }
            })()}
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setShowEmbedCode(true)}
            className='h-8 gap-1.5 text-xs'
          >
            <Code className='size-3.5' />
            Embed
          </Button>
        </CardFooter>
      </Card>

      {/* Embed Code Dialog */}
      <Dialog open={showEmbedCode} onOpenChange={setShowEmbedCode}>
        <DialogContent className='flex max-h-[90vh] max-w-3xl flex-col'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Code className='size-5' />
              Embed Code for {widget.name}
            </DialogTitle>
            <DialogDescription>
              Copy and paste this code into your HTML to embed the chat widget
            </DialogDescription>
          </DialogHeader>

          <div className='flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden'>
            <div className='relative min-h-0 flex-1'>
              <pre className='bg-muted h-full max-h-[400px] overflow-x-auto overflow-y-auto rounded-lg p-4 text-xs'>
                <code className='block font-mono text-xs whitespace-pre'>
                  {embedCode}
                </code>
              </pre>
              <Button
                size='sm'
                variant='secondary'
                className='absolute top-2 right-2 z-10 gap-1.5'
                onClick={copyEmbedCode}
              >
                <Copy className='size-3.5' />
                Copy Code
              </Button>
            </div>

            <div className='space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30'>
              <h4 className='flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100'>
                <MessageSquare className='size-4' />
                Implementation Steps
              </h4>
              <ol className='list-inside list-decimal space-y-2 text-sm text-blue-800 dark:text-blue-200'>
                <li>Copy the embed code above</li>
                <li>
                  Paste it into your HTML file before the closing{' '}
                  <code className='rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs dark:bg-blue-900'>
                    &lt;/body&gt;
                  </code>{' '}
                  tag
                </li>
                <li>
                  Ensure{' '}
                  <code className='rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs dark:bg-blue-900'>
                    chat-widget.js
                  </code>{' '}
                  is accessible at your domain root
                </li>
                <li>The widget will automatically initialize on page load</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
