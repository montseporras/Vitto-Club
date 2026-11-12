// Ventana "Rechazar canje {código}" (US-43, CA-43.1 a CA-43.3, contrato §3.10.2 y prototipo
// CanjeAccion, acción `rechazar`). La misma para el panel del cliente en Caja, la ventana
// "Registrar uso" (US-42), Canjes del Administrador y, cuando exista, Canjes por código (US-41).
// No reintegra nada: confirmar no había descontado ni puntos ni stock.
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { DOCUMENT_TYPES, type DocumentType } from '@/domain/documents'
import { useToast } from '@/shared/components/feedback/useToast'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { Textarea } from '@/shared/components/ui/Textarea'
import { formatInteger } from '@/shared/lib/numbers'
import { useRejectRedemption } from '../api/redemptions.queries'
import { useEscapeKey } from '../lib/use-escape-key'
import {
  rejectRedemptionSchema,
  type RejectRedemptionFormInput,
  type RejectRedemptionFormOutput,
} from '../schemas/reject-redemption.schema'
import type { ConfirmedRedemption } from '../types/redemption'

type RejectRedemptionModalProps = {
  /** El canje a rechazar; sirve tanto el completo como el recién confirmado */
  redemption: ConfirmedRedemption
  customer: {
    firstName: string
    lastName: string
    documentType: DocumentType
    documentNumber: string
  }
  onClose: () => void
}

// Motivos rápidos (§3.10.2): completan el campo con su texto; "Otro" lo deja vacío
const OTHER_REASON = 'Otro'
const QUICK_REASONS = ['Sin insumo', 'El cliente desistió', 'El cliente no está', OTHER_REASON]

// Errores tras los que el canje ya no está Confirmado: no se puede volver a intentar
const FINAL_ERRORS = ['REDEMPTION_EXPIRED', 'REDEMPTION_NOT_CONFIRMED']

export function RejectRedemptionModal({ redemption, customer, onClose }: RejectRedemptionModalProps) {
  const showToast = useToast()
  const reject = useRejectRedemption()
  const [chip, setChip] = useState<string | null>(null)
  useEscapeKey(onClose)

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<RejectRedemptionFormInput, unknown, RejectRedemptionFormOutput>({
    resolver: zodResolver(rejectRedemptionSchema),
    defaultValues: { reason: '' },
  })

  const pickChip = (label: string) => {
    setChip(label)
    setValue('reason', label === OTHER_REASON ? '' : label)
    // Como en el prototipo, elegir un motivo borra el error del campo
    clearErrors('reason')
  }

  const onSubmit = ({ reason }: RejectRedemptionFormOutput) => {
    reject.mutate(
      { code: redemption.code, reason },
      {
        onSuccess: () => {
          showToast('Canje rechazado.')
          onClose()
        },
      },
    )
  }

  const error = reject.error
  // El código no existe (404) o el canje ya se resolvió o venció: se muestra el mensaje y se
  // deja solo "Volver"
  const finalError = Boolean(
    error && (error.status === 404 || (error.code && FINAL_ERRORS.includes(error.code))),
  )

  return (
    <Modal title={`Rechazar canje ${redemption.code}`} onClose={onClose} className="max-w-3xl">
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 px-4 py-3 text-sm">
          <p>
            <span className="font-bold text-accent-800">Cliente:</span> {customer.firstName}{' '}
            {customer.lastName} · {DOCUMENT_TYPES[customer.documentType].label}{' '}
            {customer.documentNumber}
          </p>
          <p className="mt-0.5">
            <span className="font-bold text-accent-800">Recompensa:</span>{' '}
            {redemption.reward.name} · {formatInteger(redemption.reward.points)} pts
          </p>
        </div>

        <p className="mt-3 text-sm text-neutral-700">
          No se descontó nada, así que no hay puntos ni stock para reintegrar.
        </p>

        <div className="mt-2 mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Motivos rápidos">
          {QUICK_REASONS.map((label) => (
            <Button
              key={label}
              type="button"
              variant={chip === label ? 'primary' : 'secondary'}
              aria-pressed={chip === label}
              className="h-8 px-3 text-xs"
              onClick={() => pickChip(label)}
            >
              {label}
            </Button>
          ))}
        </div>

        <FormField
          id="reject-reason"
          label="Motivo (obligatorio)"
          hideRequiredMark
          error={errors.reason?.message}
        >
          <Textarea
            id="reject-reason"
            rows={3}
            autoFocus
            placeholder="Ej: no hay insumos para preparar la recompensa"
            aria-invalid={errors.reason ? true : undefined}
            aria-describedby={errors.reason ? 'reject-reason-error' : undefined}
            {...register('reason')}
          />
        </FormField>

        {error && (
          <Alert variant="error" className="mt-3">
            <AlertMessages messages={error.messages} />
          </Alert>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Volver
          </Button>
          {!finalError && (
            <Button type="submit" disabled={reject.isPending}>
              Rechazar
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
