import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

const alertVariants = cva(
  'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xs',
  {
    variants: {
      variant: {
        success: 'border-emerald-600/30 bg-emerald-50 text-emerald-900',
        error: 'border-accent-600/30 bg-accent-100 text-accent-900',
      },
    },
    defaultVariants: { variant: 'error' },
  },
)

const ICONOS = {
  success: 'M20 6 9 17l-5-5',
  error: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
} as const

export type AlertProps = ComponentProps<'div'> &
  VariantProps<typeof alertVariants>

export function Alert({
  className,
  variant = 'error',
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={variant === 'success' ? 'status' : 'alert'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0"
      >
        <path d={ICONOS[variant ?? 'error']} />
      </svg>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
