// Confirmación de baja de empleado (RF-04), embebida en el modal de edición.
// Baja lógica: el empleado deja de estar activo pero el registro se conserva.
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { useDarDeBajaEmpleado } from '../api/empleados.queries';
import type { Empleado } from '../types/empleado';

interface ConfirmarBajaEmpleadoProps {
  empleado: Empleado;
  onSuccess: () => void;
  onCancel: () => void;
}

// Mensaje según la respuesta del backend (DELETE /empleados/:id).
function mensajeDeError(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.status) {
    case undefined:
      return apiError.message;
    case 409:
      return 'Este empleado ya estaba dado de baja.';
    case 404:
      return 'El empleado ya no existe.';
    default:
      return 'No se pudo dar de baja al empleado. Intentá nuevamente.';
  }
}

export function ConfirmarBajaEmpleado({
  empleado,
  onSuccess,
  onCancel,
}: ConfirmarBajaEmpleadoProps) {
  const darDeBaja = useDarDeBajaEmpleado();

  const confirmar = () => {
    darDeBaja.mutate(empleado.id, { onSuccess });
  };

  // 404 y 409 no se arreglan reintentando: sólo queda cerrar.
  const status = darDeBaja.error ? toApiError(darDeBaja.error).status : null;
  const sinReintento = status === 404 || status === 409;

  return (
    <div>
      {darDeBaja.isError && (
        <Alert variant="error" className="mb-6">
          {mensajeDeError(darDeBaja.error)}
        </Alert>
      )}

      <p className="text-base text-text">
        ¿Dar de baja a{' '}
        <strong>
          {empleado.firstName} {empleado.lastName}
        </strong>
        ? Va a dejar de poder ingresar al sistema.
      </p>

      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={confirmar}
          disabled={darDeBaja.isPending || sinReintento}
        >
          {darDeBaja.isPending ? 'Dando de baja…' : 'Dar de baja'}
        </Button>
      </FormActions>
    </div>
  );
}
