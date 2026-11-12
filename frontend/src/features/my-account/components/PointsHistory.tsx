import { useState } from 'react'
import { Alert } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { isoToArgentinaDateTime } from '@/shared/lib/dates'
import { useMyPointsMovements } from '@/features/points-movements'
import type {
  CustomerPointsMovement,
  PointsLotStatus,
} from '@/features/points-movements'

const LOT_STATUS_LABELS: Record<PointsLotStatus, string> = {
  ACTIVE: 'Vigente',
  CONSUMED: 'Consumido',
  EXPIRED: 'Vencido',
  VOIDED: 'Anulado',
}

const customerMovementText = (movement: CustomerPointsMovement) => {
  const amount = Math.abs(movement.points)

  switch (movement.type) {
    case 'CONSUMPTION_CREDIT':
      return `Sumaste ${amount} pts por tu consumo`
    case 'VOID_REVERSAL':
      return `Se descontaron ${amount} pts por la anulación de un consumo`
    case 'MANUAL_ADJUSTMENT':
      return 'Ajuste del restaurante'
    case 'EXPIRATION':
      return `Se vencieron ${amount} pts`
    case 'REDEMPTION':
      return `Canjeaste ${movement.description.replace(/^Canje:\s*/, '')}`
  }
}

const signedPoints = (points: number) =>
  points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : '0'

const CUSTOMER_HISTORY_LIMIT = 20

const ARROW_BUTTON =
  'grid size-9 cursor-pointer place-items-center rounded-full border border-orange-200 bg-white text-accent-800 transition-colors hover:bg-accent-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700'

export function PointsHistory() {
  const [page, setPage] = useState(1)
  const result = useMyPointsMovements(page, CUSTOMER_HISTORY_LIMIT)
  const data = result.data
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.limit))
    : 1

  return (
    <section aria-labelledby="points-history-title">
      <h2 id="points-history-title" className="sr-only">
        Historial de puntos
      </h2>

      {result.isLoading && <StatusText>Cargando movimientos…</StatusText>}

      {result.isError && (
        <Alert>
          <p>{result.error.message}</p>
        </Alert>
      )}

      {data && !result.isError && data.items.length === 0 && (
        <StatusText className="rounded-xl border border-dashed p-6 text-center">
          Todavía no tenés movimientos.
        </StatusText>
      )}

      {data && !result.isError && data.items.length > 0 && (
        <>
          <ul className="grid gap-2">
            {data.items.map((movement) => (
              <li
                key={movement.id}
                // Sin salto de línea: los puntos quedan siempre a la derecha, aunque el texto sea largo
                className="flex items-start justify-between gap-3 rounded-xl border border-orange-200 bg-white px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">
                    {isoToArgentinaDateTime(movement.createdAt)}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug">{customerMovementText(movement)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <span
                    className={`font-number font-normal lining-nums tabular-nums whitespace-nowrap text-sm ${
                      movement.points > 0
                        ? 'text-green-700'
                        : movement.points < 0
                          ? 'text-red-700'
                          : ''
                    }`}
                  >
                    {signedPoints(movement.points)} pts
                  </span>
                  {movement.lot && (
                    <Badge className="text-[10px]">{LOT_STATUS_LABELS[movement.lot.status]}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Solo flechas: atrás a la izquierda y adelante a la derecha */}
          <nav aria-label="Paginación" className="mt-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={page <= 1 || result.isFetching}
              onClick={() => setPage((current) => current - 1)}
              className={ARROW_BUTTON}
            >
              <Icon d={ICONS.chevronRight} className="size-4 rotate-180" />
            </button>
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={page >= totalPages || result.isFetching}
              onClick={() => setPage((current) => current + 1)}
              className={ARROW_BUTTON}
            >
              <Icon d={ICONS.chevronRight} className="size-4" />
            </button>
          </nav>
        </>
      )}
    </section>
  )
}
