import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useForm, useWatch } from 'react-hook-form'
import { DOCUMENT_TYPES, type DocumentType } from '@/domain/documents'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { useToast } from '@/shared/components/feedback/useToast'
import { FormField } from '@/shared/components/forms/FormField'
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { formatInteger, formatSignedInteger } from '@/shared/lib/numbers'
import { cn } from '@/shared/lib/utils'
import { cardStyles, modalStyles, pointsToneStyles } from '@/styles/ui'
import { useAdjustPoints, useCustomerPoints } from '../api/cashier.queries'
import {
  adjustPointsSchema,
  type AdjustPointsFormInput,
  type AdjustPointsFormOutput,
} from '../schemas/adjust-points.schema'

/** Códigos de error de POST …/ajustes-de-puntos que tienen texto en el contrato (§3.5.1). */
const ADJUSTMENT_ERRORS: Record<string, string> = {
  CUSTOMER_INACTIVE: 'El cliente está dado de baja.',
  INSUFFICIENT_BALANCE: 'No se puede restar más que el saldo disponible.',
}

const INSUFFICIENT_BALANCE_MESSAGE = ADJUSTMENT_ERRORS.INSUFFICIENT_BALANCE

// Motivo que completa "Regularizar a 0" (contrato §3.5.1)
const REGULARIZE_REASON = 'Regularización por anulación de consumo'

const DIRECTION_OPTIONS = [
  { value: 'ADD', label: 'Sumar' },
  { value: 'SUBTRACT', label: 'Restar' },
]

type AdjustPointsModalProps = {
  customer: {
    id: number
    firstName: string
    lastName: string
    documentType: DocumentType
    documentNumber: string
  }
  onClose: () => void
}

/**
 * Modal "Ajustar puntos" (US-24, contrato §3.5.1, prototipo FichaCliente). Solo lo abre el
 * Administrador: lo usan la ficha del cliente y su alerta de saldo negativo. La vista previa del
 * saldo es la única cuenta que el contrato deja hacer en la pantalla.
 */
export function AdjustPointsModal({ customer, onClose }: AdjustPointsModalProps) {
  const showToast = useToast()
  const points = useCustomerPoints(customer.id)
  const adjust = useAdjustPoints(customer.id)
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<AdjustPointsFormInput, unknown, AdjustPointsFormOutput>({
    resolver: zodResolver(adjustPointsSchema),
    defaultValues: { direction: 'ADD', points: '', reason: '' },
  })

  // Escape cierra el modal
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const direction = useWatch({ control, name: 'direction' })
  const typedPoints = useWatch({ control, name: 'points' }).trim()
  const balance = points.data?.balance ?? 0
  // Vista previa: solo con una cantidad entera; si no, el saldo queda igual
  const amount = /^\d+$/.test(typedPoints) ? Number(typedPoints) : 0
  const result = direction === 'SUBTRACT' ? balance - amount : balance + amount
  // Restar nunca puede dejar el saldo negativo (decisión #1)
  const insufficient = direction === 'SUBTRACT' && result < 0

  const regularize = () => {
    setValue('direction', 'ADD')
    setValue('points', String(Math.abs(balance)))
    setValue('reason', REGULARIZE_REASON)
    clearErrors()
  }

  const onSubmit = (data: AdjustPointsFormOutput) => {
    if (insufficient) return
    adjust.mutate(data, {
      onSuccess: (response) => {
        showToast(
          `Ajuste aplicado: ${formatSignedInteger(response.movement.points)} pts. Nuevo saldo: ${formatInteger(response.balanceAfter)} pts.`,
        )
        onClose()
      },
    })
  }

  const error = adjust.error
  const errorMessage = error?.code ? ADJUSTMENT_ERRORS[error.code] : undefined
  const a11y = (field: 'points' | 'reason') => ({
    id: `adjust-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `adjust-${field}-error` : undefined,
  })

  return createPortal(
    <div
      className={modalStyles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-points-title"
    >
      <div className={cn(modalStyles.panel, 'relative max-w-120 overflow-y-auto p-6 sm:p-8')}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          title="Cerrar"
          className={modalStyles.closeIcon}
        >
          <Icon d={ICONS.close} className="size-5" />
        </button>
        <h3 id="adjust-points-title" className="pr-10 text-2xl leading-tight text-accent-800">
          Ajustar puntos
        </h3>

        {points.isPending ? (
          <StatusText className="mt-5">Cargando…</StatusText>
        ) : points.isError ? (
          <Alert variant="error" className="mt-5">
            No se pudo aplicar el ajuste.
            <AlertMessages messages={points.error.messages} />
          </Alert>
        ) : (
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-4">
            {/* Cabecera: cliente y saldo actual */}
            <div
              className={cn(
                cardStyles,
                'flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-4 sm:py-3.5',
              )}
            >
              <div>
                <p className="font-bold text-ink">
                  {customer.firstName} {customer.lastName}
                </p>
                <p className="text-sm text-neutral-700">
                  {DOCUMENT_TYPES[customer.documentType].label} {customer.documentNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-accent-800">Saldo actual</p>
                <p
                  className={cn(
                    'text-lg font-bold tabular-nums',
                    balance < 0 ? pointsToneStyles.negative : 'text-ink',
                  )}
                >
                  {formatInteger(balance)} pts
                </p>
              </div>
            </div>

            {balance < 0 && (
              <div>
                <Button type="button" variant="secondary" onClick={regularize}>
                  Regularizar a 0
                </Button>
              </div>
            )}

            <div className="max-w-70">
              <SegmentedRadio
                legend="Tipo de ajuste"
                options={DIRECTION_OPTIONS}
                field={register('direction')}
              />
            </div>

            <div className="max-w-55">
              <FormField
                id="adjust-points"
                label="Cantidad de puntos"
                hideRequiredMark
                error={errors.points?.message}
              >
                <Input inputMode="numeric" autoComplete="off" {...a11y('points')} {...register('points')} />
              </FormField>
            </div>

            <FormField
              id="adjust-reason"
              label="Motivo (obligatorio)"
              hideRequiredMark
              error={errors.reason?.message}
            >
              {/* El contrato limita el motivo a 500 caracteres: el campo no deja escribir más */}
              <Textarea rows={2} maxLength={500} {...a11y('reason')} {...register('reason')} />
            </FormField>

            <p className="border-t border-accent-200 pt-2.5 text-sm" aria-live="polite">
              Saldo: {formatInteger(balance)} pts →{' '}
              <strong className={cn('tabular-nums', result < 0 && pointsToneStyles.negative)}>
                {formatInteger(result)} pts
              </strong>
            </p>

            {insufficient && (
              <Alert variant="error">{INSUFFICIENT_BALANCE_MESSAGE}</Alert>
            )}

            {error && (
              <Alert variant="error">
                {errorMessage ?? (
                  <>
                    No se pudo aplicar el ajuste.
                    <AlertMessages messages={error.messages} />
                  </>
                )}
              </Alert>
            )}

            <div className="mt-2 flex flex-wrap justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={insufficient || adjust.isPending}>
                {adjust.isPending ? 'Aplicando…' : 'Confirmar ajuste'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
