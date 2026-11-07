import type { ReactNode } from 'react'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { formatInteger } from '@/shared/lib/numbers'

type RewardSummaryProps = {
  name: string
  description: string | null
  points: number
  /** Etiqueta de vencimiento, si corresponde (modal de Caja) */
  tag?: ReactNode
}

/**
 * Imagen genérica, nombre, descripción y puntos de la recompensa. Ninguna recompensa tiene foto
 * en el Sprint 4 (contrato §3.3): todas usan la imagen genérica.
 */
export function RewardSummary({ name, description, points, tag }: RewardSummaryProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        aria-hidden="true"
        className="grid size-22 shrink-0 place-items-center rounded-2xl bg-orange-100 text-accent-700"
      >
        <Icon d={ICONS.gift} className="size-9" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold">{name}</p>
        {description && <p className="mt-0.5 text-sm text-neutral-700">{description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-accent-800">{formatInteger(points)} pts</span>
          {tag}
        </div>
      </div>
    </div>
  )
}
