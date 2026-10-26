import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { DOCUMENT_TYPES } from '@/domain/documents'
import type { ApiError } from '@/shared/api/ApiError'
import { FormActions } from '@/shared/components/forms/FormActions'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { formatInteger, formatMoney } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { inputStyles } from '@/styles/ui'
import { useCustomerPoints } from '../api/cashier.queries'
import { useVoidConsumption } from '../api/consumptions.queries'
import {
  VOID_REASON_MAX_LENGTH,
  voidConsumptionSchema,
  type VoidConsumptionFormInput,
  type VoidConsumptionFormOutput,
} from '../schemas/void-consumption.schema'
import type {
  Consumption,
  VoidConsumptionResponse,
} from '../types/consumption'

type VoidConsumptionModalProps = {
  consumption: Consumption
  onClose: () => void
  /** "Sí, registrar consumo": el mismo cliente queda cargado y el monto vacío. */
  onRegisterNew?: () => void
}

// Mensajes del contrato §3.2.2, elegidos por `code` y nunca por el texto del backend.
function errorMessages(error: ApiError, code: string): string[] {
  if (error.code === 'VOID_NOT_ALLOWED') {
    return ['Solo podés anular consumos propios dentro de las 24 hs.']
  }
  if (error.code === 'CONSUMPTION_ALREADY_VOIDED') {
    return ['Este consumo ya está anulado.']
  }
  if (error.status === 404) return [`No existe el consumo ${code}.`]
  return error.messages
}

/** Anular un consumo (RF-021): resumen, saldo resultante y motivo obligatorio. */
export function VoidConsumptionModal({
  consumption,
  onClose,
  onRegisterNew,
}: VoidConsumptionModalProps) {
  const { customer, code, totalPoints } = consumption
  const points = useCustomerPoints(customer.id)
  const voidMutation = useVoidConsumption(customer.id)
  const [voided, setVoided] = useState<VoidConsumptionResponse | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VoidConsumptionFormInput, unknown, VoidConsumptionFormOutput>({
    resolver: zodResolver(voidConsumptionSchema),
    defaultValues: { reason: '' },
  })

  // Los diálogos se cierran con Escape
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const onSubmit = ({ reason }: VoidConsumptionFormOutput) =>
    voidMutation.mutate(
      { code, body: { reason } },
      { onSuccess: setVoided },
    )

  if (voided) {
    return (
      <Modal title="Consumo anulado" onClose={onClose} className="max-w-lg">
        <Alert variant="success" className="mb-5">
          <p>
            Consumo {code} anulado. Se revirtieron{' '}
            {formatInteger(totalPoints)} pts.
          </p>
        </Alert>
        <p className="text-base text-text">
          ¿Registrar un nuevo consumo para este cliente?
        </p>
        <FormActions>
          <Button type="button" variant="secondary" size="lg" onClick={onClose}>
            No
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={() => {
              onRegisterNew?.()
              onClose()
            }}
          >
            Sí, registrar consumo
          </Button>
        </FormActions>
      </Modal>
    )
  }

  // Única cuenta que hace la pantalla (contrato §3.2.2): el saldo sale de /puntos
  const balance = points.data?.balance
  const resulting = balance === undefined ? undefined : balance - totalPoints
  const negative = resulting !== undefined && resulting < 0

  return (
    <Modal title={`Anular consumo ${code}`} onClose={onClose} className="max-w-lg">
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <p className="text-sm text-accent-800">
          Los consumos no se pueden editar. Si el monto es incorrecto, anulalo y
          registrá uno nuevo.
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-accent-200 bg-accent-50/60 p-4 text-sm">
          <div>
            <dt className="text-xs font-bold text-accent-800">Código</dt>
            <dd>{code}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-accent-800">Cliente</dt>
            <dd>
              {customer.firstName} {customer.lastName} ·{' '}
              {DOCUMENT_TYPES[customer.documentType].label}{' '}
              {customer.documentNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-accent-800">Monto</dt>
            <dd>{formatMoney(consumption.amount)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-accent-800">
              Puntos a revertir
            </dt>
            <dd>−{formatInteger(totalPoints)} pts</dd>
          </div>
          <div className="col-span-2 border-t border-accent-200 pt-2">
            {points.isPending && 'Cargando saldo…'}
            {points.isError && 'No se pudo obtener el saldo del cliente.'}
            {balance !== undefined && resulting !== undefined && (
              <>
                Saldo: {formatInteger(balance)} pts →{' '}
                <strong className={cn(negative && 'text-accent-700')}>
                  {formatInteger(resulting)} pts
                </strong>
              </>
            )}
          </div>
        </dl>

        {negative && (
          <Alert variant="error" className="mt-4">
            <p>
              El cliente ya utilizó parte de estos puntos. Su saldo quedará en{' '}
              {formatInteger(resulting)} pts y deberá regularizarse con un ajuste
              del Administrador.
            </p>
          </Alert>
        )}

        <div className="mt-4">
          <FormField
            id="void-reason"
            label="Motivo de anulación (obligatorio)"
            hideRequiredMark
            error={errors.reason?.message}
          >
            <textarea
              id="void-reason"
              rows={3}
              autoFocus
              maxLength={VOID_REASON_MAX_LENGTH}
              placeholder="Ej: monto cargado incorrectamente"
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={errors.reason ? 'void-reason-error' : undefined}
              className={cn(inputStyles, 'h-auto py-3')}
              {...register('reason')}
            />
          </FormField>
        </div>

        {voidMutation.isError && (
          <Alert variant="error" className="mt-4">
            <AlertMessages
              messages={errorMessages(voidMutation.error, code)}
            />
          </Alert>
        )}

        <FormActions>
          <Button type="button" variant="secondary" size="lg" onClick={onClose}>
            Volver
          </Button>
          <Button type="submit" size="lg" disabled={voidMutation.isPending}>
            Confirmar anulación
          </Button>
        </FormActions>
      </form>
    </Modal>
  )
}
