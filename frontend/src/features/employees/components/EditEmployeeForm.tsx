// Formulario de edición de empleado (RF-02). El mail no se edita.
// La baja lógica (RF-04) se ofrece acá mismo (onRequestDeactivation) en vez de un
// botón aparte en la tabla. Lo mismo con el usuario del sistema (SCRUM-21/24/27):
// las acciones sobre él se piden con onAccountAction.
// Un empleado dado de baja no se puede editar (el backend responde 409): sus
// datos se muestran en modo sólo lectura.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { EMPLOYEE_ROLES } from '@/domain/roles';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { FormSection } from '@/shared/components/forms/FormSection';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { useUpdateEmployee } from '../api/employees.queries';
import {
  editEmployeeSchema,
  type EditEmployeeFormValues,
} from '../schemas/employee.schema';
import type { Employee } from '../types/employee';
import {
  EmployeeAccountSection,
  type AccountAction,
} from './EmployeeAccountSection';

interface EditEmployeeFormProps {
  employee: Employee;
  onSuccess: () => void;
  onCancel: () => void;
  onRequestDeactivation: () => void;
  onAccountAction: (action: AccountAction) => void;
}

const ROLE_OPTIONS = Object.entries(EMPLOYEE_ROLES).map(([value, label]) => ({
  value,
  label,
}));

// Mensaje según la respuesta del backend (PATCH /empleados/:id).
function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.status) {
    case undefined:
      return apiError.message;
    case 409:
      return 'Este empleado está dado de baja: no se puede editar.';
    case 404:
      return 'El empleado ya no existe.';
    case 400:
      return 'Hay datos inválidos. Revisá el formulario e intentá nuevamente.';
    default:
      return 'No se pudieron guardar los cambios. Intentá nuevamente.';
  }
}

export function EditEmployeeForm({
  employee,
  onSuccess,
  onCancel,
  onRequestDeactivation,
  onAccountAction,
}: EditEmployeeFormProps) {
  const isReadOnly = !employee.isActive;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditEmployeeFormValues>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone ?? '',
      role: employee.role,
    },
  });

  const updateEmployee = useUpdateEmployee(employee.id);

  const onSubmit = handleSubmit((form) => {
    if (isReadOnly) return;
    updateEmployee.mutate(form, { onSuccess });
  });

  // Props de accesibilidad para cada input con su mensaje de error
  const a11y = (field: Exclude<keyof EditEmployeeFormValues, 'role'>) => ({
    id: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {isReadOnly && (
        <StatusText className="mb-6">
          Este empleado está dado de baja: sus datos no se pueden editar.
        </StatusText>
      )}

      {updateEmployee.isError && (
        <Alert variant="error" className="mb-6">
          {errorMessage(updateEmployee.error)}
        </Alert>
      )}

      <FormSection step={1} title="Datos personales">
        <FormField id="firstName" label="Nombre" error={errors.firstName?.message}>
          <Input
            autoComplete="off"
            disabled={isReadOnly}
            {...a11y('firstName')}
            {...register('firstName')}
          />
        </FormField>

        <FormField
          id="lastName"
          label="Apellido"
          error={errors.lastName?.message}
        >
          <Input
            autoComplete="off"
            disabled={isReadOnly}
            {...a11y('lastName')}
            {...register('lastName')}
          />
        </FormField>
      </FormSection>

      <FormSection step={2} title="Contacto">
        <FormField id="mail" label="Mail">
          <Input id="mail" value={employee.email} readOnly disabled />
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
            disabled={isReadOnly}
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
            disabled={isReadOnly}
            aria-invalid={errors.role ? true : undefined}
            aria-describedby={errors.role ? 'role-error' : undefined}
            {...register('role')}
          />
        </FormField>
      </FormSection>

      <EmployeeAccountSection
        step={4}
        employee={employee}
        onAction={onAccountAction}
      />

      {isReadOnly ? (
        <FormActions>
          <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
            Cerrar
          </Button>
        </FormActions>
      ) : (
        <FormActions>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onRequestDeactivation}
            className="sm:mr-auto"
          >
            Dar de baja
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={updateEmployee.isPending}>
            {updateEmployee.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </FormActions>
      )}
    </form>
  );
}
