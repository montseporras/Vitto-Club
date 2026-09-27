import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { formActionsStyles } from '@/styles/ui'

type FormActionsProps = {
  /** Aviso a la izquierda de los botones (ej. "No modificaste ningún dato"). */
  message?: ReactNode
  children: ReactNode
  className?: string
}

/** Botonera al pie del formulario, separada por una línea. */
export function FormActions({ message, children, className }: FormActionsProps) {
  return (
    <div className={cn(formActionsStyles.root, className)}>
      {message && (
        <p role="status" className={formActionsStyles.message}>
          {message}
        </p>
      )}
      {children}
    </div>
  )
}
