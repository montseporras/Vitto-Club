import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { inputStyles } from '@/styles/ui'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputStyles, className)} {...props} />
}
