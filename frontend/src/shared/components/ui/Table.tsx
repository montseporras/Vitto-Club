import { createContext, useContext, useLayoutEffect, useRef } from 'react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { tableStyles } from '@/styles/ui'

// 'admin' es el formato de las pantallas del menú de Administración (ajustes S5-56); la
// tabla común no cambia.
type TableVariant = 'default' | 'admin'

const TableVariantContext = createContext<TableVariant>('default')

type TableProps = ComponentProps<'table'> & { variant?: TableVariant }

/**
 * Copia el texto de cada encabezado en el atributo data-label de las celdas de su columna.
 * Debajo de 768 px la tabla se muestra como tarjetas (ver globals.css) y ese texto es el título
 * de cada dato. No toca las celdas que ocupan varias columnas ni los encabezados sin texto
 * (acciones, detalle).
 */
function labelCells(table: HTMLTableElement) {
  const headers = Array.from(table.querySelectorAll('thead th'))
  const labels = headers.map((th) =>
    th.querySelector('.sr-only') ? '' : (th.textContent ?? '').trim(),
  )
  table.querySelectorAll('tbody tr').forEach((row) => {
    let column = 0
    Array.from(row.children).forEach((cell) => {
      const span = Number(cell.getAttribute('colspan') ?? 1)
      const label = span === 1 ? labels[column] : ''
      if (label) cell.setAttribute('data-label', label)
      else cell.removeAttribute('data-label')
      column += span
    })
  })
}

export function Table({ variant = 'default', className, ...props }: TableProps) {
  const tableRef = useRef<HTMLTableElement>(null)

  // Sin lista de dependencias: las filas cambian cada vez que se vuelve a dibujar la tabla
  useLayoutEffect(() => {
    if (tableRef.current) labelCells(tableRef.current)
  })

  return (
    <TableVariantContext.Provider value={variant}>
      <div
        className={cn(
          variant === 'admin' ? tableStyles.admin.wrapper : tableStyles.wrapper,
          'vc-cards-wrap',
        )}
      >
        <table ref={tableRef} className={cn(tableStyles.table, 'vc-cards', className)} {...props} />
      </div>
    </TableVariantContext.Provider>
  )
}

export function TableHead({ className, ...props }: ComponentProps<'thead'>) {
  const variant = useContext(TableVariantContext)
  return (
    <thead
      className={cn(variant === 'admin' ? tableStyles.admin.head : tableStyles.head, className)}
      {...props}
    />
  )
}

export function TableHeaderCell({ className, ...props }: ComponentProps<'th'>) {
  const variant = useContext(TableVariantContext)
  return (
    <th
      className={cn(variant === 'admin' ? tableStyles.admin.headCell : tableStyles.headCell, className)}
      {...props}
    />
  )
}

type TableRowProps = ComponentProps<'tr'> & {
  /** Fila clickeable: resalta al pasar el mouse. */
  interactive?: boolean
  /** Resalta al pasar el mouse, sin ser clickeable (ej. filas con botones). */
  highlight?: boolean
}

export function TableRow({ className, interactive, highlight, ...props }: TableRowProps) {
  const variant = useContext(TableVariantContext)
  return (
    <tr
      className={cn(
        variant === 'admin' ? tableStyles.admin.row : tableStyles.row,
        interactive && (variant === 'admin' ? tableStyles.admin.rowHover : tableStyles.rowInteractive),
        highlight &&
          !interactive &&
          (variant === 'admin' ? tableStyles.admin.rowHover : tableStyles.rowHighlight),
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  const variant = useContext(TableVariantContext)
  return (
    <td
      className={cn(variant === 'admin' ? tableStyles.admin.cell : tableStyles.cell, className)}
      {...props}
    />
  )
}
