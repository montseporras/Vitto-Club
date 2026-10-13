// Cambio de contraseña del usuario de un empleado (SCRUM-24), embebido en el
// modal de edición. Solo cambia la contraseña: el rol se edita desde el
// empleado. Igual que en el alta, la nueva se genera sola y al terminar se
// muestra una única vez para pasársela al empleado.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toApiError } from '@/shared/api/ApiError';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { FormSection } from '@/shared/components/forms/FormSection';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { generatePassword } from '@/shared/lib/password';
import {
  useEmployeeAccount,
  useUpdateAccountPassword,
} from '../api/employees.queries';
import {
  accountPasswordSchema,
  type AccountPasswordFormValues,
} from '../schemas/employee.schema';
import type { Account, Employee } from '../types/employee';
import { IssuedCredentials, PasswordField } from './AccountPassword';

interface ChangePasswordFormProps {
  employee: Employee;
  onDone: () => void;
  onCancel: () => void;
}

// Mensaje según la respuesta del backend (PATCH /usuarios/:id).
function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.status) {
    case undefined:
      return apiError.message;
    case 409:
      return 'El usuario está dado de baja: no se puede cambiar la contraseña.';
    case 404:
      return 'El usuario ya no existe.';
    default:
      return 'No se pudo cambiar la contraseña. Intentá nuevamente.';
  }
}

// Primero se busca el usuario del empleado: hace falta su id y saber si sigue
// activo.
export function ChangePasswordForm({
  employee,
  onDone,
  onCancel,
}: ChangePasswordFormProps) {
  const { data: account, isLoading, error, refetch } = useEmployeeAccount(
    employee.id,
  );

  if (isLoading) return <StatusText>Cargando usuario…</StatusText>;

  if (error || !account || !account.active) {
    const notFound = toApiError(error).status === 404;
    return (
      <div>
        <Alert variant="error" className="mb-6">
          {account && !account.active ? (
            'El usuario está dado de baja: no se puede cambiar la contraseña.'
          ) : notFound ? (
            'Este empleado ya no tiene usuario.'
          ) : (
            <p>
              No se pudo cargar el usuario.{' '}
              <button
                type="button"
                onClick={() => void refetch()}
                className="cursor-pointer font-semibold underline underline-offset-2"
              >
                Reintentar
              </button>
            </p>
          )}
        </Alert>
        <FormActions>
          <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
            Volver
          </Button>
        </FormActions>
      </div>
    );
  }

  return (
    <NewPasswordForm
      employee={employee}
      account={account}
      onDone={onDone}
      onCancel={onCancel}
    />
  );
}

interface NewPasswordFormProps extends ChangePasswordFormProps {
  account: Account;
}

function NewPasswordForm({
  employee,
  account,
  onDone,
  onCancel,
}: NewPasswordFormProps) {
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const updatePassword = useUpdateAccountPassword(account.accountId);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AccountPasswordFormValues>({
    resolver: zodResolver(accountPasswordSchema(account.email)),
    defaultValues: { password: generatePassword() },
  });

  const onSubmit = handleSubmit(({ password }) => {
    updatePassword.mutate(
      { password },
      { onSuccess: () => setNewPassword(password) },
    );
  });

  if (newPassword) {
    return (
      <IssuedCredentials
        email={account.email}
        password={newPassword}
        onDone={onDone}
      >
        Se cambió la contraseña de{' '}
        <strong>
          {employee.firstName} {employee.lastName}
        </strong>
        . La anterior ya no sirve para ingresar.
      </IssuedCredentials>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {updatePassword.isError && (
        <Alert variant="error" className="mb-6">
          {errorMessage(updatePassword.error)}
        </Alert>
      )}

      <p className="mb-6 text-base text-text">
        Vas a cambiar la contraseña de{' '}
        <strong>
          {employee.firstName} {employee.lastName}
        </strong>
        . La anterior deja de funcionar en cuanto guardes.
      </p>

      <FormSection step={1} title="Datos de acceso">
        <FormField id="usuario" label="Usuario">
          <Input id="usuario" value={account.email} readOnly disabled />
        </FormField>

        <PasswordField
          label="Nueva contraseña"
          error={errors.password?.message}
          registration={register('password')}
          onRegenerate={() =>
            setValue('password', generatePassword(), { shouldValidate: true })
          }
          getPassword={() => getValues('password')}
        />
      </FormSection>

      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={updatePassword.isPending}>
          {updatePassword.isPending ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </FormActions>
    </form>
  );
}
