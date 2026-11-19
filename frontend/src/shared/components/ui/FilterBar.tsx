import { useId, useState } from 'react'
import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { Icon } from './Icon'
import { ICONS } from './icons'

// Filtros de las pantallas de Administración, como en el prototipo.
//
// Barra unida (Canjes, Consumos, Auditoría, Clientes y Recompensas): un solo recuadro con las celdas
// separadas por una línea. Campos sueltos: etiqueta de 13 px y campo de 14 px con radio 12
// (prototipo: .field y .input).
//
// Responsive: desde 1200 px de ancho (con el menú lateral abierto, el contenido todavía mide unos
// 800 px) las celdas van en fila, como siempre. Debajo, la barra se reemplaza por una opción
// "Filtros" que se abre y muestra cada campo en su propio recuadro redondeado, uno debajo del otro.

/**
 * Recuadro de la barra de filtros. Es un <form>: "Filtrar" lo envía.
 * `className` va en el contenedor (márgenes); el resto de las propiedades, en el <form>.
 */
export function FilterBar({ className, children, ...props }: ComponentProps<'form'>) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#f6d0b1] bg-white px-3.5 py-2.5 text-left text-sm font-semibold text-[#5a2a14] transition-colors hover:bg-[#fffaf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9532b] min-[1200px]:hidden"
      >
        <Icon d={ICONS.filter} className="size-4 text-[#a9532b]" />
        Filtros
        <Icon
          d={ICONS.chevronDown}
          className={cn('ml-auto size-4 text-[#7e3e20] transition-transform', open && 'rotate-180')}
        />
      </button>

      <form
        id={panelId}
        className={cn(
          'relative flex flex-col items-stretch gap-2 max-[1199px]:mt-2 min-[1200px]:flex-row min-[1200px]:flex-wrap min-[1200px]:gap-0 min-[1200px]:rounded-xl min-[1200px]:border min-[1200px]:border-[#f6d0b1] min-[1200px]:bg-white',
          !open && 'max-[1199px]:hidden',
        )}
        {...props}
      >
        {children}
      </form>
    </div>
  )
}

type FilterCellProps = {
  label: string
  /** id del control, para el <label>. */
  htmlFor: string
  /** Valor de `flex` de la celda (ej. "1.3 1 220px"), como en el prototipo. */
  flex: string
  /** Línea a la izquierda; la primera celda de cada fila no la lleva. */
  divider?: boolean
  children: ReactNode
}

export function FilterCell({ label, htmlFor, flex, divider = true, children }: FilterCellProps) {
  // El ancho base solo rige con la barra en fila (--cell-flex)
  const style = { '--cell-flex': flex } as CSSProperties
  return (
    <div
      style={style}
      className={cn(
        'relative flex min-w-0 flex-col justify-center gap-0.5 px-3.5 py-2 max-[1199px]:rounded-xl max-[1199px]:border max-[1199px]:border-[#f6d0b1] max-[1199px]:bg-white min-[1200px]:flex-(--cell-flex)',
        divider && 'min-[1200px]:border-l min-[1200px]:border-[#f6d0b1]',
      )}
    >
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#7e3e20]"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

/** Línea que separa las dos filas de la barra (Canjes). Solo con la barra en fila. */
export function FilterRowDivider() {
  return (
    <div
      aria-hidden="true"
      className="hidden h-0 basis-full border-t border-[#f6d0b1] min-[1200px]:block"
    />
  )
}

/** Última celda: "Sin aplicar" y el botón "Filtrar". */
export function FilterActions({ pending, children }: { pending?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 py-1 min-[1200px]:border-l min-[1200px]:border-[#f6d0b1] min-[1200px]:px-2.5 min-[1200px]:py-2">
      {pending && <span className="text-xs text-[#7e3e20]">Sin aplicar</span>}
      {children}
    </div>
  )
}

type LooseFieldProps = {
  label: string
  htmlFor: string
  className?: string
  children: ReactNode
}

/** Campo suelto con su etiqueta (prototipo: .field). */
export function LooseField({ label, htmlFor, className, children }: LooseFieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-[#3b2a20]">
        {label}
      </label>
      {children}
    </div>
  )
}
