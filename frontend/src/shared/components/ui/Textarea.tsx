import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { inputReadOnlyStyles, inputStyles, textareaStyles } from '@/styles/ui'

/** Campo de texto de varios renglones, con la estética de Input. */
export function Textarea({ className, rows = 2, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      rows={rows}
      className={cn(inputStyles, inputReadOnlyStyles, textareaStyles, className)}
      {...props}
    />
  )
}
