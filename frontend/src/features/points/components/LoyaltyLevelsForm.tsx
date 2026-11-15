import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toApiError } from '@/shared/api/ApiError'
import { Alert } from '@/shared/components/ui/Alert'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Label } from '@/shared/components/ui/Label'
import { InfoHint } from '@/shared/components/ui/InfoHint'
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

  // Campo "Beneficio (opcional)" de un nivel: hasta 255, con el error del contrato debajo
  const benefitField = (
    name: 'bronzeBenefit' | 'silverBenefit' | 'goldBenefit',
  ) => (
    <div className="flex min-w-60 flex-1 items-center gap-2">
      <Label htmlFor={name} className="shrink-0">
        Beneficio
        <span className={formFieldStyles.optional}>(opcional)</span>
      </Label>
      <Input
        id={name}
        maxLength={MAX_BENEFIT_LENGTH}
        autoComplete="off"
        placeholder={BENEFIT_PLACEHOLDERS[name]}
        className="h-10 text-sm"
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...register(name)}
      />
    </div>
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      {updateLevels.isError && (
        <Alert variant="error" className="mb-2.5">
          {errorMessage(updateLevels.error)}
        </Alert>
      )}

      {showSuccess && (
        <Alert variant="success" className="mb-2.5">
          Niveles actualizados. Se recalculó el nivel de los clientes.
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex shrink-0 items-center gap-2 sm:w-80">
              <Badge variant="neutral" className="min-w-16 justify-center">
                Bronce
              </Badge>
              <span className={labelStyles}>Desde 0 puntos</span>
            </div>
            {benefitField('bronzeBenefit')}
          </div>
          {errors.bronzeBenefit && (
            <p id="bronzeBenefit-error" className={formFieldStyles.error}>
              {errors.bronzeBenefit.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex shrink-0 items-center gap-2 sm:w-80">
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
                className="h-10 w-28"
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
            {benefitField('silverBenefit')}
          </div>
          {errors.silverMinPoints && (
            <p id="silverMinPoints-error" className={formFieldStyles.error}>
              {errors.silverMinPoints.message}
            </p>
          )}
          {errors.silverBenefit && (
            <p id="silverBenefit-error" className={formFieldStyles.error}>
              {errors.silverBenefit.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex shrink-0 items-center gap-2 sm:w-80">
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
                className="h-10 w-28"
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
            {benefitField('goldBenefit')}
          </div>
          {errors.goldMinPoints && (
            <p id="goldMinPoints-error" className={formFieldStyles.error}>
              {errors.goldMinPoints.message}
            </p>
          )}
          {errors.goldBenefit && (
            <p id="goldBenefit-error" className={formFieldStyles.error}>
              {errors.goldBenefit.message}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <InfoHint label="Ayuda sobre los niveles">
            Los canjes y vencimientos no bajan el nivel. Los consumos anulados no suman. Los puntos
            de misiones y de cumpleaños no cuentan para el nivel. El beneficio es informativo: lo
            ven los clientes y no cambia los puntos.
          </InfoHint>
          <span className="text-xs text-neutral-600">Cómo se calcula el nivel</span>
        </div>
        {/* La ayuda se ve con el "?"; acá queda solo para los lectores de pantalla */}
        <p id="loyalty-levels-hint" className="sr-only">
          Los canjes y vencimientos no bajan el nivel. Los consumos anulados no suman. Los puntos de
          misiones y de cumpleaños no cuentan para el nivel. El beneficio es informativo.
        </p>
        <Button
          type="submit"
          className="h-10 shrink-0"
          disabled={!isDirty || updateLevels.isPending}
        >
          {updateLevels.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
