// Formulario de alta de empleado (RF-01). Si se marca la casilla, en el mismo
// paso se crea su usuario (SCRUM-21): primero POST /empleados y, con el id que
// devuelve, POST /usuarios. Al final se muestran las credenciales una sola vez.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { EMPLOYEE_ROLES } from '@/domain/roles';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { FormSection } from '@/shared/components/forms/FormSection';
import { SubmitHint } from '@/shared/components/forms/SubmitHint';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useMissingFields } from '@/shared/hooks/useMissingFields';
import { Select } from '@/shared/components/ui/Select';
import { generatePassword } from '@/shared/lib/password';
import {
  useCreateEmployee,
  useCreateEmployeeAccount,
} from '../api/employees.queries';
import {
  accountPasswordSchema,
  createEmployeeSchema,
  type AccountPasswordFormValues,
  type CreateEmployeeFormValues,
} from '../schemas/employee.schema';
import type { EmployeeResponse } from '../types/employee';
import { IssuedCredentials, PasswordField } from './AccountPassword';

interface CreateEmployeeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  /** Avisa si hay datos cargados sin guardar (para preguntar antes de cerrar). */
  onDirtyChange?: (dirty: boolean) => void;
}

const ROLE_OPTIONS = Object.entries(EMPLOYEE_ROLES).map(([value, label]) => ({
  value,
  label,
}));

export function CreateEmployeeForm({
  onSuccess,
  onCancel,
  onDirtyChange,
}: CreateEmployeeFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isDirty },
  } = useForm<CreateEmployeeFormValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      role: 'CASHIER',
    },
    // Valida mientras se escribe: el error aparece en el campo, no todos al final
    mode: 'onChange',
  });
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);


  // Contraseña del usuario: un formulario aparte, porque solo se valida si se
  // marca la casilla y la regla depende del mail que se está escribiendo.
  const passwordForm = useForm<AccountPasswordFormValues>({
    defaultValues: { password: generatePassword() },
    // Valida mientras se escribe: el error aparece en el campo, no todos al final
    mode: 'onChange',
  });

  const [withAccount, setWithAccount] = useState(false);
  // Empleado ya creado, para mostrar el resultado final
  const [created, setCreated] = useState<EmployeeResponse | null>(null);
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);

  const createEmployee = useCreateEmployee();
  const createAccount = useCreateEmployeeAccount();
  const email = useWatch({ control, name: 'email' });
  const password = useWatch({ control: passwordForm.control, name: 'password' }) ?? '';
  // Qué falta para poder guardar: se dice arriba del botón, que queda apagado
  const missing = useMissingFields(
    control,
    { firstName: 'Nombre', lastName: 'Apellido', email: 'Mail', phone: 'Teléfono' },
    ['phone'],
  );

  // Valida la contraseña con la regla del mail actual y marca el error en su campo.
  const validPassword = (mail: string): string | null => {
    const { password } = passwordForm.getValues();
    const result = accountPasswordSchema(mail.trim()).safeParse({ password });
    if (result.success) return password;
    passwordForm.setError('password', {
      message: result.error.issues[0]?.message,
    });
    return null;
  };

  const onSubmit = handleSubmit((form) => {
    passwordForm.clearErrors();
    const password = withAccount ? validPassword(form.email) : null;
    if (withAccount && !password) return;

    createEmployee.mutate(form, {
      onSuccess: (employee) => {
        if (!password) {
          onSuccess();
          return;
        }
        setCreated(employee);
        createAccount.mutate(
          { employeeId: employee.id, email: employee.email, password },
          { onSuccess: () => setIssuedPassword(password) },
        );
      },
      onError: (error) => {
        // 409: el backend rechaza el mail porque ya hay un empleado con ese mail.
        if (toApiError(error).status === 409) {
          setError('email', {
            message: 'Ya existe un empleado registrado con ese mail.',
          });
        }
      },
    });
  });

  // Empleado y usuario creados: credenciales para pasarle al empleado.
  if (created && issuedPassword) {
    return (
      <IssuedCredentials
        email={created.email}
        password={issuedPassword}
        onDone={onSuccess}
      >
        Se registró a{' '}
        <strong>
          {created.firstName} {created.lastName}
        </strong>{' '}
        y se creó su usuario. Ya puede ingresar al sistema.
      </IssuedCredentials>
    );
  }

  // El empleado quedó creado pero su usuario no: se puede crear después desde la edición.
  if (created && createAccount.isError) {
    return (
      <div>
        <Alert variant="error" className="mb-6">
          Se registró a{' '}
          <strong>
            {created.firstName} {created.lastName}
          </strong>
          , pero no se pudo crear su usuario. Podés crearlo desde la edición del
          empleado.
        </Alert>
        <FormActions>
          <Button type="button" size="lg" onClick={onSuccess}>
            Listo
          </Button>
        </FormActions>
      </div>
    );
  }

  // El 409 se muestra en el campo Mail; el resto de los errores, arriba del formulario.
  const apiError = createEmployee.error ? toApiError(createEmployee.error) : null;
  const saving = createEmployee.isPending || createAccount.isPending;

  // Props de accesibilidad para cada input con su mensaje de error
  const a11y = (field: Exclude<keyof CreateEmployeeFormValues, 'role'>) => ({
    id: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {apiError && apiError.status !== 409 && (
        <Alert variant="error" className="mb-6">
          {apiError.status === undefined
            ? apiError.message
            : apiError.status === 400
              ? 'Hay datos inválidos. Revisá el formulario e intentá nuevamente.'
              : 'No se pudo registrar el empleado. Intentá nuevamente.'}
        </Alert>
      )}

      <FormSection step={1} title="Datos personales">
        <FormField id="firstName" label="Nombre" error={errors.firstName?.message}>
          <Input autoComplete="off" {...a11y('firstName')} {...register('firstName')} />
        </FormField>

        <FormField
          id="lastName"
          label="Apellido"
          error={errors.lastName?.message}
        >
          <Input
            autoComplete="off"
            {...a11y('lastName')}
            {...register('lastName')}
          />
        </FormField>
      </FormSection>

      <FormSection step={2} title="Contacto">
        <FormField id="email" label="Mail" error={errors.email?.message}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="off"
            {...a11y('email')}
            {...register('email')}
          />
        </FormField>

        <FormField
          id="phone"
          label="Teléfono"
          optional
          error={errors.phone?.message}
        >
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="off"
            maxLength={30}
            className="max-w-60"
            {...a11y('phone')}
            {...register('phone')}
          />
        </FormField>
      </FormSection>

      <FormSection step={3} title="Acceso">
        <FormField id="role" label="Rol" error={errors.role?.message}>
          <Select
            id="role"
            options={ROLE_OPTIONS}
            aria-invalid={errors.role ? true : undefined}
            aria-describedby={errors.role ? 'role-error' : undefined}
            {...register('role')}
          />
        </FormField>

        {/* Ocupa toda la fila: debajo aparecen los datos del usuario */}
        <label className="flex cursor-pointer items-center gap-3 text-base font-semibold text-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={withAccount}
            onChange={(e) => setWithAccount(e.target.checked)}
            className="size-5 cursor-pointer accent-accent-700"
          />
          Crear también su usuario para que pueda ingresar al sistema
        </label>

        {withAccount && (
          <>
            <FormField
              id="usuario"
              label="Usuario"
              hint="Es el mail del empleado."
            >
              <Input
                id="usuario"
                value={email}
                readOnly
                disabled
                aria-describedby="usuario-hint"
              />
            </FormField>

            <PasswordField
              label="Contraseña"
              error={passwordForm.formState.errors.password?.message}
              registration={passwordForm.register('password')}
              onRegenerate={() => {
                passwordForm.setValue('password', generatePassword());
                passwordForm.clearErrors('password');
              }}
              getPassword={() => passwordForm.getValues('password')}
              password={password}
              email={email.trim()}
            />
          </>
        )}
      </FormSection>

      {missing.length > 0 && (
        <div className="mt-6">
          <SubmitHint id="employee-missing" missing={missing} />
        </div>
      )}
      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          loading={saving}
          type="submit"
          size="lg"
          disabled={saving || missing.length > 0}
          aria-describedby={missing.length > 0 ? 'employee-missing' : undefined}
        >
          {createAccount.isPending
            ? 'Creando usuario…'
            : createEmployee.isPending
              ? 'Guardando…'
              : 'Guardar'}
        </Button>
      </FormActions>
    </form>
  );
}
