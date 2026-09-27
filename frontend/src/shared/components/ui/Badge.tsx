import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { badgeVariants, type BadgeVariants } from '@/styles/ui'

export type BadgeProps = ComponentProps<'span'> & BadgeVariants

/** Etiqueta de estado (ej. Activo / Dado de baja). */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
