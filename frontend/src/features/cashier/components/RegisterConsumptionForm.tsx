import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatInteger, formatMoney } from '@/shared/lib/numbers'
import { consumptionError } from '../api/consumption-errors'
import { useConsumptionPreview } from '../api/cashier.queries'
import {
  consumptionSchema,
  parseAmount,
  type ConsumptionFormInput,
  type ConsumptionFormOutput,
} from '../schemas/consumption.schema'

type RegisterConsumptionFormProps = {
  customerId: number
  /** Monto válido: abre la advertencia donde se confirma y se completan las observaciones */
  onSubmitAmount: (amount: number) => void
  onCancel: () => void
}

/**
 * Monto y vista previa del consumo (US-21). Los puntos, la bonificación y el saldo
 * resultante los calcula el backend con GET /consumos/preview: acá no se calcula nada.
 */
export function RegisterConsumptionForm({
  customerId,
  onSubmitAmount,
  onCancel,
}: RegisterConsumptionFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ConsumptionFormInput, unknown, ConsumptionFormOutput>({
    resolver: zodResolver(consumptionSchema),
    defaultValues: { amount: '' },
  })

  const rawAmount = useWatch({ control, name: 'amount' })

  // La vista previa se pide 300 ms después de dejar de escribir, y solo con un monto válido
  const parsed = parseAmount(rawAmount)
  const validAmount = 'amount' in parsed ? parsed.amount : null
  const debouncedAmount = useDebounce(validAmount, 300)
  const preview = useConsumptionPreview(customerId, debouncedAmount)
  const previewData =
    preview.data && validAmount !== null && preview.data.amount === validAmount
      ? preview.data
      : null
  const previewError = validAmount !== null && preview.isError ? preview.error : null
  const error = previewError ? consumptionError(previewError) : null

  const cancel = () => {
    reset()
    onCancel()
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit((data) => onSubmitAmount(data.amount))}
      className="mt-2"
    >
      <div className="mb-4 border-b border-accent-100 pb-1">
        <h3 className="font-heading text-base font-bold text-accent-800">Consumo</h3>
      </div>

      {/* El monto y los botones van en la misma fila */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-full max-w-xs flex-1">
          <FormField
            id="consumption-amount"
            label="Monto del consumo ($)"
            hideRequiredMark
            error={errors.amount?.message}
          >
            <Input
              id="consumption-amount"
              inputMode="decimal"
              placeholder="50.000"
              autoComplete="off"
              className="h-11 text-sm"
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? 'consumption-amount-error' : undefined}
              {...register('amount')}
            />
          </FormField>
        </div>
        {/* 26 px = la etiqueta del campo (20 px) y su espacio (6 px) */}
        <div className="ml-auto flex gap-3 sm:mt-[26px]">
          <Button type="button" variant="secondary" onClick={cancel}>
            Cancelar
          </Button>
          <Button type="submit">Registrar consumo</Button>
        </div>
      </div>

      {previewData && (
        <div
          className="mt-5 rounded-2xl border border-accent-200 bg-accent-50/60 px-5 py-3.5"
          aria-live="polite"
        >
          <p className="text-sm font-bold text-accent-800">
            Se acreditarán {formatInteger(previewData.totalPoints)} puntos
            {previewData.bonusPoints > 0 &&
              ` (${formatInteger(previewData.points)} + ${formatInteger(previewData.bonusPoints)} de bonificación por primer consumo)`}
          </p>
          <p className="text-[13px] text-ink">
            Saldo resultante: <strong>{formatInteger(previewData.balanceAfter)} pts</strong>
          </p>
        </div>
      )}
      {previewData && (
        <p className="mt-3 text-xs text-neutral-600">
          Equivalencia vigente: {formatMoney(previewData.equivalence.baseAmount)} ={' '}
          {formatInteger(previewData.equivalence.pointsAwarded)} pts
        </p>
      )}

      {error && (
        <Alert variant="error" className="mt-3">
          {error.text}
          <AlertMessages messages={error.details} />
        </Alert>
      )}
    </form>
  )
}
