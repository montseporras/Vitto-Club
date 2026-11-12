import { createContext, useContext } from 'react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { tableStyles } from '@/styles/ui'

// 'admin' es el formato de las pantallas del menú de Administración (ajustes S5-56); la
// tabla común no cambia.
type TableVariant = 'default' | 'admin'

const TableVariantContext = createContext<TableVariant>('default')

type TableProps = ComponentProps<'table'> & { variant?: TableVariant }

export function Table({ variant = 'default', className, ...props }: TableProps) {
  return (
    <TableVariantContext.Provider value={variant}>
      <div className={variant === 'admin' ? tableStyles.admin.wrapper : tableStyles.wrapper}>
        <table className={cn(tableStyles.table, className)} {...props} />
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
