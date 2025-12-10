/**
 * Example: Users Table with Real API Integration
 * Replace the mock data in index.tsx with this implementation
 */

import { useState } from 'react'
import { useUsers, useDeleteUser, useActivateUser, useDeactivateUser } from '@/hooks/use-users'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, UserCheck, UserX } from 'lucide-react'

export function UsersTableWithAPI() {
  const [page, setPage] = useState(0)
  const limit = 20

  // Fetch users with pagination
  const { data, isLoading, error } = useUsers({
    skip: page * limit,
    limit,
  })

  // Mutations
  const deleteUser = useDeleteUser()
  const activateUser = useActivateUser()
  const deactivateUser = useDeactivateUser()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-destructive py-8 text-center">
        Error loading users: {error.message}
      </div>
    )
  }

  const totalPages = Math.ceil((data?.total || 0) / limit)

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.full_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* Activate/Deactivate Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (user.is_active) {
                            deactivateUser.mutate(user.id)
                          } else {
                            activateUser.mutate(user.id)
                          }
                        }}
                        disabled={
                          activateUser.isPending || 
                          deactivateUser.isPending
                        }
                      >
                        {user.is_active ? (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete user ${user.email}?`)) {
                            deleteUser.mutate(user.id)
                          }
                        }}
                        disabled={deleteUser.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {page * limit + 1} to {Math.min((page + 1) * limit, data?.total || 0)} of{' '}
          {data?.total} users
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">
              Page {page + 1} of {totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data || (page + 1) >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}


