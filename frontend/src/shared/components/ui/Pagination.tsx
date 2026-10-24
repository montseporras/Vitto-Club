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
