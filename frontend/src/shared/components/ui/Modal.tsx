import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { modalStyles } from '@/styles/ui'
import { Icon } from './Icon'
import { ICONS } from './icons'

type ModalProps = {
  title: string
  /** Texto chico arriba del título (ej. "Configuración"). */
  eyebrow?: string
  description?: string
  /** Nombre accesible del diálogo; por defecto, el título. */
  label?: string
  /** Si se pasa, muestra el botón "Cerrar" en el encabezado. */
  onClose?: () => void
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** Diálogo modal con encabezado naranja, como la tarjeta principal. */
export function Modal({
  title,
  eyebrow,
  description,
  label,
  onClose,
  children,
  className,
  bodyClassName,
}: ModalProps) {
  return (
    <div
      className={modalStyles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={label ?? title}
    >
      <div className={cn(modalStyles.panel, className)}>
        <header className={modalStyles.header}>
          <div className="min-w-0">
            {eyebrow && <p className={modalStyles.eyebrow}>{eyebrow}</p>}
            <h3 className={eyebrow ? modalStyles.titleWithEyebrow : modalStyles.title}>
              {title}
            </h3>
            {description && (
              <p className={modalStyles.description}>{description}</p>
            )}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className={modalStyles.close}>
              Cerrar
              <Icon d={ICONS.close} className="size-4" />
            </button>
          )}
        </header>
        <div className={cn(modalStyles.body, bodyClassName)}>{children}</div>
      </div>
    </div>
  )
}
