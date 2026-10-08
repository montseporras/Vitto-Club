// Este archivo es el formulario para configurar la equivalencia de puntos.
// Une las validaciones del schema con el hook que guarda, y muestra errores y aviso de éxito.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { formFieldStyles, labelStyles } from '@/styles/ui';
import { useUpdatePointsEquivalence } from '../api/points.queries';
import {
  MAX_BASE_AMOUNT,
  MAX_POINTS,
  pointsEquivalenceSchema,
  type PointsEquivalenceFormValues,
} from '../schemas/points-equivalence.schema';
import type { PointsEquivalence } from '../types/points-equivalence';

interface PointsEquivalenceFormProps {
  equivalence: PointsEquivalence;
}

const HINT = `Monto de hasta $ ${MAX_BASE_AMOUNT.toLocaleString('es-AR')} (con centavos si hace falta) y entre 1 y ${MAX_POINTS.toLocaleString('es-AR')} puntos, sin decimales.`;

// Mensaje según la respuesta del backend (PUT /settings/points-equivalence).
function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.status) {
    case undefined:
      return apiError.message;
    case 400:
      return 'Hay datos inválidos. Revisá el formulario e intentá nuevamente.';
    default:
      return 'No se pudo guardar la equivalencia. Intentá nuevamente.';
  }
}

export function PointsEquivalenceForm({
  equivalence,
}: PointsEquivalenceFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PointsEquivalenceFormValues>({
    resolver: zodResolver(pointsEquivalenceSchema),
    defaultValues: {
      baseAmount: equivalence.baseAmount,
      points: equivalence.points,
    },
  });

  const updateEquivalence = useUpdatePointsEquivalence();

  // Al guardar se recarga el formulario con lo guardado: deja de estar "modificado".
  const onSubmit = handleSubmit((form) => {
    updateEquivalence.mutate(form, {
      onSuccess: (saved) => reset(saved),
    });
  });

  const showSuccess = updateEquivalence.isSuccess && !isDirty;
  const hasErrors = Boolean(errors.baseAmount || errors.points);

  return (
    <form onSubmit={onSubmit} noValidate>
      {updateEquivalence.isError && (
        <Alert variant="error" className="mb-6">
          {errorMessage(updateEquivalence.error)}
        </Alert>
      )}

      {showSuccess && (
        <Alert variant="success" className="mb-6">
          Equivalencia de puntos guardada. Aplica a las operaciones futuras.
        </Alert>
      )}

      {/* Los dos campos se leen como una frase: "Por cada $ X se otorgan Y puntos". */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Label htmlFor="baseAmount">Por cada $</Label>
        <Input
          id="baseAmount"
          type="number"
          inputMode="decimal"
          min={0.01}
          step={0.01}
          autoComplete="off"
          className="w-40"
          aria-invalid={errors.baseAmount ? true : undefined}
          aria-describedby={
            errors.baseAmount ? 'baseAmount-error' : 'points-equivalence-hint'
          }
          {...register('baseAmount', { valueAsNumber: true })}
        />

        <Label htmlFor="points">se otorgan</Label>
        <Input
          id="points"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          autoComplete="off"
          className="w-28"
          aria-invalid={errors.points ? true : undefined}
          aria-describedby={
            errors.points ? 'points-error' : 'points-equivalence-hint'
          }
          {...register('points', { valueAsNumber: true })}
        />
        <span className={labelStyles}>puntos</span>
      </div>

      {/* Un mensaje por campo con error; si no hay errores, la ayuda. */}
      <div className="mt-2 space-y-1">
        {errors.baseAmount && (
          <p id="baseAmount-error" className={formFieldStyles.error}>
            {errors.baseAmount.message}
          </p>
        )}
        {errors.points && (
          <p id="points-error" className={formFieldStyles.error}>
            {errors.points.message}
          </p>
        )}
        {!hasErrors && (
          <p id="points-equivalence-hint" className={formFieldStyles.hint}>
            {HINT}
          </p>
        )}
      </div>

      <FormActions>
        <Button
          type="submit"
          size="lg"
          disabled={!isDirty || updateEquivalence.isPending}
        >
          {updateEquivalence.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </FormActions>
    </form>
  );
}
