// Cliente: "Confirmar canje" y "¡Canje confirmado!" (US-40, CA-40.3, CA-40.6 y CA-40.7, contrato
// §3.7.2 y prototipo ClienteCanjes). Confirmar no descuenta nada: el saldo se valida acá, con el
// que ya tiene cargado la pantalla (decisión S4-2). El catálogo (US-39) lo abre con la
// recompensa elegida y su saldo.
import { useState } from 'react'
import {
  RewardSummary,
  useConfirmMyRedemption,
  useEscapeKey,
  type ConfirmedRedemption,
} from '@/features/redemptions'
import type { Reward } from '@/features/rewards'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { formatInteger } from '@/shared/lib/numbers'
import { RedemptionCodeModal } from './RedemptionCodeModal'

type ConfirmRedemptionFlowProps = {
  /** La recompensa que eligió el Cliente en el catálogo */
  reward: Pick<Reward, 'id' | 'name' | 'description' | 'points' | 'photoUrl'>
  /** Saldo que ya tiene cargado la pantalla (`balance` del catálogo) */
  balance: number
  /** Cierra el flujo y vuelve al catálogo */
  onClose: () => void
  /** "Ver mis canjes": abre Mis canjes */
  onViewMyRedemptions: () => void
}

// Validación de pantalla, con el botón Confirmar deshabilitado (§3.7.2, decisión S4-2)
function balanceError(balance: number, points: number) {
  if (balance < 0) return 'Tenés un ajuste pendiente. Comunicate con el restaurante.'
  if (balance < points) return 'No te alcanzan los puntos para esta recompensa.'
  return null
}

function ConfirmedStep({
  redemption,
  onBackToCatalog,
  onViewMyRedemptions,
}: {
  redemption: ConfirmedRedemption
  onBackToCatalog: () => void
  onViewMyRedemptions: () => void
}) {
  return (
    <RedemptionCodeModal
      redemption={redemption}
      onClose={onBackToCatalog}
      actions={
        <>
          <Button type="button" variant="secondary" className="flex-1 px-4 whitespace-nowrap" onClick={onBackToCatalog}>
            Volver al catálogo
          </Button>
          <Button type="button" className="flex-1 px-4 whitespace-nowrap" onClick={onViewMyRedemptions}>
            Ver mis canjes
          </Button>
        </>
      }
    />
  )
}

export function ConfirmRedemptionFlow({
  reward,
  balance,
  onClose,
  onViewMyRedemptions,
}: ConfirmRedemptionFlowProps) {
  const confirm = useConfirmMyRedemption()
  const [confirmed, setConfirmed] = useState<ConfirmedRedemption | null>(null)
  useEscapeKey(confirmed ? () => undefined : onClose)

  if (confirmed) {
    return (
      <ConfirmedStep
        redemption={confirmed}
        onBackToCatalog={onClose}
        onViewMyRedemptions={onViewMyRedemptions}
      />
    )
  }

  const validation = balanceError(balance, reward.points)
  // La decisión es por `code`, nunca por el texto del error. El catálogo se refresca solo: la
  // mutación invalida las recompensas.
  const backendError =
    confirm.error?.code === 'REWARD_NOT_AVAILABLE'
      ? ['Esta recompensa ya no está disponible.']
      : confirm.error?.messages

  return (
    <Modal title="Confirmar canje" onClose={onClose} className="max-w-sm">
      <RewardSummary
        name={reward.name}
        description={reward.description}
        points={reward.points}
        photoUrl={reward.photoUrl}
      />
      <div className="mt-3 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm">
        Saldo: <strong>{formatInteger(balance)} pts</strong> →{' '}
        <strong>{formatInteger(balance - reward.points)} pts</strong> al usarlo
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-700">
        Vas a canjear {formatInteger(reward.points)} puntos por esta recompensa. Los puntos se
        descuentan cuando lo uses en el local. Tenés 15 minutos para presentar el código en caja.
      </p>

      {(validation || backendError) && (
        <Alert variant="error" className="mt-3">
          {validation ?? <AlertMessages messages={backendError ?? []} />}
        </Alert>
      )}

      <div className="mt-5 flex gap-2">
        <Button type="button" variant="secondary" className="flex-1 px-4 whitespace-nowrap" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          loading={confirm.isPending}
          type="button"
          className="flex-1"
          disabled={validation !== null || confirm.isPending}
          onClick={() => confirm.mutate(reward.id, { onSuccess: setConfirmed })}
        >
          Confirmar
        </Button>
      </div>
    </Modal>
  )
}
