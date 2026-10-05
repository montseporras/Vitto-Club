// Formulario de alta de empleado (RF-01).
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { EMPLOYEE_ROLES } from '@/domain/roles';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { FormSection } from '@/shared/components/forms/FormSection';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { useCreateEmployee } from '../api/employees.queries';
import {
  createEmployeeSchema,
  type CreateEmployeeFormValues,
} from '../schemas/employee.schema';

interface CreateEmployeeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ROLE_OPTIONS = Object.entries(EMPLOYEE_ROLES).map(([value, label]) => ({
  value,
  label,
}));

export function CreateEmployeeForm({
  onSuccess,
  onCancel,
}: CreateEmployeeFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateEmployeeFormValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      role: 'CASHIER',
    },
  });

  const createEmployee = useCreateEmployee();

  const onSubmit = handleSubmit((form) => {
    createEmployee.mutate(form, {
      onSuccess,
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

  // El 409 se muestra en el campo Mail; el resto de los errores, arriba del formulario.
  const apiError = createEmployee.error ? toApiError(createEmployee.error) : null;

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
      </FormSection>

      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={createEmployee.isPending}>
          {createEmployee.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </FormActions>
    </form>
  );
}
