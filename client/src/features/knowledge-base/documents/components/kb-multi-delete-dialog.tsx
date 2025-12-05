import { useState, useEffect } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useBulkDeleteDocuments } from '@/hooks/use-document'
import { type Document } from '../data/schema'

const CONFIRM_WORD = 'DELETE'

type KBMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

export function KBMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: KBMultiDeleteDialogProps<TData>) {
  const [value, setValue] = useState('')
  const bulkDeleteDocuments = useBulkDeleteDocuments()
  const selectedRows = table.getFilteredSelectedRowModel().rows

  useEffect(() => {
    if (!open) {
      setValue('')
    }
  }, [open])

  const handleDelete = async () => {
    if (value.trim() !== CONFIRM_WORD) {
      return
    }
    const selectedDocuments = selectedRows.map((row) => row.original as Document)
    const documentIds = selectedDocuments.map((doc) => doc.id)

    try {
      await bulkDeleteDocuments.mutateAsync(documentIds)
      table.resetRowSelection()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete documents:', error)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={
        value.trim() !== CONFIRM_WORD || bulkDeleteDocuments.isPending
      }
      isPending={bulkDeleteDocuments.isPending}
      title={`Delete ${selectedRows.length} document${selectedRows.length > 1 ? 's' : ''}?`}
      desc={
        <div className='space-y-4'>
          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action cannot be undone. This will permanently delete the
              selected documents and all their associated data from our servers.
            </AlertDescription>
          </Alert>

          <div className='space-y-2'>
            <Label htmlFor='confirm-delete'>
              Type <span className='font-bold'>{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              id='confirm-delete'
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={CONFIRM_WORD}
              disabled={bulkDeleteDocuments.isPending}
            />
          </div>

          <div className='text-sm text-muted-foreground'>
            {selectedRows.length} document{selectedRows.length > 1 ? 's' : ''}{' '}
            will be deleted:
            <ul className='mt-2 list-inside list-disc'>
              {selectedRows.slice(0, 5).map((row) => {
                const doc = row.original as Document
                return (
                  <li key={doc.id} className='truncate'>
                    {doc.title}
                  </li>
                )
              })}
              {selectedRows.length > 5 && (
                <li className='text-muted-foreground'>
                  and {selectedRows.length - 5} more...
                </li>
              )}
            </ul>
          </div>
        </div>
      }
      confirmText={
        bulkDeleteDocuments.isPending
          ? 'Deleting...'
          : `Delete ${selectedRows.length} document${selectedRows.length > 1 ? 's' : ''}`
      }
    />
  )
}
