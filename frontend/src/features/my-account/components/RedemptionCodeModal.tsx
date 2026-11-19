// Ventana con el código del canje en grande, la cuenta regresiva y "Presentá este código en caja"
// (US-40, CA-40.7). Se abre al confirmar un canje y también al tocar un canje Confirmado en
// "Mis canjes" o en el Historial, para volver a mostrar el código en la caja.
import type { ReactNode } from 'react'
import { Button } from '@/shared/components/ui/Button'
import {
  countdownText,
  isExpiringSoon,
  useEscapeKey,
  useNow,
  type ConfirmedRedemption,
  type MyRedemption,
} from '@/features/redemptions'
import { Modal } from '@/shared/components/ui/Modal'
import { formatInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'

type RedemptionCodeModalProps = {
  redemption: Pick<ConfirmedRedemption, 'code' | 'expiresAt' | 'reward'>
  title?: string
  onClose: () => void
  /** Botones de abajo */
  actions: ReactNode
}

export function RedemptionCodeModal({
  redemption,
  title = '¡Canje confirmado!',
  onClose,
  actions,
}: RedemptionCodeModalProps) {
  const now = useNow(1000)
  useEscapeKey(onClose)
  const expired = new Date(redemption.expiresAt).getTime() <= now

  return (
    <Modal title={title} onClose={onClose} className="max-w-sm">
      <div className="text-center">
        <p className="text-sm text-neutral-700">
          {redemption.reward.name} · {formatInteger(redemption.reward.points)} pts
        </p>
        <div className="mt-3 rounded-2xl border-2 border-dashed border-orange-400 bg-white p-3">
          <p className="text-3xl font-extrabold tracking-[0.22em] text-accent-800">{redemption.code}</p>
          <p
            className={cn(
              'text-sm font-bold',
              expired || isExpiringSoon(redemption.expiresAt, now) ? 'text-red-700' : 'text-olive-800',
            )}
          >
            {countdownText(redemption.expiresAt, now)}
          </p>
        </div>
        <p className="mt-3 text-sm">Presentá este código en caja.</p>
      </div>
      <div className="mt-5 flex gap-2">{actions}</div>
    </Modal>
  )
}

/**
 * El código de un canje ya Confirmado, para mostrarlo de nuevo en la caja (Mis canjes e Historial).
 * Si se puede cancelar, ofrece "Cancelar canje".
 */
export function ConfirmedRedemptionCode({
  redemption,
  onClose,
  onCancel,
}: {
  redemption: MyRedemption
  onClose: () => void
  onCancel: (redemption: MyRedemption) => void
}) {
  return (
    <RedemptionCodeModal
      redemption={redemption}
      title="Canje confirmado"
      onClose={onClose}
      actions={
        <>
          {redemption.canCancel && (
            <Button type="button" variant="secondary" className="flex-1 px-4 whitespace-nowrap" onClick={() => onCancel(redemption)}>
              Cancelar canje
            </Button>
          )}
          <Button type="button" className="flex-1 px-4 whitespace-nowrap" onClick={onClose}>
            Listo
          </Button>
        </>
      }
    />
  )
}
