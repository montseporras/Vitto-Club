// Este archivo es el formulario del mínimo de consumos de un cliente frecuente (US-51).
// Une las validaciones del schema con el hook que guarda, y muestra errores y aviso de éxito.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toApiError } from '@/shared/api/ApiError';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { formFieldStyles } from '@/styles/ui';
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
    // Valida mientras se escribe: el error aparece en el campo, no todos al final
    mode: 'onChange',
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
        <Alert variant="error" className="mb-2.5">
          {errorMessage(update.error)}
        </Alert>
      )}

      {showSuccess && (
        <Alert variant="success" className="mb-2.5">
          Mínimo de cliente frecuente guardado.
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Label htmlFor="minConsumptions">Mínimo de consumos</Label>
        <Input
          id="minConsumptions"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="h-10 w-24"
          aria-invalid={errors.minConsumptions ? true : undefined}
          aria-describedby={errors.minConsumptions ? 'minConsumptions-error' : undefined}
          {...register('minConsumptions', { valueAsNumber: true })}
        />
        <Button
          loading={update.isPending}
          type="submit"
          className="ml-auto h-10"
          disabled={!isDirty || update.isPending}
        >
          {update.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
      {errors.minConsumptions && (
        <p id="minConsumptions-error" className={formFieldStyles.error}>
          {errors.minConsumptions.message}
        </p>
      )}
    </form>
  );
}
