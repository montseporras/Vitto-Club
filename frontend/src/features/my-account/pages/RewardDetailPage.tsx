// Detalle de una recompensa (diseño V2): foto, nombre, puntos, descripción y "Canjear recompensa",
// que abre "Confirmar canje" (US-40). El saldo se compara en la pantalla, como permite la decisión
// S4-2 ("Te faltan {n} pts").
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { RewardExpiryTag, RewardImage, useMyCatalog } from '@/features/rewards'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { ClientPageHeader, PointsPill } from '../components/client/ClientUI'
import { ConfirmRedemptionFlow } from '../components/ConfirmRedemptionFlow'
import { CUSTOMER_PATHS, historyRedemptionsPath } from '../lib/paths'

export function RewardDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const catalog = useMyCatalog('ALL')
  const [redeeming, setRedeeming] = useState(false)
  const reward = catalog.data?.items.find((item) => item.id === Number(id))

  return (
    <div className={cn(clientStyles.page, 'md:max-w-3xl lg:max-w-3xl')}>
      <ClientPageHeader title="Recompensa" backTo={CUSTOMER_PATHS.rewards} />

      {catalog.isPending ? (
        <StatusText className="py-6 text-center">Cargando…</StatusText>
      ) : catalog.isError ? (
        <Alert variant="error">No pudimos cargar la recompensa.</Alert>
      ) : !reward ? (
        <EmptyState
          icon={ICONS.gift}
          title="Esta recompensa ya no está disponible"
          description="Puede que se haya agotado o que la hayan sacado del catálogo."
          action={
            <Button type="button" variant="secondary" onClick={() => navigate(CUSTOMER_PATHS.rewards)}>
              Ver recompensas
            </Button>
          }
        />
      ) : (
        <article className={cn(clientStyles.card, 'grid gap-5 p-4 sm:grid-cols-[45%_1fr] sm:items-center sm:p-5')}>
          <RewardImage
            photoUrl={reward.photoUrl}
            className="aspect-[4/3] w-full rounded-2xl"
            genericClassName="bg-gradient-to-br from-accent-50 to-accent-200 text-accent-700"
            iconClassName="size-14"
          />
          <div className="grid justify-items-start gap-3">
            <h2 className="font-heading text-3xl leading-tight font-bold text-ink">{reward.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <PointsPill points={reward.points} className="px-4 py-1.5 text-base" />
              <RewardExpiryTag reward={reward} />
            </div>
            {reward.description && <p className="text-neutral-700">{reward.description}</p>}

            {catalog.data.balance < reward.points && (
              <p className="text-sm font-semibold text-accent-800">
                Te faltan {formatInteger(reward.points - Math.max(0, catalog.data.balance))} pts
              </p>
            )}
            <Button
              type="button"
              className="mt-1 w-full sm:w-auto"
              disabled={catalog.data.balance < reward.points}
              onClick={() => setRedeeming(true)}
            >
              <Icon d={ICONS.gift} className="size-5" />
              Canjear recompensa
            </Button>
          </div>
        </article>
      )}

      {redeeming && reward && catalog.data && (
        <ConfirmRedemptionFlow
          reward={reward}
          balance={catalog.data.balance}
          onClose={() => setRedeeming(false)}
          onViewMyRedemptions={() => navigate(historyRedemptionsPath())}
        />
      )}
    </div>
  )
}
