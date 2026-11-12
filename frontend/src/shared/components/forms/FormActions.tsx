import { useContext } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { formActionsStyles } from '@/styles/ui'
import { CardDensityContext } from '../ui/card-density'

type FormActionsProps = {
  /** Aviso a la izquierda de los botones (ej. "No modificaste ningún dato"). */
  message?: ReactNode
  children: ReactNode
  className?: string
}

/** Botonera al pie del formulario, separada por una línea. */
export function FormActions({ message, children, className }: FormActionsProps) {
  const compact = useContext(CardDensityContext) === 'compact'
  return (
    <div
      className={cn(
        formActionsStyles.root,
        message && formActionsStyles.rootWithMessage,
        compact && formActionsStyles.compact,
        className,
      )}
    >
      {message && (
        <p role="status" className={formActionsStyles.message}>
          {message}
        </p>
      )}
      {children}
    </div>
  )
}
