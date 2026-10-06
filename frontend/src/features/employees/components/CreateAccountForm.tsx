// Alta del usuario de un empleado (SCRUM-21), embebida en el modal de edición.
// El usuario es el mail que el empleado ya tiene cargado y la contraseña se
// genera sola; se puede generar otra o escribirla a mano. Al terminar se
// muestran las credenciales una única vez para pasárselas al employee.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { FormSection } from '@/shared/components/forms/FormSection';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
import { Input } from '@/shared/components/ui/Input';
import { generatePassword } from '@/shared/lib/password';
import { useCreateEmployeeAccount } from '../api/employees.queries';
import {
  createAccountSchema,
  type CreateAccountFormValues,
} from '../schemas/employee.schema';
import type { Employee } from '../types/employee';

interface CreateAccountFormProps {
  employee: Employee;
  onDone: () => void;
  onCancel: () => void;
}

interface Credentials {
  email: string;
  password: string;
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
  const [created, setCreated] = useState<Credentials | null>(null);
  const createAccount = useCreateEmployeeAccount();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateAccountFormValues>({
    resolver: zodResolver(createAccountSchema(employee.email)),
    defaultValues: { password: generatePassword() },
  });

  const onSubmit = handleSubmit(({ password }) => {
    const credentials = { email: employee.email, password };
    createAccount.mutate(
      { employeeId: employee.id, ...credentials },
      { onSuccess: () => setCreated(credentials) },
    );
  });

  const regenerate = () =>
    setValue('password', generatePassword(), { shouldValidate: true });

  if (created) {
    return (
      <div>
        <Alert variant="success" className="mb-6">
          Se creó el usuario de{' '}
          <strong>
            {employee.firstName} {employee.lastName}
          </strong>
          . Ya puede ingresar al sistema.
        </Alert>

        <FormSection step={1} title="Datos de acceso">
          <FormField id="usuario-creado" label="Usuario">
            <Input id="usuario-creado" value={created.email} readOnly />
          </FormField>

          <FormField
            id="password-creada"
            label="Contraseña"
            hint="Pasásela al empleado ahora: después no se vuelve a mostrar."
          >
            <div className="flex gap-2">
              <Input
                id="password-creada"
                value={created.password}
                readOnly
                className="font-mono"
                aria-describedby="password-creada-hint"
              />
              <CopyButton text={created.password} />
            </div>
          </FormField>
        </FormSection>

        <FormActions>
          <Button type="button" size="lg" onClick={onDone}>
            Listo
          </Button>
        </FormActions>
      </div>
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
        <FormField
          id="usuario"
          label="Usuario"
          hint="Es el mail del employee."
        >
          <Input
            id="usuario"
            value={employee.email}
            readOnly
            disabled
            aria-describedby="usuario-hint"
          />
        </FormField>

        <FormField
          id="password"
          label="Contraseña"
          error={errors.password?.message}
          hint="Mínimo 8 caracteres, con una mayúscula, un número y un carácter especial."
        >
          <div className="flex gap-2">
            <Input
              id="password"
              autoComplete="new-password"
              spellCheck={false}
              className="font-mono"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? 'password-error' : 'password-hint'
              }
              {...register('password')}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={regenerate}
              aria-label="Generar otra contraseña"
              title="Generar otra contraseña"
              className="h-auto shrink-0"
            >
              <Icon d={ICONS.reload} className="size-4" />
            </Button>
            <CopyButton text={() => getValues('password')} />
          </div>
        </FormField>
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

// Copia la contraseña al portapapeles y avisa unos segundos que se copió.
// El portapapeles solo existe en contextos seguros (https o localhost).
function CopyButton({ text }: { text: string | (() => string) }) {
  const [copied, setCopied] = useState(false);

  if (!navigator.clipboard) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(
      typeof text === 'function' ? text() : text,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => void copy()}
      aria-label="Copiar contraseña"
      title="Copiar contraseña"
      className="h-auto shrink-0"
    >
      <Icon d={copied ? ICONS.check : ICONS.copy} className="size-4" />
      <span aria-live="polite" className="sr-only">
        {copied ? 'Contraseña copiada' : ''}
      </span>
    </Button>
  );
}
