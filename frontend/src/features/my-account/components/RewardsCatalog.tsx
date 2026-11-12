// Catálogo de recompensas del Cliente (US-39, CA-39.2 a CA-39.5, contrato §3.5.1 y prototipo
// ClienteCanjes → Catálogo): saldo, filtros, tarjetas y pie. "Canjear" abre "Confirmar canje"
// (US-40) con la recompensa y el saldo que ya trajo el catálogo.
import { useState } from 'react'
import { useMyCatalog, type CatalogFilter, type CatalogReward } from '@/features/rewards'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { pointsToneStyles } from '@/styles/ui'
import { CatalogRewardCard } from './CatalogRewardCard'
import { ConfirmRedemptionFlow } from './ConfirmRedemptionFlow'

// Botones de filtro (§2.5), en el orden del prototipo
const FILTERS: { value: CatalogFilter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'MOST_REDEEMED', label: 'Más canjeadas' },
  { value: 'EXPIRING_SOON', label: 'Próx. a vencer' },
]

type RewardsCatalogProps = {
  /** "Ver mis canjes" de "¡Canje confirmado!": pasa a Mis canjes */
  onViewMyRedemptions: () => void
}

export function RewardsCatalog({ onViewMyRedemptions }: RewardsCatalogProps) {
  const [filter, setFilter] = useState<CatalogFilter>('ALL')
  // Recompensa elegida con "Canjear" (abre "Confirmar canje")
  const [redeeming, setRedeeming] = useState<CatalogReward | null>(null)
  const catalog = useMyCatalog(filter)

  if (catalog.isPending) {
    return <StatusText className="py-6 text-center">Cargando…</StatusText>
  }

  if (catalog.isError) {
    return (
      <Alert variant="error">
        <AlertMessages messages={catalog.error.messages} />
      </Alert>
    )
  }

  const { balance, items } = catalog.data
  const negative = balance < 0

  return (
    <div className="grid gap-3">
      {negative && (
        <div
          role="status"
          className="rounded-xl border border-l-4 border-accent-600/40 border-l-accent-600 bg-accent-50 px-3 py-2.5 text-xs leading-relaxed text-accent-800"
        >
          Tenés un ajuste pendiente, por eso no podés canjear por ahora. Comunicate con el
          restaurante.
        </div>
      )}

      <p className="text-sm text-neutral-700">
        Tenés{' '}
        <strong
          className={cn(
            'font-number font-normal lining-nums tabular-nums text-xl',
            negative ? pointsToneStyles.negative : 'text-accent-800',
          )}
        >
          {formatInteger(balance)} pts
        </strong>{' '}
        para canjear
      </p>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar recompensas">
        {FILTERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={filter === option.value ? 'primary' : 'secondary'}
            aria-pressed={filter === option.value}
            className="h-8 px-3 text-xs"
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {items.length > 0 ? (
        <ul className={cn('grid grid-cols-2 gap-2.5', catalog.isFetching && 'opacity-70')}>
          {items.map((reward) => (
            <CatalogRewardCard
              key={reward.id}
              reward={reward}
              balance={balance}
              onRedeem={setRedeeming}
            />
          ))}
        </ul>
      ) : (
        <StatusText className="rounded-xl border border-dashed border-orange-200 px-3 py-5 text-center">
          {filter === 'EXPIRING_SOON'
            ? 'No hay recompensas que venzan en los próximos 7 días.'
            : 'No hay recompensas disponibles por ahora.'}
        </StatusText>
      )}

      <StatusText className="text-xs">
        Al canjear recibís un código que dura 15 minutos. Los puntos se descuentan recién cuando lo
        usás en el local.
      </StatusText>

      {redeeming && (
        <ConfirmRedemptionFlow
          reward={redeeming}
          balance={balance}
          onClose={() => setRedeeming(null)}
          onViewMyRedemptions={() => {
            setRedeeming(null)
            onViewMyRedemptions()
          }}
        />
      )}
    </div>
  )
}
