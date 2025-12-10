import { FileText, File, FileCode, FileType } from 'lucide-react'

export const fileTypes = [
  {
    label: 'PDF',
    value: 'pdf',
    icon: FileText,
    color: 'bg-red-100/30 text-red-900 dark:text-red-200 border-red-200',
  },
  {
    label: 'Text',
    value: 'txt',
    icon: FileType,
    color: 'bg-gray-100/30 text-gray-900 dark:text-gray-200 border-gray-200',
  },
  {
    label: 'Word',
    value: 'docx',
    icon: File,
    color: 'bg-blue-100/30 text-blue-900 dark:text-blue-200 border-blue-200',
  },
  {
    label: 'Markdown',
    value: 'md',
    icon: FileCode,
    color: 'bg-purple-100/30 text-purple-900 dark:text-purple-200 border-purple-200',
  },
] as const

export const fileTypeMap = new Map(
  fileTypes.map((type) => [type.value, type])
)

// Status colors
export const statusColors = new Map<string, string>([
  ['processing', 'bg-blue-100/30 text-blue-900 dark:text-blue-200 border-blue-200'],
  ['done', 'bg-green-100/30 text-green-900 dark:text-green-200 border-green-200'],
  ['failed', 'bg-red-100/30 text-red-900 dark:text-red-200 border-red-200'],
])

