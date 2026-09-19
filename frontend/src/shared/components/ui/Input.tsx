import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        // text-base en mobile evita el zoom automático de iOS al enfocar
        'h-11 w-full rounded-xl border border-divider/60 bg-bg/90 px-3.5 text-base text-text shadow-xs transition',
        'placeholder:text-neutral-500 sm:text-sm',
        'hover:border-divider',
        'focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent-200/60 focus-visible:outline-none',
        'aria-invalid:border-accent-600 aria-invalid:ring-4 aria-invalid:ring-accent-100',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
