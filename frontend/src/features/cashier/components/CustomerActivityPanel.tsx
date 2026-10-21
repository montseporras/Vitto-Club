import { useId, useState } from 'react'
import type { Role } from '@/domain/roles'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { isoToDisplayDateTime } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import { dataListTermStyles, pointsToneStyles } from '@/styles/ui'
import { useCustomerMovements } from '../api/cashier.queries'
import { formatSignedInteger } from '@/shared/lib/numbers'

// El panel muestra los últimos 5 movimientos (contrato §3.1.4)
const MOVEMENTS_LIMIT = 5

type CustomerActivityPanelProps = {
  customerId: number
  role: Role
}

/**
 * Panel desplegable "Ver canjes, recompensas y movimientos" (US-46, CA-46.7).
 * Canjes y recompensas son textos fijos hasta el Sprint 4. Al Cajero el backend
 * le devuelve solo los movimientos de las últimas 24 h.
 */
export function CustomerActivityPanel({ customerId, role }: CustomerActivityPanelProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const movements = useCustomerMovements(customerId, MOVEMENTS_LIMIT, open)
  const isAdmin = role === 'ADMIN'

  const toggleText = open
    ? 'Ocultar canjes, recompensas y movimientos'
    : isAdmin
      ? 'Ver canjes, recompensas y últimos movimientos'
      : 'Ver canjes, recompensas y movimientos de las últimas 24 hs'

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon d={open ? ICONS.chevronDown : ICONS.chevronRight} className="size-4" />
        {toggleText}
      </Button>

      {open && (
        <div id={panelId} className="mt-4 grid gap-5 sm:grid-cols-3">
          <section>
            <h4 className={cn(dataListTermStyles, 'mb-1.5')}>Canjes</h4>
            <StatusText>No tiene canjes.</StatusText>
          </section>

          <section>
            <h4 className={cn(dataListTermStyles, 'mb-1.5')}>
              Recompensas a las que puede acceder
            </h4>
            <StatusText>
              No tiene puntos suficientes para ninguna recompensa disponible.
            </StatusText>
          </section>

          <section aria-live="polite">
            <h4 className={cn(dataListTermStyles, 'mb-1.5')}>
              {isAdmin ? 'Últimos movimientos' : 'Movimientos de las últimas 24 hs'}
            </h4>

            {movements.isLoading && <StatusText>Cargando…</StatusText>}

            {movements.isError && (
              <Alert variant="error">
                No se pudieron cargar los movimientos.
                <AlertMessages messages={movements.error.messages} />
              </Alert>
            )}

            {movements.data && movements.data.items.length === 0 && (
              <StatusText>Sin movimientos registrados.</StatusText>
            )}

            {movements.data && movements.data.items.length > 0 && (
              <ul className="flex flex-col divide-y divide-accent-100">
                {movements.data.items.map((movement) => (
                  <li
                    key={movement.id}
                    className="flex items-start justify-between gap-3 py-2"
                  >
                    <span>
                      {movement.description}
                      <br />
                      <span className="text-sm text-neutral-600">
                        {isoToDisplayDateTime(movement.createdAt)}
                      </span>
                    </span>
                    <strong
                      className={cn(
                        'shrink-0 tabular-nums',
                        movement.points < 0
                          ? pointsToneStyles.negative
                          : pointsToneStyles.positive,
                      )}
                    >
                      {formatSignedInteger(movement.points)} pts
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
