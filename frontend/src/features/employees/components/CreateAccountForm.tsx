// Alta del usuario de un empleado (SCRUM-21), embebida en el modal de edición.
// El usuario es el mail que el empleado ya tiene cargado y la contraseña se
// genera sola; se puede generar otra o escribirla a mano. Al terminar se
// muestran las credenciales una única vez para pasárselas al empleado.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { FormSection } from '@/shared/components/forms/FormSection';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { generatePassword } from '@/shared/lib/password';
import { useCreateEmployeeAccount } from '../api/employees.queries';
import {
  accountPasswordSchema,
  type AccountPasswordFormValues,
} from '../schemas/employee.schema';
import type { Employee } from '../types/employee';
import { IssuedCredentials, PasswordField } from './AccountPassword';

interface CreateAccountFormProps {
  employee: Employee;
  onDone: () => void;
  onCancel: () => void;
}

// Mensaje según la respuesta del backend (POST /usuarios).
function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.status) {
    case undefined:
      return apiError.message;
    case 409:
      return 'No se pudo crear el usuario: el empleado ya tiene uno, está dado de baja o su mail ya lo usa un cliente.';
    case 404:
      return 'El empleado ya no existe.';
    default:
      return 'No se pudo crear el usuario. Intentá nuevamente.';
  }
}

export function CreateAccountForm({
  employee,
  onDone,
  onCancel,
}: CreateAccountFormProps) {
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const createAccount = useCreateEmployeeAccount();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AccountPasswordFormValues>({
    resolver: zodResolver(accountPasswordSchema(employee.email)),
    defaultValues: { password: generatePassword() },
  });

  const onSubmit = handleSubmit(({ password }) => {
    createAccount.mutate(
      { employeeId: employee.id, email: employee.email, password },
      { onSuccess: () => setCreatedPassword(password) },
    );
  });

  if (createdPassword) {
    return (
      <IssuedCredentials
        email={employee.email}
        password={createdPassword}
        onDone={onDone}
      >
        Se creó el usuario de{' '}
        <strong>
          {employee.firstName} {employee.lastName}
        </strong>
        . Ya puede ingresar al sistema.
      </IssuedCredentials>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {createAccount.isError && (
        <Alert variant="error" className="mb-6">
          {errorMessage(createAccount.error)}
        </Alert>
      )}

      <p className="mb-6 text-base text-text">
        Vas a crear el usuario de{' '}
        <strong>
          {employee.firstName} {employee.lastName}
        </strong>{' '}
        para que pueda ingresar al sistema.
      </p>

      <FormSection step={1} title="Datos de acceso">
        <FormField id="usuario" label="Usuario" hint="Es el mail del empleado.">
          <Input
            id="usuario"
            value={employee.email}
            readOnly
            disabled
            aria-describedby="usuario-hint"
          />
        </FormField>

        <PasswordField
          label="Contraseña"
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
        <Button type="submit" size="lg" disabled={createAccount.isPending}>
          {createAccount.isPending ? 'Creando…' : 'Crear usuario'}
        </Button>
      </FormActions>
    </form>
  );
}
