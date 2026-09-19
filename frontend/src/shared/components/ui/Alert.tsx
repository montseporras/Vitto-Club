import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

const alertVariants = cva('rounded-[var(--radius)] border px-4 py-3 text-sm', {
  variants: {
    variant: {
      success: 'border-green-700/40 bg-green-50 text-green-900',
      error: 'border-accent-700/40 bg-accent-100 text-accent-900',
    },
  },
  defaultVariants: { variant: 'error' },
})

export type AlertProps = ComponentProps<'div'> &
  VariantProps<typeof alertVariants>

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role={variant === 'success' ? 'status' : 'alert'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}
