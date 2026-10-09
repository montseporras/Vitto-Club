// Este archivo es el formulario para configurar la bonificación por primera compra.
// Une las validaciones del schema con el hook que guarda, y muestra errores y aviso de éxito.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { SegmentedRadio } from '@/shared/components/forms/SegmentedRadio';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useUpdateFirstPurchaseBonus } from '../api/points.queries';
import {
  firstPurchaseBonusSchema,
  MAX_FIXED_POINTS,
  MAX_PERCENTAGE,
  type FirstPurchaseBonusFormValues,
} from '../schemas/first-purchase-bonus.schema';
import {
  BONUS_TYPES,
  type BonusType,
  type FirstPurchaseBonus,
} from '../types/first-purchase-bonus';

interface FirstPurchaseBonusFormProps {
  // null: todavía no hay una bonificación guardada y el formulario arranca sin valor.
  bonus: FirstPurchaseBonus | null;
}

const BONUS_TYPE_OPTIONS = Object.entries(BONUS_TYPES).map(
  ([value, label]) => ({ value, label }),
);

// Etiqueta, ayuda y paso del campo "valor" según el tipo elegido. El porcentaje
// admite hasta 2 decimales; los puntos fijos son enteros.
const VALUE_FIELD: Record<
  BonusType,
  { label: string; hint: string; step: number }
> = {
  PERCENTAGE: {
    label: 'Porcentaje adicional (%)',
    hint: `Entre 1 y ${MAX_PERCENTAGE}, con hasta 2 decimales. Se calcula sobre los puntos de la primera compra.`,
    step: 0.01,
  },
  FIXED_AMOUNT: {
    label: 'Puntos adicionales',
    hint: `Entre 1 y ${MAX_FIXED_POINTS.toLocaleString('es-AR')}, sin decimales. Se suman a los puntos de la primera compra.`,
    step: 1,
  },
};

// Mensaje según la respuesta del backend (PUT /loyalty/configuration/first-purchase-bonus).
function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.status) {
    case undefined:
      return apiError.message;
    case 400:
      return 'Hay datos inválidos. Revisá el formulario e intentá nuevamente.';
    case 401:
      return 'Tu sesión no está activa. Iniciá sesión e intentá nuevamente.';
    case 403:
      return 'Solo un Administrador puede cambiar esta configuración.';
    default:
      return 'No se pudo guardar la bonificación. Intentá nuevamente.';
  }
}

export function FirstPurchaseBonusForm({ bonus }: FirstPurchaseBonusFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<FirstPurchaseBonusFormValues>({
    resolver: zodResolver(firstPurchaseBonusSchema),
    defaultValues: {
      bonusType: bonus?.bonusType ?? 'PERCENTAGE',
      bonusValue: bonus?.bonusValue,
    },
  });

  const updateBonus = useUpdateFirstPurchaseBonus();

  const bonusType = useWatch({ control, name: 'bonusType' });
  const valueField = VALUE_FIELD[bonusType];

  // Al guardar se recarga el formulario con lo guardado: deja de estar "modificado".
  // Se copian solo los campos del formulario: la respuesta trae además updatedAt.
  const onSubmit = handleSubmit((form) => {
    updateBonus.mutate(form, {
      onSuccess: (saved) =>
        reset({ bonusType: saved.bonusType, bonusValue: saved.bonusValue }),
    });
  });

  const showSuccess = updateBonus.isSuccess && !isDirty;

  return (
    <form onSubmit={onSubmit} noValidate>
      {updateBonus.isError && (
        <Alert variant="error" className="mb-6">
          {errorMessage(updateBonus.error)}
        </Alert>
      )}

      {showSuccess && (
        <Alert variant="success" className="mb-6">
          Bonificación por primera compra guardada. Aplica a las operaciones
          futuras.
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* El tope del valor depende del tipo: al cambiarlo se revalida el valor. */}
        <SegmentedRadio
          legend="Tipo de bonificación"
          options={BONUS_TYPE_OPTIONS}
          field={register('bonusType', { deps: ['bonusValue'] })}
        />

        <FormField
          id="bonusValue"
          label={valueField.label}
          error={errors.bonusValue?.message}
          hint={valueField.hint}
        >
          <Input
            id="bonusValue"
            type="number"
            inputMode="decimal"
            min={1}
            step={valueField.step}
            autoComplete="off"
            aria-invalid={errors.bonusValue ? true : undefined}
            aria-describedby={
              errors.bonusValue ? 'bonusValue-error' : 'bonusValue-hint'
            }
            {...register('bonusValue', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <FormActions>
        <Button
          type="submit"
          size="lg"
          disabled={!isDirty || updateBonus.isPending}
        >
          {updateBonus.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </FormActions>
    </form>
  );
}
