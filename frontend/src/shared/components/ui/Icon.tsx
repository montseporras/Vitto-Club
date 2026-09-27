import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

type IconProps = Omit<ComponentProps<'svg'>, 'children'> & {
  /** Trazo del ícono; los del sistema están en ./icons.ts */
  d: string
}

/** Ícono de línea decorativo (hereda el color del texto). */
export function Icon({ d, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-5', className)}
      {...props}
    >
      <path d={d} />
    </svg>
  )
}
