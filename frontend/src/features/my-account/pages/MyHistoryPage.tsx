// Historial del Cliente (diseño V2): se abre desde "Ver historial" de Mis canjes. Un control
// "Consumos / Canjes" muestra un historial por vez: los consumos (US-23) o todos los canjes con sus
// filtros y la opción de cancelar (US-45, US-43). Los movimientos de puntos están en Mi nivel.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { CustomerConsumptionHistory } from '@/features/consumptions'
import type { MyRedemption } from '@/features/redemptions'
import { cn } from '@/shared/lib/utils'
import { clientStyles } from '@/styles/ui'
import { CancelRedemptionDialog } from '../components/CancelRedemptionDialog'
import { ClientPageHeader } from '../components/client/ClientUI'
import { MyRedemptions } from '../components/MyRedemptions'
import { ConfirmedRedemptionCode } from '../components/RedemptionCodeModal'
import { CUSTOMER_PATHS, HISTORY_REDEMPTIONS_VIEW, HISTORY_VIEW_PARAM } from '../lib/paths'

type View = 'consumptions' | 'redemptions'

const VIEWS: { value: View; label: string }[] = [
  { value: 'consumptions', label: 'Consumos' },
  { value: 'redemptions', label: 'Canjes' },
]

export function MyHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view: View =
    searchParams.get(HISTORY_VIEW_PARAM) === HISTORY_REDEMPTIONS_VIEW ? 'redemptions' : 'consumptions'
  const [cancelling, setCancelling] = useState<MyRedemption | null>(null)
  const [showingCode, setShowingCode] = useState<MyRedemption | null>(null)
  const navigate = useNavigate()

  const changeView = (next: View) =>
    setSearchParams(next === 'redemptions' ? { [HISTORY_VIEW_PARAM]: HISTORY_REDEMPTIONS_VIEW } : {}, {
      replace: true,
    })

  return (
    <div className={cn(clientStyles.page, 'lg:max-w-3xl')}>
      <ClientPageHeader title="Historial" backTo={CUSTOMER_PATHS.redemptions} />

      <div role="group" aria-label="Historial" className="grid grid-cols-2 gap-2">
        {VIEWS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={view === option.value}
            onClick={() => changeView(option.value)}
            className={cn(
              'min-h-12 cursor-pointer rounded-2xl px-3 text-base font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.98]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
              view === option.value
                ? 'bg-accent-700 text-white shadow-md shadow-accent-800/25'
                : 'bg-neutral-200 text-ink hover:bg-neutral-300',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === 'consumptions' ? (
        <CustomerConsumptionHistory />
      ) : (
        <MyRedemptions
          onCancel={setCancelling}
          onShowCode={setShowingCode}
          onBrowseCatalog={() => navigate(CUSTOMER_PATHS.rewards)}
        />
      )}

      {showingCode && (
        <ConfirmedRedemptionCode
          redemption={showingCode}
          onClose={() => setShowingCode(null)}
          onCancel={(redemption) => {
            setShowingCode(null)
            setCancelling(redemption)
          }}
        />
      )}

      {cancelling && (
        <CancelRedemptionDialog redemption={cancelling} onClose={() => setCancelling(null)} />
      )}
    </div>
  )
}
