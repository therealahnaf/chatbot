import { useEffect, useState } from 'react'
import {
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { roles } from '../data/data'
import { type User } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { usersColumns as columns } from './users-columns'

type DataTableProps = {
  data: User[]
  search: Record<string, unknown>
  navigate: NavigateFn
  pageCount: number // Server-side page count (from API response)
}

export function UsersTable({ data, search, navigate, pageCount }: DataTableProps) {
  // Local UI-only states
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  // Synced with URL states (keys/defaults mirror users route search schema)
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: [
      // email per-column text filter
      { columnId: 'email', searchKey: 'email', type: 'string' },
      { columnId: 'status', searchKey: 'status', type: 'array' },
      { columnId: 'role', searchKey: 'role', type: 'array' },
    ],
  })

  // Convert sorting state to URL params for server-side sorting
  useEffect(() => {
    if (sorting.length > 0) {
      const sort = sorting[0]
      const currentSearch = search as Record<string, unknown>
      
      // Map column IDs to backend sort fields
      const sortByMap: Record<string, string> = {
        email: 'email',
        firstName: 'first_name',
        lastName: 'last_name',
        status: 'is_active',
        role: 'role',
        createdAt: 'created_at',
      }

      const sortBy = sortByMap[sort.id] || sort.id
      const sortOrder = sort.desc ? 'desc' : 'asc'

      // Only update if different from current
      if (
        currentSearch.sort_by !== sortBy ||
        currentSearch.sort_order !== sortOrder
      ) {
        navigate({
          search: (prev: Record<string, unknown>) => ({
            ...prev,
            sort_by: sortBy,
            sort_order: sortOrder,
          }),
        })
      }
    } else {
      // Clear sort params if no sorting
      const currentSearch = search as Record<string, unknown>
      if (currentSearch.sort_by || currentSearch.sort_order) {
        navigate({
          search: (prev: Record<string, unknown>) => {
            const { sort_by, sort_order, ...rest } = prev
            return rest
          },
        })
      }
    }
  }, [sorting, navigate, search])

  // Server-side pagination, filtering, and sorting
  // Disable client-side processing since server handles it
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    
    // Server-side processing flags
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    
    // Use only core row model (no client-side processing)
    getCoreRowModel: getCoreRowModel(),
    
    // Provide server-side page count
    pageCount: pageCount,
  })

  // Sync sorting from URL on mount
  useEffect(() => {
    const currentSearch = search as Record<string, unknown>
    if (currentSearch.sort_by && currentSearch.sort_order) {
      // Map backend sort fields to column IDs
      const sortByMap: Record<string, string> = {
        email: 'email',
        first_name: 'firstName',
        last_name: 'lastName',
        phone_number: 'phoneNumber',
        is_active: 'status',
        role: 'role',
        created_at: 'createdAt',
      }

      const columnId = sortByMap[currentSearch.sort_by as string] || currentSearch.sort_by
      const desc = currentSearch.sort_order === 'desc'

      // Only update if different from current sorting
      const currentSort = sorting[0]
      if (!currentSort || currentSort.id !== columnId || currentSort.desc !== desc) {
        setSorting([{ id: columnId as string, desc }])
      }
    } else if (sorting.length > 0) {
      // Clear sorting if URL has no sort params
      setSorting([])
    }
  }, [search]) // Sync when search params change

  useEffect(() => {
    ensurePageInRange(pageCount)
  }, [pageCount, ensurePageInRange])

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16', // Add margin bottom to the table on mobile when the toolbar is visible
        'flex flex-1 flex-col gap-4',
        'transition-opacity duration-200' // Smooth transitions
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder='Search by email, name...'
        searchKey='email'
        filters={[
          {
            columnId: 'status',
            title: 'Status',
            options: [
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
             
            ],
          },
          {
            columnId: 'role',
            title: 'Role',
            options: roles.map((role) => ({ ...role })),
          },
        ]}
      />
      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        header.column.columnDef.meta?.className,
                        header.column.columnDef.meta?.thClassName
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='group/row'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
      <DataTableBulkActions table={table} />
    </div>
  )
}
