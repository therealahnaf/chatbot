import { AudioWaveform } from 'lucide-react'
import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <AudioWaveform
      className={cn('size-6', className)}
      {...props}
    />
  )
}
