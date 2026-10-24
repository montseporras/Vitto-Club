// Encabezado del Inicio del Cliente (US-19, CA-19.8): avatar, saldo, nivel, puntos acumulados y
// barra de progreso. Todo lo muestra tal cual lo manda GET /customers/me/puntos; no calcula nada.
import { LEVELS } from '@/domain/levels'
import { Badge } from '@/shared/components/ui/Badge'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/utils'
import type { CustomerPoints } from '../types/customer-points'
import { formatPoints } from './format-points'

type PointsSummaryProps = {
  points: CustomerPoints
}

export function PointsSummary({ points }: PointsSummaryProps) {
  const { balance, lifetimePoints, level } = points

  const levelMessage = level.next
    ? `Te faltan ${formatPoints(level.pointsToNext)} pts para llegar a ${LEVELS[level.next]}`
    : '¡Llegaste al nivel máximo!'

  return (
    <div className="flex items-center gap-4">
      {/* La foto queda para el Sprint 4 (decisión #9): avatar vacío. Todavía no abre el perfil */}
      <div
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-accent-200 bg-accent-50 text-accent-300"
      >
        <Icon d={ICONS.user} className="size-7" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-neutral-600">Puntos disponibles para canjear</p>
        <p
          className={cn(
            'font-heading text-3xl leading-tight tabular-nums',
            balance < 0 ? 'text-[#b3261e]' : 'text-accent-700',
          )}
        >
          {formatPoints(balance)}
        </p>
        <Badge className="mt-1 border-accent-200 bg-accent-100 text-accent-800">
          Nivel {LEVELS[level.current]}
        </Badge>

        <div className="mt-3 text-sm">
          <p>
            Puntos acumulados: <strong>{formatPoints(lifetimePoints)} pts</strong>
          </p>
          <div
            role="progressbar"
            aria-label="Progreso hacia el siguiente nivel"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={level.progressPercent}
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-accent-100"
          >
            <div
              className="h-full rounded-full bg-accent-700"
              style={{ width: `${level.progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-neutral-600">{levelMessage}</p>
        </div>
      </div>
    </div>
  )
}
