// Confirmación de baja o reactivación del usuario de un empleado (SCRUM-27),
// embebida en el modal de edición. Solo cambia el usuario: el empleado sigue
// activo. Al dar de baja se cierran sus sesiones; al reactivar vuelve a
// ingresar con la contraseña que tenía.
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import {
  useDeactivateAccount,
  useReactivateAccount,
} from '../api/employees.queries';
import type { Employee, EmployeeAccount } from '../types/employee';

type StatusChange = 'deactivate' | 'reactivate';

interface ConfirmAccountStatusChangeProps {
  change: StatusChange;
  employee: Employee;
  account: EmployeeAccount;
  onSuccess: () => void;
  onCancel: () => void;
}

const TEXTS = {
  deactivate: {
    question: 'Va a dejar de poder ingresar al sistema y se cierran sus sesiones abiertas.',
    confirm: 'Dar de baja usuario',
    pending: 'Dando de baja…',
    conflict: 'Este usuario ya estaba dado de baja.',
    failed: 'No se pudo dar de baja el usuario. Intentá nuevamente.',
  },
  reactivate: {
    question: 'Va a poder volver a ingresar al sistema con la contraseña que tenía.',
    confirm: 'Reactivar usuario',
    pending: 'Reactivando…',
    conflict:
      'No se pudo reactivar: el usuario ya está activo o el empleado está dado de baja.',
    failed: 'No se pudo reactivar el usuario. Intentá nuevamente.',
  },
} as const;

// Mensaje según la respuesta del backend
// (PATCH /usuarios/:id/deactivate o /usuarios/:id/reactivate).
function errorMessage(change: StatusChange, error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.code === 'LAST_ADMIN') {
    return 'No se puede dar de baja: es el único administrador que puede ingresar al sistema.';
  }
  switch (apiError.status) {
    case undefined:
      return apiError.message;
    case 409:
      return TEXTS[change].conflict;
    case 404:
      return 'El usuario ya no existe.';
    default:
      return TEXTS[change].failed;
  }
}

export function ConfirmAccountStatusChange({
  change,
  employee,
  account,
  onSuccess,
  onCancel,
}: ConfirmAccountStatusChangeProps) {
  const deactivate = useDeactivateAccount();
  const reactivate = useReactivateAccount();
  const mutation = change === 'deactivate' ? deactivate : reactivate;
  const texts = TEXTS[change];

  // 404 y 409 no se arreglan reintentando: sólo queda volver.
  const status = mutation.error ? toApiError(mutation.error).status : null;
  const noRetry = status === 404 || status === 409;

  return (
    <div>
      {mutation.isError && (
        <Alert variant="error" className="mb-6">
          {errorMessage(change, mutation.error)}
        </Alert>
      )}

      <p className="text-base text-text">
        ¿{change === 'deactivate' ? 'Dar de baja' : 'Reactivar'} el usuario de{' '}
        <strong>
          {employee.firstName} {employee.lastName}
        </strong>
        ? {texts.question}
      </p>

      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={() => mutation.mutate(account.id, { onSuccess })}
          disabled={mutation.isPending || noRetry}
        >
          {mutation.isPending ? texts.pending : texts.confirm}
        </Button>
      </FormActions>
    </div>
  );
}
