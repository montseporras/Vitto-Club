// Usuario del sistema de un empleado, dentro del modal de edición: según el
// estado ofrece crearlo (SCRUM-21), cambiarle la contraseña (SCRUM-24), darlo
// de baja o reactivarlo (SCRUM-27). Cada acción abre su propia vista en el
// modal (onAction).
import { useState } from 'react';
import { useToast } from '@/shared/components/feedback/useToast';
import { FormSection } from '@/shared/components/forms/FormSection';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Switch } from '@/shared/components/ui/Switch';
import { useUndoableAction } from '@/shared/hooks/useUndoableAction';
import { useDeactivateAccount, useReactivateAccount } from '../api/employees.queries';
import type { Employee, EmployeeAccount } from '../types/employee';
import { accountStatusErrorMessage } from './account-status-messages';

export type AccountAction =
  | 'createAccount'
  | 'changePassword'
  | 'deactivateAccount'
  | 'reactivateAccount';

// Estado del usuario en la tabla y en el modal.
export function AccountBadge({ account }: { account: EmployeeAccount | null }) {
  if (!account) return <Badge variant="neutral">Sin usuario</Badge>;
  return account.active ? (
    <Badge variant="success">Con usuario</Badge>
  ) : (
    <Badge variant="danger">Usuario dado de baja</Badge>
  );
}

interface EmployeeAccountSectionProps {
  step: number;
  employee: Employee;
  onAction: (action: AccountAction) => void;
}

export function EmployeeAccountSection({
  step,
  employee,
  onAction,
}: EmployeeAccountSectionProps) {
  const { account, isActive } = employee;
  const deactivate = useDeactivateAccount();
  const reactivate = useReactivateAccount();
  const runUndoable = useUndoableAction();
  const showToast = useToast();
  // El interruptor se aplica al instante: este valor manda hasta que el listado se actualiza
  const [activeOverride, setActiveOverride] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shownAccount = account && { ...account, active: activeOverride ?? account.active };

  const toggleAccount = (next: boolean) => {
    if (!account) return;
    setError(null);
    if (next) {
      setActiveOverride(true);
      reactivate.mutate(account.id, {
        onSuccess: () => showToast('Usuario reactivado'),
        onError: (mutationError) => {
          setActiveOverride(null);
          setError(accountStatusErrorMessage('reactivate', mutationError));
        },
      });
      return;
    }
    // Desactivar cierra sus sesiones: hay unos segundos para deshacer antes de mandarlo
    setActiveOverride(false);
    runUndoable({
      message: 'Usuario desactivado',
      undoneMessage: 'El usuario sigue activo',
      commit: () => deactivate.mutateAsync(account.id),
      onUndo: () => setActiveOverride(null),
      onError: (mutationError) => {
        setActiveOverride(null);
        setError(accountStatusErrorMessage('deactivate', mutationError));
      },
    });
  };

  return (
    <FormSection step={step} title="Usuario del sistema">
      <div className="flex flex-col items-start gap-3">
        <AccountBadge account={shownAccount} />
        <p className="text-sm text-neutral-600">
          {description({ ...employee, account: shownAccount })}
        </p>
        {error && (
          <Alert variant="error" className="w-full">
            {error}
          </Alert>
        )}

        {/* Activar o desactivar el usuario se aplica al instante, sin "Guardar" */}
        {isActive && account && (
          <Switch
            checked={shownAccount?.active ?? false}
            onChange={toggleAccount}
            label={`Usuario de ${employee.firstName} ${employee.lastName} activo`}
            onText="Usuario activo"
            offText="Usuario desactivado"
            pending={reactivate.isPending}
          />
        )}

        {isActive && (
          <div className="flex flex-wrap gap-3">
            {!account && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onAction('createAccount')}
              >
                <Icon d={ICONS.userPlus} className="size-4" />
                Crear usuario
              </Button>
            )}
            {shownAccount?.active && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onAction('changePassword')}
              >
                <Icon d={ICONS.pencil} className="size-4" />
                Cambiar contraseña
              </Button>
            )}
          </div>
        )}
      </div>
    </FormSection>
  );
}

function description({ account, isActive, email }: Employee) {
  if (!account) {
    return isActive
      ? 'Todavía no tiene usuario, así que no puede ingresar al sistema.'
      : 'No tiene usuario. Para crearlo, el empleado tiene que estar activo.';
  }
  if (account.active) return `Ingresa al sistema con el mail ${email}.`;
  return isActive
    ? 'Su usuario está dado de baja: no puede ingresar al sistema.'
    : 'Su usuario está dado de baja. Para reactivarlo, el empleado tiene que estar activo.';
}
