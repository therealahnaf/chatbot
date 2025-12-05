import { createContext, useContext, useState } from 'react'
import type { Document } from '../data/schema'

export type KBDialogType = 'upload' | 'delete' | 'view'

interface KBDialogContext {
  open: KBDialogType | null
  setOpen: (open: KBDialogType | null) => void
  currentRow: Document | null
  setCurrentRow: (row: Document | null) => void
}

const KBDialogContext = createContext<KBDialogContext | undefined>(undefined)

export function KBProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<KBDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<Document | null>(null)

  return (
    <KBDialogContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </KBDialogContext.Provider>
  )
}

export function useKBDialog() {
  const context = useContext(KBDialogContext)
  if (!context) {
    throw new Error('useKBDialog must be used within KBProvider')
  }
  return context
}

