// Confirmación de baja o reactivación del usuario de un empleado (SCRUM-27),
// embebida en el modal de edición. Solo cambia el usuario: el empleado sigue
// activo. Al dar de baja se cierran sus sesiones; al reactivar vuelve a
// ingresar con la contraseña que tenía.
import { toApiError } from '@/shared/api/ApiError';
import { accountStatusErrorMessage, TEXTS, type StatusChange } from './account-status-messages';
import { FormActions } from '@/shared/components/forms/FormActions';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import {
  useDeactivateAccount,
  useReactivateAccount,
} from '../api/employees.queries';
import type { Employee, EmployeeAccount } from '../types/employee';

interface ConfirmAccountStatusChangeProps {
  change: StatusChange;
  employee: Employee;
  account: EmployeeAccount;
  onSuccess: () => void;
  onCancel: () => void;
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
          {accountStatusErrorMessage(change, mutation.error)}
        </Alert>
      )}

      <p className="text-base text-text">
        ¿
        {change === 'deactivate'
          ? 'Desactivar la cuenta de'
          : 'Reactivar el usuario de'}{' '}
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
          loading={mutation.isPending}
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
