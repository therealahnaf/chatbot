'use client'

import { useState, useEffect } from 'react'
import { type Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useBulkDeleteUsers } from '@/hooks/use-users'
import { useAuthStore } from '@/stores/auth-store'
import { type User } from '../data/schema'

type UserMultiDeleteDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
}

const CONFIRM_WORD = 'DELETE'

export function UsersMultiDeleteDialog<TData>({
  open,
  onOpenChange,
  table,
}: UserMultiDeleteDialogProps<TData>) {
  const [value, setValue] = useState('')
  const bulkDeleteUsers = useBulkDeleteUsers()
  const { auth } = useAuthStore()
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const currentUserId = auth.user?.id

  // Filter out current user from selected users
  const selectedUsers = selectedRows.map((row) => row.original as User)
  const userIdsToDelete = selectedUsers
    .filter((user) => user.id !== currentUserId)
    .map((user) => user.id)
  const hasCurrentUser = selectedUsers.some((user) => user.id === currentUserId)

  // Reset value when dialog closes
  useEffect(() => {
    if (!open) {
      setValue('')
    }
  }, [open])

  const handleDelete = async () => {
    if (value.trim() !== CONFIRM_WORD) {
      return
    }

    // Only delete users that are not the current user
    if (userIdsToDelete.length === 0) {
      return
    }

    try {
      await bulkDeleteUsers.mutateAsync(userIdsToDelete)
      table.resetRowSelection()
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the hook (toast notifications)
      console.error('Failed to delete users:', error)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={
        value.trim() !== CONFIRM_WORD ||
        bulkDeleteUsers.isPending ||
        userIdsToDelete.length === 0
      }
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='stroke-destructive me-1 inline-block'
            size={18}
          />{' '}
          Delete {selectedRows.length}{' '}
          {selectedRows.length > 1 ? 'users' : 'user'}
        </span>
      }
      desc={
        <div className='space-y-4'>
          {hasCurrentUser && (
            <Alert variant='destructive'>
              <AlertTitle>Cannot Delete Your Own Account</AlertTitle>
              <AlertDescription>
                You cannot delete your own account. Your account will be excluded
                from this deletion.
              </AlertDescription>
            </Alert>
          )}
          <p className='mb-2'>
            Are you sure you want to delete {userIdsToDelete.length} selected
            {userIdsToDelete.length > 1 ? ' users' : ' user'}? <br />
            This action cannot be undone.
          </p>

          <Label className='my-4 flex flex-col items-start gap-1.5'>
            <span className=''>Confirm by typing "{CONFIRM_WORD}":</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Type "${CONFIRM_WORD}" to confirm.`}
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              Please be careful, this operation can not be rolled back.
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText='Delete'
      destructive
    />
  )
}
