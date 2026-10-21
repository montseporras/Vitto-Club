// Aviso del Inicio del Cliente cuando el saldo quedó negativo por una anulación (US-19, CA-19.9).
// La página lo muestra solo si el backend manda negativeBalance = true.
import { Icon } from '@/shared/components/ui/Icon'

// Ícono de información del prototipo (círculo con "i")
const INFO_ICON = 'M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'

export function NegativeBalanceNotice() {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl border border-l-4 border-accent-600/40 border-l-accent-600 bg-accent-50 px-3 py-2.5 text-sm text-accent-800"
    >
      <Icon d={INFO_ICON} className="mt-0.5 size-4 shrink-0" />
      <p>
        Tu saldo tiene un ajuste pendiente. Comunicate con el restaurante para
        regularizarlo.
      </p>
    </div>
  )
}
