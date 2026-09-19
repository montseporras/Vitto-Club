import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-[var(--radius)] border border-divider bg-bg px-3 text-sm text-text placeholder:text-neutral-500',
        'focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent-200',
        'aria-invalid:border-accent-700 aria-invalid:outline-accent-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
