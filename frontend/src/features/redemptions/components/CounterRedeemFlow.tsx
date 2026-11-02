// Caja: "Canjear recompensa" y "¿Aplicar el canje ahora?" (US-40, CA-40.8 y CA-40.9, contrato
// §3.7.2 y prototipo CanjeAccion, acción `confirmar`). Confirmar no descuenta nada: el saldo se
// valida acá, con el que ya tiene cargado la búsqueda (decisión S4-2).
import { useState } from 'react'
import { DOCUMENT_TYPES, type DocumentType } from '@/domain/documents'
import { RewardExpiryTag, type Reward } from '@/features/rewards'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { useToast } from '@/shared/components/feedback/useToast'
import { formatInteger } from '@/shared/lib/numbers'
import { useConfirmCustomerRedemption } from '../api/redemptions.queries'
import { useEscapeKey } from '../lib/use-escape-key'
import type { ConfirmedRedemption } from '../types/redemption'
import { RewardSummary } from './RewardSummary'

type CounterRedeemFlowProps = {
  customer: {
    id: number
    firstName: string
    lastName: string
    documentType: DocumentType
    documentNumber: string
  }
  /** Saldo que ya cargó la búsqueda (`GET /customers/:id/puntos`) */
  balance: number
  reward: Reward
  onClose: () => void
  /** "Sí, aplicar": sigue con la ventana "Registrar uso" (US-42). */
  onApplyNow?: (redemption: ConfirmedRedemption) => void
}

// Validación de pantalla antes de llamar (§3.7.2, decisión S4-2)
function balanceError(balance: number, points: number) {
  if (balance < 0) return 'El cliente tiene un ajuste pendiente: no puede canjear.'
  if (balance < points) return 'El cliente no tiene puntos suficientes para esta recompensa.'
  return null
}

export function CounterRedeemFlow({
  customer,
  balance,
  reward,
  onClose,
  onApplyNow,
}: CounterRedeemFlowProps) {
  const showToast = useToast()
  const confirm = useConfirmCustomerRedemption(customer.id)
  const [confirmed, setConfirmed] = useState<ConfirmedRedemption | null>(null)

  const keepForLater = () => {
    if (!confirmed) return
    showToast(`Canje ${confirmed.code} confirmado. Se aplica cuando el cliente lo presente.`)
    onClose()
  }
  const applyNow = () => {
    if (!confirmed) return
    onApplyNow?.(confirmed)
    onClose()
  }
  // Escape en el segundo paso equivale a "No, después": el canje ya está confirmado
  useEscapeKey(confirmed ? keepForLater : onClose)

  if (confirmed) {
    return (
      <Modal title="Canje confirmado" onClose={keepForLater}>
        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-accent-800">
            Código del canje
          </p>
          <p className="font-heading text-4xl tracking-[0.12em]">{confirmed.code}</p>
          <p className="text-sm text-neutral-700">
            {confirmed.reward.name} · {formatInteger(confirmed.reward.points)} pts
          </p>
        </div>
        <p className="mt-4 font-semibold">¿Aplicar el canje ahora?</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={keepForLater}>
            No, después
          </Button>
          <Button type="button" onClick={applyNow}>
            Sí, aplicar
          </Button>
        </div>
      </Modal>
    )
  }

  const validation = balanceError(balance, reward.points)

  return (
    <Modal title="Canjear recompensa" onClose={onClose}>
      <RewardSummary
        name={reward.name}
        description={reward.description}
        points={reward.points}
        tag={<RewardExpiryTag reward={reward} />}
      />

      <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/60 px-4 py-3 text-sm">
        <p>
          <span className="font-bold text-accent-800">Cliente:</span> {customer.firstName}{' '}
          {customer.lastName} · {DOCUMENT_TYPES[customer.documentType].label}{' '}
          {customer.documentNumber}
        </p>
        <p className="mt-1">
          Saldo: {formatInteger(balance)} pts →{' '}
          <strong>{formatInteger(balance - reward.points)} pts</strong> al usarlo
        </p>
      </div>

      <p className="mt-3 text-sm">
        Confirmá que el cliente acepta el canje. Los puntos se descuentan cuando se registra el uso;
        el canje dura 15 minutos.
      </p>

      {(validation || confirm.error) && (
        <Alert variant="error" className="mt-3">
          {validation ?? <AlertMessages messages={confirm.error?.messages ?? []} />}
        </Alert>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={validation !== null || confirm.isPending}
          onClick={() => confirm.mutate(reward.id, { onSuccess: setConfirmed })}
        >
          Confirmar
        </Button>
      </div>
    </Modal>
  )
}
