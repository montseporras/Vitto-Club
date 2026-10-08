// Este archivo es el formulario para configurar la vigencia de los puntos.
// Une las validaciones del schema con el hook que guarda, y muestra errores y aviso de éxito.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { DEFAULT_POINTS_EXPIRATION_MONTHS } from '@/domain/expiration';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useUpdatePointsExpiration } from '../api/points.queries';
import {
  MAX_EXPIRATION_MONTHS,
  pointsExpirationSchema,
  type PointsExpirationFormValues,
} from '../schemas/points-expiration.schema';
import type { PointsExpiration } from '../types/points-expiration';

interface PointsExpirationFormProps {
  expiration: PointsExpiration;
}

const HINT = `Entre 1 y ${MAX_EXPIRATION_MONTHS} meses, sin decimales. Por defecto, ${DEFAULT_POINTS_EXPIRATION_MONTHS} meses.`;

// Mensaje según la respuesta del backend (PUT /settings/points-expiration).
function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.status) {
    case undefined:
      return apiError.message;
    case 400:
      return 'Hay datos inválidos. Revisá el formulario e intentá nuevamente.';
    default:
      return 'No se pudo guardar la vigencia. Intentá nuevamente.';
  }
}

export function PointsExpirationForm({ expiration }: PointsExpirationFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PointsExpirationFormValues>({
    resolver: zodResolver(pointsExpirationSchema),
    defaultValues: { months: expiration.months },
  });

  const updateExpiration = useUpdatePointsExpiration();

  // Al guardar se recarga el formulario con lo guardado: deja de estar "modificado".
  const onSubmit = handleSubmit((form) => {
    updateExpiration.mutate(form, {
      onSuccess: (saved) => reset(saved),
    });
  });

  const showSuccess = updateExpiration.isSuccess && !isDirty;

  return (
    <form onSubmit={onSubmit} noValidate>
      {updateExpiration.isError && (
        <Alert variant="error" className="mb-6">
          {errorMessage(updateExpiration.error)}
        </Alert>
      )}

      {showSuccess && (
        <Alert variant="success" className="mb-6">
          Vigencia de los puntos guardada. Aplica a las operaciones futuras.
        </Alert>
      )}

      <FormField
        id="months"
        label="Meses"
        error={errors.months?.message}
        hint={HINT}
      >
        <Input
          id="months"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          autoComplete="off"
          className="w-40"
          aria-invalid={errors.months ? true : undefined}
          aria-describedby={errors.months ? 'months-error' : 'months-hint'}
          {...register('months', { valueAsNumber: true })}
        />
      </FormField>

      <FormActions>
        <Button
          type="submit"
          size="lg"
          disabled={!isDirty || updateExpiration.isPending}
        >
          {updateExpiration.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </FormActions>
    </form>
  );
}
