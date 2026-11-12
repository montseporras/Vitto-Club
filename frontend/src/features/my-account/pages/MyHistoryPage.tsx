// Pestaña Historial del Cliente: un solo título y un control "Consumos / Puntos" que muestra un
// historial por vez (consumos US-23 o puntos US-26), a pedido de Denise. Abre en Consumos.
import { useState } from 'react'
import { CustomerConsumptionHistory } from '@/features/consumptions'
import { cn } from '@/shared/lib/utils'
import { PointsHistory } from '../components/PointsHistory'

type View = 'consumptions' | 'points'

const VIEWS: { value: View; label: string }[] = [
  { value: 'consumptions', label: 'Consumos' },
  { value: 'points', label: 'Puntos' },
]

export function MyHistoryPage() {
  const [view, setView] = useState<View>('consumptions')

  return (
    <div className="mx-auto grid w-full max-w-xl gap-4">
      <h1 className="border-b border-accent-200 pb-1.5 text-sm font-bold uppercase tracking-[0.08em]">
        Historial
      </h1>

      <div
        role="group"
        aria-label="Historial"
        className="flex rounded-full border border-orange-200 bg-white p-0.75"
      >
        {VIEWS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={view === option.value}
            onClick={() => setView(option.value)}
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

      {view === 'consumptions' ? <CustomerConsumptionHistory /> : <PointsHistory />}
    </div>
  )
}
