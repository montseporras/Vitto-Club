// Recompensas del Inicio del Cliente: las primeras 5 del catálogo y, al final, "Ver catálogo completo",
// que abre la pestaña Canjes en Catálogo. Reemplaza a la tarjeta "Recompensas" de US-39 (CA-39.6), a
// pedido de Denise. "Canjear" abre "Confirmar canje" (US-40), igual que en el Catálogo.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMyCatalog, type CatalogReward } from '@/features/rewards'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { buttonVariants } from '@/styles/ui'
import { cn } from '@/shared/lib/utils'
import { CatalogRewardCard } from './CatalogRewardCard'
import { ConfirmRedemptionFlow } from './ConfirmRedemptionFlow'

const PREVIEW_COUNT = 5

type RewardsPreviewProps = {
  /** "Ver catálogo completo": la pestaña Canjes, que abre en Catálogo */
  catalogUrl: string
  /** "Ver mis canjes" de "¡Canje confirmado!": la pestaña Canjes, que abre en Mis canjes */
  myRedemptionsUrl: string
}

export function RewardsPreview({ catalogUrl, myRedemptionsUrl }: RewardsPreviewProps) {
  const navigate = useNavigate()
  const catalog = useMyCatalog('ALL')
  // Recompensa elegida con "Canjear" (abre "Confirmar canje")
  const [redeeming, setRedeeming] = useState<CatalogReward | null>(null)

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
  const preview = items.slice(0, PREVIEW_COUNT)

  return (
    <section aria-label="Recompensas" className="grid gap-3">
      {preview.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2.5">
          {preview.map((reward) => (
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
          No hay recompensas disponibles por ahora.
        </StatusText>
      )}

      <Link to={catalogUrl} className={cn(buttonVariants(), 'justify-self-center text-xs')}>
        Ver catálogo completo
      </Link>

      {redeeming && (
        <ConfirmRedemptionFlow
          reward={redeeming}
          balance={balance}
          onClose={() => setRedeeming(null)}
          onViewMyRedemptions={() => {
            setRedeeming(null)
            navigate(myRedemptionsUrl)
          }}
        />
      )}
    </section>
  )
}
