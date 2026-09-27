import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { statusTextStyles } from '@/styles/ui'

/** Texto de estado o ayuda: "Buscando…", "No hay resultados", etc. */
export function StatusText({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn(statusTextStyles, className)} {...props} />
}
