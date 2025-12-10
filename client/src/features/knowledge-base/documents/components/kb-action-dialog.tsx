import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { useUploadDocument } from '@/hooks/use-document'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface KBActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KBActionDialog({ open, onOpenChange }: KBActionDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [metadata, setMetadata] = useState('')
  const [chunkingStrategy, setChunkingStrategy] = useState<'section' | 'token'>('section')
  const [chunkSize, setChunkSize] = useState('500')
  const [chunkOverlap, setChunkOverlap] = useState('50')
  const [error, setError] = useState('')

  const uploadMutation = useUploadDocument()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    const validTypes = ['pdf', 'txt', 'docx', 'md']
    const extension = selectedFile.name.split('.').pop()?.toLowerCase()

    if (!extension || !validTypes.includes(extension)) {
      setError(`Invalid file type. Supported: ${validTypes.join(', ').toUpperCase()}`)
      setFile(null)
      return
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 50MB')
      setFile(null)
      return
    }

    setError('')
    setFile(selectedFile)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError('Please select a file')
      return
    }

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    // Parse metadata if provided
    let parsedMetadata = undefined
    if (metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(metadata)
      } catch {
        setError('Invalid JSON metadata')
        return
      }
    }

    // Validate chunking parameters
    const parsedChunkSize = parseInt(chunkSize)
    const parsedChunkOverlap = parseInt(chunkOverlap)

    if (chunkingStrategy === 'token') {
      if (isNaN(parsedChunkSize) || parsedChunkSize < 100 || parsedChunkSize > 2000) {
        setError('Chunk size must be between 100 and 2000')
        return
      }
      if (isNaN(parsedChunkOverlap) || parsedChunkOverlap < 0 || parsedChunkOverlap >= parsedChunkSize) {
        setError('Chunk overlap must be between 0 and chunk size')
        return
      }
    }

    try {
      await uploadMutation.mutateAsync({
        file,
        title: title.trim(),
        metadata: parsedMetadata,
        chunking_strategy: chunkingStrategy,
        chunk_size: parsedChunkSize,
        chunk_overlap: parsedChunkOverlap,
      })

      // Reset form
      setFile(null)
      setTitle('')
      setMetadata('')
      setChunkingStrategy('section')
      setChunkSize('500')
      setChunkOverlap('50')
      setError('')
      onOpenChange(false)
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleCancel = () => {
    if (!uploadMutation.isPending) {
      setFile(null)
      setTitle('')
      setMetadata('')
      setChunkingStrategy('section')
      setChunkSize('500')
      setChunkOverlap('50')
      setError('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className='sm:max-w-[550px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document to your knowledge base. Supported formats: PDF, TXT,
            DOCX, MD (max 50MB)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-4'>
            {/* Title Input */}
            <div className='space-y-2'>
              <Label htmlFor='title'>Document Title *</Label>
              <Input
                id='title'
                placeholder='Enter document title'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploadMutation.isPending}
              />
            </div>

            {/* File Input */}
            <div className='space-y-2'>
              <Label htmlFor='file'>Document File *</Label>
              <Input
                id='file'
                type='file'
                accept='.pdf,.txt,.docx,.md'
                onChange={handleFileChange}
                disabled={uploadMutation.isPending}
              />
              {file && (
                <div className='flex items-center justify-between rounded-md border p-2 text-sm'>
                  <span className='truncate'>{file.name}</span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setFile(null)}
                    disabled={uploadMutation.isPending}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              )}
            </div>

            {/* Metadata Input */}
            <div className='space-y-2'>
              <Label htmlFor='metadata'>
                Metadata (optional)
                <span className='ml-2 text-xs text-muted-foreground'>
                  JSON format
                </span>
              </Label>
              <Input
                id='metadata'
                placeholder='{"category": "HR", "department": "Operations"}'
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                disabled={uploadMutation.isPending}
              />
            </div>

            {/* Chunking Strategy */}
            <div className='space-y-3 border-t pt-4'>
              <Label>Chunking Strategy</Label>
              <RadioGroup
                value={chunkingStrategy}
                onValueChange={(value: 'section' | 'token') => setChunkingStrategy(value)}
                disabled={uploadMutation.isPending}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='section' id='section' />
                  <Label htmlFor='section' className='font-normal cursor-pointer'>
                    <div className='font-medium'>Section-based</div>
                    <div className='text-sm text-muted-foreground'>
                      Split by headings (# markers) - Best for Q&A documents
                    </div>
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='token' id='token' />
                  <Label htmlFor='token' className='font-normal cursor-pointer'>
                    <div className='font-medium'>Token-based</div>
                    <div className='text-sm text-muted-foreground'>
                      Split by character count - Configurable size and overlap
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Token Chunking Configuration */}
            {chunkingStrategy === 'token' && (
              <div className='space-y-3 bg-muted/30 p-3 rounded-md'>
                <div className='space-y-2'>
                  <Label htmlFor='chunk_size'>
                    Chunk Size (tokens)
                    <span className='ml-2 text-xs text-muted-foreground'>
                      100-2000
                    </span>
                  </Label>
                  <Input
                    id='chunk_size'
                    type='number'
                    min={100}
                    max={2000}
                    placeholder='500'
                    value={chunkSize}
                    onChange={(e) => setChunkSize(e.target.value)}
                    disabled={uploadMutation.isPending}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='chunk_overlap'>
                    Chunk Overlap (tokens)
                    <span className='ml-2 text-xs text-muted-foreground'>
                      0 to chunk size
                    </span>
                  </Label>
                  <Input
                    id='chunk_overlap'
                    type='number'
                    min={0}
                    max={parseInt(chunkSize) || 500}
                    placeholder='50'
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(e.target.value)}
                    disabled={uploadMutation.isPending}
                  />
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancel}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={!file || !title.trim() || uploadMutation.isPending}>
              {uploadMutation.isPending ? (
                <>
                  <Upload className='mr-2 h-4 w-4 animate-pulse' />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className='mr-2 h-4 w-4' />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

