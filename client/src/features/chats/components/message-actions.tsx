import { useState } from 'react'
import { Copy, Check, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface MessageActionsProps {
  messageId: string
  content: string
  onCopy?: () => void
}

export function MessageActions({
  messageId,
  content,
  onCopy,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      // Remove markdown code blocks if present for cleaner copy
      const textToCopy = content.replace(/```[\s\S]*?```/g, (match) => {
        // Extract code from code blocks
        const codeMatch = match.match(/```[\w]*\n?([\s\S]*?)```/)
        return codeMatch ? codeMatch[1].trim() : match
      })

      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      toast.success('Message copied to clipboard')
      onCopy?.()

      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('Failed to copy message')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted'
        >
          <MoreVertical className='h-3.5 w-3.5' />
          <span className='sr-only'>Message actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? (
            <>
              <Check className='mr-2 h-4 w-4' />
              Copied!
            </>
          ) : (
            <>
              <Copy className='mr-2 h-4 w-4' />
              Copy message
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

