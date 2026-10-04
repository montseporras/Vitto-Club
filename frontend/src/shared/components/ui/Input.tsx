import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { inputReadOnlyStyles, inputStyles } from '@/styles/ui'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputStyles, inputReadOnlyStyles, className)} {...props} />
}
