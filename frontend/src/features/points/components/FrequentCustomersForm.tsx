// Este archivo es el formulario del mínimo de consumos de un cliente frecuente (US-51).
// Une las validaciones del schema con el hook que guarda, y muestra errores y aviso de éxito.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useUpdateFrequentCustomers } from '../api/points.queries';
import {
  frequentCustomersSchema,
  type FrequentCustomersFormValues,
} from '../schemas/frequent-customers.schema';
import type { FrequentCustomers } from '../types/frequent-customers';

interface FrequentCustomersFormProps {
  frequentCustomers: FrequentCustomers;
}

// Mensaje según la respuesta del backend (PUT /loyalty/configuration/frequent-customers).
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
      return 'No se pudo guardar el mínimo de consumos. Intentá nuevamente.';
  }
}

export function FrequentCustomersForm({ frequentCustomers }: FrequentCustomersFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FrequentCustomersFormValues>({
    resolver: zodResolver(frequentCustomersSchema),
    defaultValues: { minConsumptions: frequentCustomers.minConsumptions },
  });

  const update = useUpdateFrequentCustomers();

  // Al guardar se recarga el formulario con lo guardado: deja de estar "modificado".
  const onSubmit = handleSubmit((form) => {
    update.mutate(form, {
      onSuccess: (saved) => reset({ minConsumptions: saved.minConsumptions }),
    });
  });

  const showSuccess = update.isSuccess && !isDirty;

  return (
    <form onSubmit={onSubmit} noValidate>
      {update.isError && (
        <Alert variant="error" className="mb-6">
          {errorMessage(update.error)}
        </Alert>
      )}

      {showSuccess && (
        <Alert variant="success" className="mb-6">
          Mínimo de cliente frecuente guardado.
        </Alert>
      )}

      <FormField
        id="minConsumptions"
        label="Mínimo de consumos"
        error={errors.minConsumptions?.message}
      >
        <Input
          id="minConsumptions"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="w-40"
          aria-invalid={errors.minConsumptions ? true : undefined}
          aria-describedby={errors.minConsumptions ? 'minConsumptions-error' : undefined}
          {...register('minConsumptions', { valueAsNumber: true })}
        />
      </FormField>

      <FormActions>
        <Button type="submit" size="lg" disabled={!isDirty || update.isPending}>
          {update.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </FormActions>
    </form>
  );
}
