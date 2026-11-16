// Recompensas del Cliente (US-39, diseño V2): el catálogo completo, una fila por recompensa.
// Cada fila abre el detalle, donde se canjea.
import { useMyCatalog } from '@/features/rewards'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { ICONS } from '@/shared/components/ui/icons'
import { formatInteger } from '@/shared/lib/numbers'
import { clientStyles } from '@/styles/ui'
import { ClientPageHeader } from '../components/client/ClientUI'
import { RewardRow } from '../components/client/RewardCards'

export function RewardsPage() {
  const catalog = useMyCatalog('ALL')

  return (
    <div className={clientStyles.page}>
      <ClientPageHeader title="Recompensas" />

      {catalog.isPending ? (
        <StatusText className="py-6 text-center">Cargando…</StatusText>
      ) : catalog.isError ? (
        <Alert variant="error">
          <AlertMessages messages={catalog.error.messages} />
        </Alert>
      ) : (
        <>
          <p className="-mt-3 text-center text-sm text-neutral-600">
            Tenés{' '}
            <strong className="text-accent-800 tabular-nums">
              {catalog.data.balance < 0 && '−'}
              {formatInteger(Math.abs(catalog.data.balance))} pts
            </strong>{' '}
            para canjear
          </p>
          {catalog.data.items.length === 0 ? (
            <EmptyState
              icon={ICONS.gift}
              title="El catálogo está vacío por ahora"
              description="Seguí sumando puntos con cada consumo: cuando haya recompensas, las vas a ver acá."
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {catalog.data.items.map((reward) => (
                <li key={reward.id}>
                  <RewardRow reward={reward} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-center text-xs text-neutral-600">
            Al canjear recibís un código que dura 15 minutos. Los puntos se descuentan recién cuando lo
            usás en el local.
          </p>
        </>
      )}
    </div>
  )
}
