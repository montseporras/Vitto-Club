import { useState } from 'react'
import { Alert } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
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

export function PointsHistory() {
  const [page, setPage] = useState(1)
  const result = useMyPointsMovements(page, CUSTOMER_HISTORY_LIMIT)
  const data = result.data
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.limit))
    : 1

  return (
    <section aria-labelledby="points-history-title">
      <h2 id="points-history-title" className="mb-4 text-xl font-semibold">
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
          <ul className="grid gap-3">
            {data.items.map((movement) => (
              <li
                key={movement.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    {isoToArgentinaDateTime(movement.createdAt)}
                  </p>
                  <p className="mt-1">{customerMovementText(movement)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className={`font-semibold ${
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
                    <Badge>{LOT_STATUS_LABELS[movement.lot.status]}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-3">
            <StatusText>
              Mostrando {(page - 1) * data.limit + 1}–
              {Math.min(page * data.limit, data.total)} de {data.total}
            </StatusText>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1 || result.isFetching}
                onClick={() => setPage((current) => current - 1)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages || result.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
