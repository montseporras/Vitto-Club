import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { labelStyles } from '@/styles/ui'

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn(labelStyles, className)} {...props} />
}
