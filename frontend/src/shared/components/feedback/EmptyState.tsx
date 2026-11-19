import type { ReactNode } from 'react'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import { emptyStateStyles } from '@/styles/ui'

type EmptyStateProps = {
  /** Nombra el estado (ej. "Todavía no hay recompensas"). */
  title: string
  /** Una línea que explica por qué está vacío. */
  description?: ReactNode
  /** Qué hacer (CTA): un botón o un link. */
  action?: ReactNode
  /** Ícono del sistema (./icons.ts). Por defecto, una bandeja. */
  icon?: string
  compact?: boolean
  className?: string
}

/** Estado vacío que guía: título, por qué está vacío y qué hacer. */
export function EmptyState({ title, description, action, icon = ICONS.inbox, compact, className }: EmptyStateProps) {
  return (
    <div className={cn(emptyStateStyles.root, compact && emptyStateStyles.compact, className)}>
      <span aria-hidden="true" className={emptyStateStyles.icon}>
        <Icon d={icon} className="size-6" />
      </span>
      <p className={emptyStateStyles.title}>{title}</p>
      {description && <p className={emptyStateStyles.description}>{description}</p>}
      {action && <div className={emptyStateStyles.action}>{action}</div>}
    </div>
  )
}
