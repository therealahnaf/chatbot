import { type ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { fileTypeMap, statusColors } from '../data/data'
import { type Document } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

// Format file size
function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'N/A'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const kbColumns: ColumnDef<Document>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    meta: {
      className: cn('max-md:sticky start-0 z-10 rounded-tl-[inherit]'),
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Title' />
    ),
    cell: ({ row }) => {
      const title = row.getValue('title') as string
      return <LongText className='font-medium'>{title}</LongText>
    },
    meta: { className: '' },
  },
  {
    accessorKey: 'filename',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Filename' />
    ),
    cell: ({ row }) => (
      <LongText className='max-w-48 text-muted-foreground'>
        {row.getValue('filename')}
      </LongText>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'fileType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Type' />
    ),
    cell: ({ row }) => {
      const fileType = row.getValue('fileType') as string | null
      const typeInfo = fileType ? fileTypeMap.get(fileType as 'pdf' | 'txt' | 'docx' | 'md') : null

      if (!typeInfo) {
        return <span className='text-muted-foreground text-xs'>Unknown</span>
      }

      return (
        <div className='flex items-center gap-x-2'>
          {typeInfo.icon && (
            <typeInfo.icon size={16} className='text-muted-foreground' />
          )}
          <Badge variant='outline' className={cn('uppercase text-xs', typeInfo.color)}>
            {typeInfo.label}
          </Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false,
  },
  {
    accessorKey: 'fileSize',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Size' />
    ),
    cell: ({ row }) => {
      const size = row.getValue('fileSize') as number | null
      return <div className='text-muted-foreground'>{formatFileSize(size)}</div>
    },
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const badgeColor = statusColors.get(status) || ''
      
      const statusIcons = {
        processing: Loader2,
        done: CheckCircle2,
        failed: XCircle,
      }
      
      const Icon = statusIcons[status as keyof typeof statusIcons]

      return (
        <div className='flex items-center gap-x-2'>
          {Icon && (
            <Icon size={16} className={cn(
              'text-muted-foreground',
              status === 'processing' && 'animate-spin'
            )} />
          )}
          <Badge variant='outline' className={cn('capitalize text-xs', badgeColor)}>
            {status}
          </Badge>
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'chunkCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Chunks' />
    ),
    cell: ({ row }) => {
      const count = row.getValue('chunkCount') as number
      return (
        <div className='flex items-center gap-1'>
          <span className='font-medium'>{count}</span>
          <span className='text-xs text-muted-foreground'>chunks</span>
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Uploaded' />
    ),
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date
      return (
        <div className='text-muted-foreground'>
          {format(date, 'MMM dd, yyyy')}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: DataTableRowActions,
  },
]

