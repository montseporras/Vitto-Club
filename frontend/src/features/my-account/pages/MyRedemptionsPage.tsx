// Pestaña Canjes del Cliente. Por ahora solo tiene Mis canjes (US-45); el Catálogo y el control
// "Catálogo / Mis canjes" del prototipo son de US-39. "Cancelar canje" abre el diálogo de US-43.
import { useState } from 'react'
import type { MyRedemption } from '@/features/redemptions'
import { CancelRedemptionDialog } from '../components/CancelRedemptionDialog'
import { MyRedemptions } from '../components/MyRedemptions'

export function MyRedemptionsPage() {
  // Canje que el Cliente está por cancelar (diálogo "Cancelar canje")
  const [cancelling, setCancelling] = useState<MyRedemption | null>(null)

  return (
    <div className="mx-auto w-full max-w-xl">
      <MyRedemptions onCancel={setCancelling} />
      {cancelling && (
        <CancelRedemptionDialog redemption={cancelling} onClose={() => setCancelling(null)} />
      )}
    </div>
  )
}
