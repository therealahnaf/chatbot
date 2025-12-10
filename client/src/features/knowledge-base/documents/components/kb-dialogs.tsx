import { KBActionDialog } from './kb-action-dialog'
import { KBDeleteDialog } from './kb-delete-dialog'
import { KBViewDrawer } from './kb-view-drawer'
import { useKBDialog } from './kb-provider'

export function KBDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useKBDialog()

  if (!currentRow && open !== 'upload') return null

  return (
    <>
      <KBActionDialog
        key='kb-upload'
        open={open === 'upload'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
          } else {
            setOpen('upload')
          }
        }}
      />

      {currentRow && (
        <>
          <KBDeleteDialog
            key={`kb-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setOpen(null)
                setTimeout(() => {
                  setCurrentRow(null)
                }, 300)
              } else {
                setOpen('delete')
              }
            }}
            currentRow={currentRow}
          />

          <KBViewDrawer
            key={`kb-view-${currentRow.id}`}
            open={open === 'view'}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setOpen(null)
                setTimeout(() => {
                  setCurrentRow(null)
                }, 300)
              } else {
                setOpen('view')
              }
            }}
            document={currentRow}
          />
        </>
      )}
    </>
  )
}

