import type { Ref } from 'react'
import { cn } from '@/shared/lib/utils'
import { paginationStyles } from '@/styles/ui'
import { Button } from './Button'
import { Icon } from './Icon'
import { ICONS } from './icons'

type PaginationProps = {
  /** Página actual, empieza en 1. */
  page: number
  /** Cantidad de páginas; con 1 o menos no se muestra. */
  totalPages: number
  onChange: (page: number) => void
  disabled?: boolean
  className?: string
}

/** Paginador de un listado: anterior, página actual y siguiente. */
export function Pagination({
  page,
  totalPages,
  onChange,
  disabled,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginación" className={cn(paginationStyles.root, className)}>
      <p className={paginationStyles.status} aria-live="polite">
        Página {page} de {totalPages}
      </p>
      <div className={paginationStyles.actions}>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <Icon d={ICONS.arrowLeft} className="size-4" />
          Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
          <Icon d={ICONS.chevronRight} className="size-4" />
        </Button>
      </div>
    </nav>
  )
}

type RangePaginationProps = {
  /** Página actual, empieza en 1. */
  page: number
  /** Total de filas del listado. */
  total: number
  /** Filas por página (el `limit` que devolvió el backend). */
  pageSize: number
  onChange: (page: number) => void
  disabled?: boolean
  className?: string
  /** Para medir su alto (useRowsThatFit). */
  ref?: Ref<HTMLElement>
}

/**
 * Paginado de las pantallas de Administración (ajustes S5-57): "Mostrando a–b de N" a la
 * izquierda y Anterior · Siguiente a la derecha. Siempre se ve, y queda abajo del recuadro.
 */
export function RangePagination({
  page,
  total,
  pageSize,
  onChange,
  disabled,
  className,
  ref,
}: RangePaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <nav
      ref={ref}
      aria-label="Paginación"
      className={cn('mt-auto flex flex-wrap items-center justify-between gap-3 pt-4', className)}
    >
      <p className="text-[13px] text-[#7a6e63]" aria-live="polite">
        Mostrando {start}–{end} de {total}
      </p>
      <div className={paginationStyles.actions}>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  )
}
