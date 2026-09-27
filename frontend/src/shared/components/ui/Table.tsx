import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { tableStyles } from '@/styles/ui'

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className={tableStyles.wrapper}>
      <table className={cn(tableStyles.table, className)} {...props} />
    </div>
  )
}

export function TableHead({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn(tableStyles.head, className)} {...props} />
}

export function TableHeaderCell({ className, ...props }: ComponentProps<'th'>) {
  return <th className={cn(tableStyles.headCell, className)} {...props} />
}

type TableRowProps = ComponentProps<'tr'> & {
  /** Fila clickeable: resalta al pasar el mouse. */
  interactive?: boolean
}

export function TableRow({ className, interactive, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        tableStyles.row,
        interactive && tableStyles.rowInteractive,
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn(tableStyles.cell, className)} {...props} />
}
