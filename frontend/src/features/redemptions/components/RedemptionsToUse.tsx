// Bloque "Canjes para usar ahora" del panel del cliente en Caja (US-42, CA-42.9, contrato §3.12.2 y
// prototipo RegistrarConsumo): solo los Confirmados vigentes, el que vence primero arriba.
// Se actualiza al abrir el panel y después de cada acción; la cuenta regresiva vuelve a pedir la
// lista una vez cuando un canje llega a 0, como en Mis canjes.
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { useCustomerRedemptions } from '../api/redemptions.queries'
import { expiresInText, isExpiringSoon } from '../lib/format'
import { useExpiryRefetch } from '../lib/use-expiry-refetch'
import type { Redemption } from '../types/redemption'

type RedemptionsToUseProps = {
  customerId: number
  /** "Registrar uso": abre la ventana de US-42 */
  onUse: (redemption: Redemption) => void
  /** "Rechazar": abre la ventana de US-43 */
  onReject: (redemption: Redemption) => void
}

export function RedemptionsToUse({ customerId, onUse, onReject }: RedemptionsToUseProps) {
  const redemptions = useCustomerRedemptions(customerId)
  const now = useExpiryRefetch(redemptions.data, redemptions.refetch)

  if (redemptions.isLoading) return <StatusText>Cargando…</StatusText>

  if (redemptions.isError) {
    return (
      <Alert variant="error">
        No se pudieron cargar los canjes.
        <AlertMessages messages={redemptions.error.messages} />
      </Alert>
    )
  }

  if (!redemptions.data || redemptions.data.length === 0) {
    return <StatusText>No tiene canjes para usar.</StatusText>
  }

  return (
    <ul className="flex flex-col divide-y divide-accent-100">
      {redemptions.data.map((redemption) => (
        <li key={redemption.id} className="py-2">
          <div className="flex items-start justify-between gap-3">
            <span>
              <strong>{redemption.reward.name}</strong>
              <br />
              <span className="text-sm text-neutral-600">
                Código <strong className="tracking-wide text-ink">{redemption.code}</strong> ·{' '}
                <span className={cn(isExpiringSoon(redemption.expiresAt, now) && 'text-red-700')}>
                  {expiresInText(redemption.expiresAt, now)}
                </span>
              </span>
            </span>
            <span className="shrink-0 tabular-nums">
              {formatInteger(redemption.reward.points)} pts
            </span>
          </div>
          <div className="mt-1.5 flex justify-end gap-1.5">
            <Button type="button" variant="secondary" onClick={() => onReject(redemption)}>
              Rechazar
            </Button>
            <Button type="button" onClick={() => onUse(redemption)}>
              Registrar uso
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
