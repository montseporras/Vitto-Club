import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        // text-base en mobile evita el zoom automático de iOS al enfocar
        'h-12 w-full rounded-xl border border-neutral-300 bg-surface px-4 text-base text-text shadow-xs transition',
        'placeholder:text-neutral-500',
        'hover:border-accent-300',
        'focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent-200 focus-visible:outline-none',
        'aria-invalid:border-accent-600 aria-invalid:bg-accent-50 aria-invalid:ring-4 aria-invalid:ring-accent-100',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
