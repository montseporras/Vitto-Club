import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useToast } from '@/shared/components/feedback/useToast'
import { FormActions } from '@/shared/components/forms/FormActions'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatInteger, formatMoney } from '@/shared/lib/numbers'
import { formSectionTitleStyles } from '@/styles/ui'
import { consumptionError } from '../api/consumption-errors'
import { useConsumptionPreview, useCreateConsumption } from '../api/cashier.queries'
import {
  NOTES_MAX_LENGTH,
  consumptionSchema,
  parseAmount,
  type ConsumptionFormInput,
  type ConsumptionFormOutput,
} from '../schemas/consumption.schema'
import type { CreateConsumptionResult } from '../types/consumption'

type RegisterConsumptionFormProps = {
  customerId: number
  onRegistered: (result: CreateConsumptionResult) => void
  onCancel: () => void
}

/**
 * Monto, observaciones y vista previa del consumo (US-21). Los puntos, la bonificación y el
 * saldo resultante los calcula el backend con GET /consumos/preview: acá no se calcula nada.
 */
export function RegisterConsumptionForm({
  customerId,
  onRegistered,
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
    defaultValues: { amount: '', notes: '' },
  })
  const showToast = useToast()
  const create = useCreateConsumption()

  const rawAmount = useWatch({ control, name: 'amount' })
  const notes = useWatch({ control, name: 'notes' })

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

  const onSubmit = (data: ConsumptionFormOutput) => {
    create.mutate(
      { customerId, amount: data.amount, notes: data.notes },
      {
        onSuccess: (result) => {
          showToast(
            `Consumo ${result.consumption.code} registrado: +${formatInteger(result.consumption.totalPoints)} pts.`,
          )
          onRegistered(result)
        },
      },
    )
  }

  const cancel = () => {
    reset()
    create.reset()
    onCancel()
  }

  // El error del registro vale solo para el monto que se intentó: si se cambia, ya no se muestra
  const createError =
    create.error && create.variables?.amount === validAmount ? create.error : null
  const shownError = createError ?? previewError
  const error = shownError ? consumptionError(shownError) : null

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-7">
      <div className={formSectionTitleStyles.root}>
        <h3 className={formSectionTitleStyles.title}>Consumo</h3>
      </div>

      <div className="grid gap-5">
        <div className="max-w-xs">
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
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? 'consumption-amount-error' : undefined}
              {...register('amount')}
            />
          </FormField>
        </div>

        <div className="max-w-lg">
          <FormField
            id="consumption-notes"
            label="Observaciones"
            optional
            error={errors.notes?.message}
            hint={`${notes.length}/${NOTES_MAX_LENGTH}`}
          >
            <Input
              id="consumption-notes"
              maxLength={NOTES_MAX_LENGTH}
              autoComplete="off"
              aria-invalid={errors.notes ? true : undefined}
              aria-describedby={
                errors.notes ? 'consumption-notes-error' : 'consumption-notes-hint'
              }
              {...register('notes')}
            />
          </FormField>
        </div>
      </div>

      {previewData && (
        <div className="mt-4 rounded-2xl border border-accent-200 bg-accent-50/60 px-5 py-3.5" aria-live="polite">
          <p className="text-base font-bold text-accent-800">
            Se acreditarán {formatInteger(previewData.totalPoints)} puntos
            {previewData.bonusPoints > 0 &&
              ` (${formatInteger(previewData.points)} + ${formatInteger(previewData.bonusPoints)} de bonificación por primer consumo)`}
          </p>
          <p className="mt-0.5 text-sm text-ink">
            Saldo resultante: <strong>{formatInteger(previewData.balanceAfter)} pts</strong>
          </p>
        </div>
      )}
      {previewData && (
        <p className="mt-2.5 text-xs text-neutral-600">
          Equivalencia vigente: {formatMoney(previewData.equivalence.baseAmount)} ={' '}
          {formatInteger(previewData.equivalence.pointsAwarded)} pts
        </p>
      )}

      {error && (
        <Alert variant="error" className="mt-4">
          {error.text}
          <AlertMessages messages={error.details} />
        </Alert>
      )}

      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={cancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={create.isPending}>
          Registrar consumo
        </Button>
      </FormActions>
    </form>
  )
}
