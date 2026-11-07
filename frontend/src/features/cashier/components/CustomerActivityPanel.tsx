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
import {
  AvailableRewards,
  CounterRedeemFlow,
  RedemptionsToUse,
  RegisterUseModal,
  type ConfirmedRedemption,
} from '@/features/redemptions'
import type { Reward } from '@/features/rewards'
import { useCustomerMovements } from '../api/cashier.queries'
import { formatSignedInteger } from '@/shared/lib/numbers'
import type { Customer } from '../types/customer'

// El panel muestra los últimos 5 movimientos (contrato §3.1.4)
const MOVEMENTS_LIMIT = 5

type CustomerActivityPanelProps = {
  customer: Customer
  /** Saldo que ya cargó la búsqueda (`GET /customers/:id/puntos`) */
  balance: number
  role: Role
  /** Se avisa cuando se registra el uso de un canje: el saldo del cliente cambió. */
  onBalanceChanged?: () => void
}

/**
 * Panel desplegable "Ver canjes, recompensas y movimientos" (US-46, CA-46.7).
 * "Recompensas a las que puede acceder" es de US-40 y "Canjes para usar ahora" de US-42. Al
 * Cajero el backend le devuelve solo los movimientos de las últimas 24 h.
 */
export function CustomerActivityPanel({
  customer,
  balance,
  role,
  onBalanceChanged,
}: CustomerActivityPanelProps) {
  const [open, setOpen] = useState(false)
  // Recompensa que se está por canjear en nombre del cliente (ventana "Canjear recompensa")
  const [redeeming, setRedeeming] = useState<Reward | null>(null)
  // Canje al que se le está registrando el uso (ventana "Registrar uso del canje")
  const [using, setUsing] = useState<ConfirmedRedemption | null>(null)
  const panelId = useId()
  const movements = useCustomerMovements(customer.id, MOVEMENTS_LIMIT, open)
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
            <h4 className={cn(dataListTermStyles, 'mb-1.5')}>Canjes para usar ahora</h4>
            <RedemptionsToUse
              customerId={customer.id}
              onUse={setUsing}
              // "Rechazar" abre la ventana de US-43: se conecta cuando exista
              onReject={() => undefined}
            />
          </section>

          <section>
            <h4 className={cn(dataListTermStyles, 'mb-1.5')}>
              Recompensas a las que puede acceder
            </h4>
            <AvailableRewards balance={balance} onRedeem={setRedeeming} />
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

      {redeeming && (
        <CounterRedeemFlow
          customer={customer}
          balance={balance}
          reward={redeeming}
          onClose={() => setRedeeming(null)}
          // "Sí, aplicar" sigue con la ventana "Registrar uso"
          onApplyNow={setUsing}
        />
      )}

      {using && (
        <RegisterUseModal
          redemption={using}
          customer={customer}
          onClose={() => setUsing(null)}
          onUsed={onBalanceChanged}
          // "Rechazar canje" abre la ventana de US-43: se conecta cuando exista
        />
      )}
    </div>
  )
}
