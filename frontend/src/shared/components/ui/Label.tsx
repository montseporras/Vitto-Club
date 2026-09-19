import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn('text-sm font-semibold text-text', className)}
      {...props}
    />
  )
}
