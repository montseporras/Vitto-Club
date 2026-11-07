// Pestaña Canjes del Cliente (prototipo ClienteCanjes): el control "Catálogo / Mis canjes" alterna
// entre el catálogo de recompensas (US-39) y Mis canjes (US-45). Por defecto abre el Catálogo; con
// `?vista=mis` abre Mis canjes ("Ver código" del Inicio y "Ver mis canjes" de "¡Canje confirmado!").
// "Cancelar canje" abre el diálogo de US-43.
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { MyRedemption } from '@/features/redemptions'
import { cn } from '@/shared/lib/utils'
import { CancelRedemptionDialog } from '../components/CancelRedemptionDialog'
import { MyRedemptions } from '../components/MyRedemptions'
import { RewardsCatalog } from '../components/RewardsCatalog'
import { MY_REDEMPTIONS_VIEW, REDEMPTIONS_VIEW_PARAM } from '../components/redemptions-view'

type View = 'catalog' | 'mine'

const VIEWS: { value: View; label: string }[] = [
  { value: 'catalog', label: 'Catálogo' },
  { value: 'mine', label: 'Mis canjes' },
]

export function MyRedemptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view: View =
    searchParams.get(REDEMPTIONS_VIEW_PARAM) === MY_REDEMPTIONS_VIEW ? 'mine' : 'catalog'
  // Canje que el Cliente está por cancelar (diálogo "Cancelar canje")
  const [cancelling, setCancelling] = useState<MyRedemption | null>(null)

  const changeView = (next: View) =>
    setSearchParams(next === 'mine' ? { [REDEMPTIONS_VIEW_PARAM]: MY_REDEMPTIONS_VIEW } : {}, {
      replace: true,
    })

  return (
    <div className="mx-auto grid w-full max-w-xl gap-4">
      <div
        role="group"
        aria-label="Canjes"
        className="flex rounded-full border border-orange-200 bg-white p-0.75"
      >
        {VIEWS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={view === option.value}
            onClick={() => changeView(option.value)}
            className={cn(
              'flex-1 cursor-pointer rounded-full px-3 py-1.5 font-heading text-xs font-bold',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
              view === option.value ? 'bg-accent-700 text-white' : 'text-accent-800',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === 'catalog' ? (
        <RewardsCatalog onViewMyRedemptions={() => changeView('mine')} />
      ) : (
        <MyRedemptions onCancel={setCancelling} />
      )}

      {cancelling && (
        <CancelRedemptionDialog redemption={cancelling} onClose={() => setCancelling(null)} />
      )}
    </div>
  )
}
