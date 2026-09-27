import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import {
  dataListItemStyles,
  dataListStyles,
  dataListTermStyles,
  dataListValueStyles,
} from '@/styles/ui'

type DataListProps = {
  items: { label: string; value: ReactNode }[]
  className?: string
}

/** Lista de datos etiqueta/valor en dos columnas. */
export function DataList({ items, className }: DataListProps) {
  return (
    <dl className={cn(dataListStyles, className)}>
      {items.map((item) => (
        <div key={item.label} className={dataListItemStyles}>
          <dt className={dataListTermStyles}>{item.label}</dt>
          <dd className={dataListValueStyles}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
