'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useDeleteUser } from '@/hooks/use-users'
import { useAuthStore } from '@/stores/auth-store'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type User } from '../data/schema'

type UserDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: UserDeleteDialogProps) {
  const [value, setValue] = useState('')
  const deleteUser = useDeleteUser()
  const { auth } = useAuthStore()
  const isCurrentUser = auth.user?.id === currentRow.id

  // Reset value when dialog closes
  useEffect(() => {
    if (!open) {
      setValue('')
    }
  }, [open])

  const handleDelete = async () => {
    if (value.trim() !== currentRow.email || isCurrentUser) return

    try {
      await deleteUser.mutateAsync(currentRow.id)
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the hook (toast notifications)
      console.error('Failed to delete user:', error)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.email || deleteUser.isPending || isCurrentUser}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='stroke-destructive me-1 inline-block'
            size={18}
          />{' '}
          Delete User
        </span>
      }
      desc={
        <div className='space-y-4'>
          {isCurrentUser ? (
            <Alert variant='destructive'>
              <AlertTitle>Cannot Delete Your Own Account</AlertTitle>
              <AlertDescription>
                You cannot delete your own account. Please contact an administrator
                if you need to delete your account.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p className='mb-2'>
                Are you sure you want to delete{' '}
                <span className='font-bold'>{currentRow.email}</span>?
                <br />
                This action will permanently remove the user with the role of{' '}
                <span className='font-bold'>
                  {currentRow.role.toUpperCase()}
                </span>{' '}
                from the system. This cannot be undone.
              </p>
            </>
          )}

          <Label className='my-2'>
            Email:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Enter email to confirm deletion.'
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
