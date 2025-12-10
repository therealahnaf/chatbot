import { type Row } from '@tanstack/react-table'
import { MoreHorizontal, Trash2, Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Document } from '../data/schema'
import { useKBDialog } from './kb-provider'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const document = row.original as Document
  const { setOpen, setCurrentRow } = useKBDialog()

  const isDone = document.status === 'done'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        {isDone && (
          <>
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(document)
                setOpen('view')
              }}
            >
              <Eye className='mr-2 h-4 w-4' />
              View Chunks
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={() => {
            // TODO: Implement download
            console.log('Download document:', document.id)
          }}
        >
          <Download className='mr-2 h-4 w-4' />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(document)
            setOpen('delete')
          }}
          className='text-destructive focus:text-destructive'
        >
          <Trash2 className='mr-2 h-4 w-4' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

