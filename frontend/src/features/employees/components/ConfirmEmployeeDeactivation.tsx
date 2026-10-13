// Confirmación de baja de empleado (RF-04), embebida en el modal de edición.
// Baja lógica: el empleado deja de estar activo pero el registro se conserva.
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { useDeactivateEmployee } from '../api/employees.queries';
import type { Employee } from '../types/employee';

interface ConfirmEmployeeDeactivationProps {
  employee: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

// Mensaje según la respuesta del backend (DELETE /empleados/:id).
function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.code === 'LAST_ADMIN') {
    return 'No se puede dar de baja: es el único administrador que puede ingresar al sistema.';
  }
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

export function ConfirmEmployeeDeactivation({
  employee,
  onSuccess,
  onCancel,
}: ConfirmEmployeeDeactivationProps) {
  const deactivateEmployee = useDeactivateEmployee();

  const handleConfirm = () => {
    deactivateEmployee.mutate(employee.id, { onSuccess });
  };

  // 404 y 409 no se arreglan reintentando: sólo queda cerrar.
  const status = deactivateEmployee.error ? toApiError(deactivateEmployee.error).status : null;
  const noRetry = status === 404 || status === 409;

  return (
    <div>
      {deactivateEmployee.isError && (
        <Alert variant="error" className="mb-6">
          {errorMessage(deactivateEmployee.error)}
        </Alert>
      )}

      <p className="text-base text-text">
        ¿Dar de baja a{' '}
        <strong>
          {employee.firstName} {employee.lastName}
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
          onClick={handleConfirm}
          disabled={deactivateEmployee.isPending || noRetry}
        >
          {deactivateEmployee.isPending ? 'Dando de baja…' : 'Dar de baja'}
        </Button>
      </FormActions>
    </div>
  );
}
