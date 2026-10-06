// Usuario del sistema de un empleado, dentro del modal de edición: según el
// estado ofrece crearlo (SCRUM-21), cambiarle la contraseña (SCRUM-24), darlo
// de baja o reactivarlo (SCRUM-27). Cada acción abre su propia vista en el
// modal (onAction).
import { FormSection } from '@/shared/components/forms/FormSection';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import type { Employee, EmployeeAccount } from '../types/employee';

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

  return (
    <FormSection step={step} title="Usuario del sistema">
      <div className="flex flex-col items-start gap-3">
        <AccountBadge account={account} />
        <p className="text-sm text-neutral-600">{description(employee)}</p>

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
            {account?.active && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onAction('changePassword')}
                >
                  <Icon d={ICONS.pencil} className="size-4" />
                  Cambiar contraseña
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onAction('deactivateAccount')}
                >
                  Dar de baja usuario
                </Button>
              </>
            )}
            {account && !account.active && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onAction('reactivateAccount')}
              >
                <Icon d={ICONS.reload} className="size-4" />
                Reactivar usuario
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
