import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

type InfoHintProps = {
  /** Nombre accesible del botón (ej. "Ayuda sobre los niveles"). */
  label: string
  /** El texto de la explicación. */
  children: ReactNode
  className?: string
}

/**
 * Signo de pregunta que, al tocarlo, abre una explicación corta. Se cierra al tocar afuera
 * o con Escape (sin cerrar el modal que lo contenga).
 */
export function InfoHint({ label, children, className }: InfoHintProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    // En captura y deteniendo el evento: el Escape cierra solo la explicación
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  return (
    <span ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={label}
        onClick={() => setOpen((value) => !value)}
        className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-300 bg-surface text-xs font-bold text-accent-800 transition-colors hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700"
      >
        ?
      </button>
      {open && (
        <span
          id={panelId}
          role="note"
          className="absolute top-full left-0 z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-accent-200 bg-surface p-3 text-left text-xs leading-relaxed font-normal text-neutral-700 shadow-xl shadow-accent-900/15"
        >
          {children}
        </span>
      )}
    </span>
  )
}
