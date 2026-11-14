import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toApiError } from '@/shared/api/ApiError'
import { FormActions } from '@/shared/components/forms/FormActions'
import { FormField } from '@/shared/components/forms/FormField'
import { Alert } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Label } from '@/shared/components/ui/Label'
import { formFieldStyles, labelStyles } from '@/styles/ui'
import { useUpdateLoyaltyLevels } from '../api/points.queries'
import {
  MAX_BENEFIT_LENGTH,
  MAX_LEVEL_MIN_POINTS,
  loyaltyLevelsSchema,
  type LoyaltyLevelsFormValues,
} from '../schemas/loyalty-levels.schema'
import type { LoyaltyLevelsConfiguration } from '../types/loyalty-levels'

type LoyaltyLevelsFormProps = {
  configuration: LoyaltyLevelsConfiguration
}

// Ejemplos del prototipo para el campo "Beneficio" de cada nivel
const BENEFIT_PLACEHOLDERS = {
  bronzeBenefit: 'Ej: Acumulación estándar de puntos',
  silverBenefit: 'Ej: Postre gratis en tu cumpleaños',
  goldBenefit: 'Ej: Café gratis una vez por semana',
} as const

// Lo que muestra el formulario a partir de lo guardado: null pasa a texto vacío
function toFormValues(
  configuration: LoyaltyLevelsConfiguration,
): LoyaltyLevelsFormValues {
  return {
    silverMinPoints: configuration.levels[1].minPoints,
    goldMinPoints: configuration.levels[2].minPoints,
    bronzeBenefit: configuration.bronzeBenefit ?? '',
    silverBenefit: configuration.silverBenefit ?? '',
    goldBenefit: configuration.goldBenefit ?? '',
  }
}

function errorMessage(error: unknown): string {
  const apiError = toApiError(error)
  return apiError.messages[0] ?? apiError.message
}

export function LoyaltyLevelsForm({
  configuration,
}: LoyaltyLevelsFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<LoyaltyLevelsFormValues>({
    resolver: zodResolver(loyaltyLevelsSchema),
    defaultValues: toFormValues(configuration),
  })
  const updateLevels = useUpdateLoyaltyLevels()

  const onSubmit = handleSubmit((form) => {
    updateLevels.mutate(form, {
      onSuccess: (saved) => {
        reset(toFormValues(saved))
      },
    })
  })

  const showSuccess = updateLevels.isSuccess && !isDirty
  const hasErrors = Boolean(
    errors.silverMinPoints ||
      errors.goldMinPoints ||
      errors.bronzeBenefit ||
      errors.silverBenefit ||
      errors.goldBenefit,
  )

  // Campo "Beneficio (opcional)" de un nivel: hasta 255, con el error del contrato debajo
  const benefitField = (
    name: 'bronzeBenefit' | 'silverBenefit' | 'goldBenefit',
  ) => (
    <div className="mt-2 max-w-[560px]">
      <FormField
        id={name}
        label="Beneficio"
        optional
        error={errors[name]?.message}
      >
        <Input
          id={name}
          maxLength={MAX_BENEFIT_LENGTH}
          autoComplete="off"
          placeholder={BENEFIT_PLACEHOLDERS[name]}
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          {...register(name)}
        />
      </FormField>
    </div>
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      {updateLevels.isError && (
        <Alert variant="error" className="mb-6">
          {errorMessage(updateLevels.error)}
        </Alert>
      )}

      {showSuccess && (
        <Alert variant="success" className="mb-6">
          Niveles actualizados. Se recalculó el nivel de los clientes.
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="neutral" className="min-w-16 justify-center">
              Bronce
            </Badge>
            <span className={labelStyles}>Desde 0 puntos</span>
          </div>
          {benefitField('bronzeBenefit')}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Label htmlFor="silverMinPoints">
              <Badge variant="neutral" className="min-w-16 justify-center">
                Plata
              </Badge>
            </Label>
            <span className={labelStyles}>Desde</span>
            <Input
              id="silverMinPoints"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_LEVEL_MIN_POINTS}
              step={1}
              autoComplete="off"
              className="w-36"
              aria-invalid={errors.silverMinPoints ? true : undefined}
              aria-describedby={
                errors.silverMinPoints
                  ? 'silverMinPoints-error'
                  : 'loyalty-levels-hint'
              }
              {...register('silverMinPoints', { valueAsNumber: true })}
            />
            <span className={labelStyles}>puntos</span>
          </div>
          {errors.silverMinPoints && (
            <p id="silverMinPoints-error" className={formFieldStyles.error}>
              {errors.silverMinPoints.message}
            </p>
          )}
          {benefitField('silverBenefit')}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Label htmlFor="goldMinPoints">
              <Badge variant="neutral" className="min-w-16 justify-center">
                Oro
              </Badge>
            </Label>
            <span className={labelStyles}>Desde</span>
            <Input
              id="goldMinPoints"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_LEVEL_MIN_POINTS}
              step={1}
              autoComplete="off"
              className="w-36"
              aria-invalid={errors.goldMinPoints ? true : undefined}
              aria-describedby={
                errors.goldMinPoints
                  ? 'goldMinPoints-error'
                  : 'loyalty-levels-hint'
              }
              {...register('goldMinPoints', { valueAsNumber: true })}
            />
            <span className={labelStyles}>puntos</span>
          </div>
          {errors.goldMinPoints && (
            <p id="goldMinPoints-error" className={formFieldStyles.error}>
              {errors.goldMinPoints.message}
            </p>
          )}
          {benefitField('goldBenefit')}
        </div>
      </div>

      {!hasErrors && (
        <p id="loyalty-levels-hint" className={`${formFieldStyles.hint} mt-3`}>
          Los canjes y vencimientos no bajan el nivel. Los consumos anulados no
          suman. Los puntos de misiones y de cumpleaños no cuentan para el
          nivel. El beneficio es informativo: lo ven los clientes y no cambia
          los puntos.
        </p>
      )}

      <FormActions>
        <Button
          type="submit"
          size="lg"
          disabled={!isDirty || updateLevels.isPending}
        >
          {updateLevels.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </FormActions>
    </form>
  )
}
