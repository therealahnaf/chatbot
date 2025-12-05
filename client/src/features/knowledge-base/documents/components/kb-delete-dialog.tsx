import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useDeleteDocument } from '@/hooks/use-document'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type Document } from '../data/schema'

interface KBDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Document
}

export function KBDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: KBDeleteDialogProps) {
  const [value, setValue] = useState('')
  const deleteDocument = useDeleteDocument()

  useEffect(() => {
    if (!open) {
      setValue('')
    }
  }, [open])

  const handleDelete = async () => {
    if (value.trim() !== currentRow.filename) return

    try {
      await deleteDocument.mutateAsync(currentRow.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.filename || deleteDocument.isPending}
      isLoading={deleteDocument.isPending}
      title={`Delete "${currentRow.title}"`}
      desc={
        <>
          <Alert variant='destructive' className='mb-2 border-destructive/50'>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action cannot be undone. This will permanently delete the
              document and all its associated vector embeddings.
            </AlertDescription>
          </Alert>
          <p className='mb-4 mt-4'>
            Please type{' '}
            <span className='rounded bg-muted px-1 py-0.5 font-mono text-sm'>
              {currentRow.filename}
            </span>{' '}
            to confirm.
          </p>
          <Label htmlFor='confirm-filename'>Filename</Label>
          <Input
            id='confirm-filename'
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='Enter filename to confirm'
            className='mt-2'
          />
        </>
      }
      confirmText={deleteDocument.isPending ? 'Deleting...' : 'Delete Document'}
    />
  )
}

