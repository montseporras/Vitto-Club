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
  bonus: FirstPurchaseBonus;
}

const BONUS_TYPE_OPTIONS = Object.entries(BONUS_TYPES).map(
  ([value, label]) => ({ value, label }),
);

// Etiqueta y ayuda del campo "valor" según el tipo elegido.
const VALUE_FIELD: Record<BonusType, { label: string; hint: string }> = {
  PERCENTAGE: {
    label: 'Porcentaje adicional (%)',
    hint: `Entre 1 y ${MAX_PERCENTAGE}. Se calcula sobre los puntos de la primera compra.`,
  },
  FIXED: {
    label: 'Puntos adicionales',
    hint: `Entre 1 y ${MAX_FIXED_POINTS.toLocaleString('es-AR')}. Se suman a los puntos de la primera compra.`,
  },
};

// Mensaje según la respuesta del backend (PUT /settings/first-purchase-bonus).
function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.status) {
    case undefined:
      return apiError.message;
    case 400:
      return 'Hay datos inválidos. Revisá el formulario e intentá nuevamente.';
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
    defaultValues: { type: bonus.type, value: bonus.value },
  });

  const updateBonus = useUpdateFirstPurchaseBonus();

  const type = useWatch({ control, name: 'type' });
  const valueField = VALUE_FIELD[type];

  // Al guardar se recarga el formulario con lo guardado: deja de estar "modificado".
  const onSubmit = handleSubmit((form) => {
    updateBonus.mutate(form, {
      onSuccess: (saved) => reset(saved),
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
          Bonificación por primera compra guardada.
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* El tope del valor depende del tipo: al cambiarlo se revalida el valor. */}
        <SegmentedRadio
          legend="Tipo de bonificación"
          options={BONUS_TYPE_OPTIONS}
          field={register('type', { deps: ['value'] })}
        />

        <FormField
          id="value"
          label={valueField.label}
          error={errors.value?.message}
          hint={valueField.hint}
        >
          <Input
            id="value"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            autoComplete="off"
            aria-invalid={errors.value ? true : undefined}
            aria-describedby={errors.value ? 'value-error' : 'value-hint'}
            {...register('value', { valueAsNumber: true })}
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