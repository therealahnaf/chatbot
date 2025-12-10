import { Upload, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useKBDialog } from './kb-provider'
import { useCreateSnapshot } from '@/hooks/use-document'

export function KBPrimaryButtons() {
  const { setOpen } = useKBDialog()
  const createSnapshot = useCreateSnapshot()

  const handleCreateSnapshot = async () => {
    await createSnapshot.mutateAsync()
  }

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        onClick={handleCreateSnapshot}
        disabled={createSnapshot.isPending}
      >
        <Database className='mr-2 h-4 w-4' />
        {createSnapshot.isPending ? 'Creating...' : 'Export Snapshot'}
      </Button>
      <Button onClick={() => setOpen('upload')}>
        <Upload className='mr-2 h-4 w-4' />
        Upload Document
      </Button>
    </div>
  )
}

