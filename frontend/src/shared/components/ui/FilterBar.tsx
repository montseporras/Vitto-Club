import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

// Filtros de las pantallas de Administración, como en el prototipo.
//
// Barra unida (Canjes y Consumos; Recompensas usa las mismas medidas): un solo recuadro con las
// celdas separadas por una línea. Campos sueltos (Auditoría y Clientes): etiqueta de 13 px y
// campo de 14 px con radio 12 (prototipo: .field y .input).

/** Recuadro de la barra de filtros. Es un <form>: "Filtrar" lo envía. */
export function FilterBar({ className, ...props }: ComponentProps<'form'>) {
  return (
    <form
      className={cn(
        'relative flex flex-wrap items-stretch rounded-xl border border-[#f6d0b1] bg-white',
        className,
      )}
      {...props}
    />
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
  const style: CSSProperties = { flex }
  return (
    <div
      style={style}
      className={cn(
        'relative flex min-w-0 flex-col justify-center gap-0.5 px-3.5 py-2',
        divider && 'border-l border-[#f6d0b1]',
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

/** Línea que separa las dos filas de la barra (Canjes). */
export function FilterRowDivider() {
  return <div aria-hidden="true" className="h-0 basis-full border-t border-[#f6d0b1]" />
}

/** Última celda: "Sin aplicar" y el botón "Filtrar". */
export function FilterActions({ pending, children }: { pending?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-l border-[#f6d0b1] px-2.5 py-2">
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
