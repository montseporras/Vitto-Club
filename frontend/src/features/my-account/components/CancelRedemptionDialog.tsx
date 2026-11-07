// Diálogo "Cancelar canje" del Cliente en Mis canjes (US-43, CA-43.4 y CA-43.6, contrato §3.10.3 y
// prototipo ClienteCanjes). Cancelar no reintegra nada (no se había descontado nada) y no se audita.
import {
  useCancelMyRedemption,
  useEscapeKey,
  type MyRedemption,
} from '@/features/redemptions'
import { useToast } from '@/shared/components/feedback/useToast'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'

type CancelRedemptionDialogProps = {
  redemption: MyRedemption
  onClose: () => void
}

export function CancelRedemptionDialog({ redemption, onClose }: CancelRedemptionDialogProps) {
  const showToast = useToast()
  const cancel = useCancelMyRedemption()
  useEscapeKey(onClose)

  const confirm = () =>
    cancel.mutate(redemption.code, {
      onSuccess: () => {
        showToast('Canje cancelado.')
        onClose()
      },
    })

  // Con un error (vencido, ya resuelto o inexistente) el canje ya no se puede cancelar: se muestra
  // el mensaje del backend ("El canje ya venció." / "El canje ya no se puede cancelar.") y queda
  // solo "Volver". La lista ya se volvió a pedir.
  const error = cancel.error

  return (
    <Modal title="Cancelar canje" onClose={onClose} className="max-w-sm">
      <p className="text-sm text-neutral-700">
        ¿Cancelar el canje de <strong>{redemption.reward.name}</strong>? Lo vas a poder volver a
        pedir si tenés puntos.
      </p>

      {error && (
        <Alert variant="error" className="mt-3">
          <AlertMessages messages={error.messages} />
        </Alert>
      )}

      <div className="mt-5 flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Volver
        </Button>
        {!error && (
          <Button
            type="button"
            className="flex-1"
            disabled={cancel.isPending}
            onClick={confirm}
          >
            Cancelar canje
          </Button>
        )}
      </div>
    </Modal>
  )
}
