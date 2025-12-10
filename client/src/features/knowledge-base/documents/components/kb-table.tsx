import { useState, useEffect } from 'react'
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
import { type Document } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { kbColumns as columns } from './kb-columns'

type DataTableProps = {
  data: Document[]
  search: Record<string, unknown>
  navigate: NavigateFn
  pageCount: number
}

export function KBTable({ data, search, navigate, pageCount }: DataTableProps) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

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
      { columnId: 'title', searchKey: 'title', type: 'string' },
      { columnId: 'fileType', searchKey: 'fileType', type: 'array' },
      { columnId: 'status', searchKey: 'status', type: 'array' },
    ],
  })

  // Convert sorting state to URL params for server-side sorting
  useEffect(() => {
    if (sorting.length > 0) {
      const sort = sorting[0]
      const currentSearch = search as Record<string, unknown>
      
      // Map column IDs to backend sort fields
      const sortByMap: Record<string, string> = {
        title: 'title',
        filename: 'filename',
        fileType: 'file_type',
        fileSize: 'file_size',
        status: 'status',
        chunkCount: 'chunk_count',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      }

      const sortBy = sortByMap[sort.id] || sort.id
      const sortOrder = sort.desc ? 'desc' : 'asc'

      // Only update if different from current
      if (
        currentSearch.sort_by !== sortBy ||
        currentSearch.sort_order !== sortOrder
      ) {
        navigate({
          search: (prev) => ({
            ...(prev as Record<string, unknown>),
            page: undefined, // Reset to page 1 when sorting changes
            sort_by: sortBy,
            sort_order: sortOrder,
          }),
        })
      }
    } else if (sorting.length === 0 && search.sort_by) {
      // Clear sorting if none selected
      navigate({
        search: (prev) => ({
          ...(prev as Record<string, unknown>),
          sort_by: undefined,
          sort_order: undefined,
        }),
      })
    }
  }, [sorting, search, navigate])

  // Sync URL params back to table sorting state
  useEffect(() => {
    const currentSearch = search as Record<string, unknown>
    if (currentSearch.sort_by) {
      // Map backend sort fields to column IDs
      const sortByMap: Record<string, string> = {
        title: 'title',
        filename: 'filename',
        file_type: 'fileType',
        file_size: 'fileSize',
        status: 'status',
        chunk_count: 'chunkCount',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
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

  ensurePageInRange(pageCount)

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    pageCount,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
  })

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4',
        'transition-opacity duration-200'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder='Search by title...'
        searchKey='title'
        filters={[
          {
            columnId: 'status',
            title: 'Status',
            options: [
              { label: 'Processing', value: 'processing' },
              { label: 'Done', value: 'done' },
              { label: 'Failed', value: 'failed' },
            ],
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
                  No documents found.
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

