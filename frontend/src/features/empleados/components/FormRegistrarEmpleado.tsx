// Formulario de alta de empleado (RF-01).
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ROLES_EMPLEADO } from '@/domain/roles';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { FormSection } from '@/shared/components/forms/FormSection';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { useRegistrarEmpleado } from '../api/empleados.queries';
import {
  registrarEmpleadoSchema,
  type RegistrarEmpleadoForm,
} from '../schemas/empleado.schema';

interface FormRegistrarEmpleadoProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ROL_OPTIONS = Object.entries(ROLES_EMPLEADO).map(([value, label]) => ({
  value,
  label,
}));

export function FormRegistrarEmpleado({
  onSuccess,
  onCancel,
}: FormRegistrarEmpleadoProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegistrarEmpleadoForm>({
    resolver: zodResolver(registrarEmpleadoSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      telefono: '',
      email: '',
      rol: 'CASHIER',
    },
  });

  const registrar = useRegistrarEmpleado();

  const onSubmit = handleSubmit((form) => {
    registrar.mutate(form, {
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
  const errorApi = registrar.error ? toApiError(registrar.error) : null;

  // Props de accesibilidad para cada input con su mensaje de error
  const a11y = (field: Exclude<keyof RegistrarEmpleadoForm, 'rol'>) => ({
    id: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {errorApi && errorApi.status !== 409 && (
        <Alert variant="error" className="mb-6">
          {errorApi.status === undefined
            ? errorApi.message
            : errorApi.status === 400
              ? 'Hay datos inválidos. Revisá el formulario e intentá nuevamente.'
              : 'No se pudo registrar el empleado. Intentá nuevamente.'}
        </Alert>
      )}

      <FormSection step={1} title="Datos personales">
        <FormField id="nombre" label="Nombre" error={errors.nombre?.message}>
          <Input autoComplete="off" {...a11y('nombre')} {...register('nombre')} />
        </FormField>

        <FormField
          id="apellido"
          label="Apellido"
          error={errors.apellido?.message}
        >
          <Input
            autoComplete="off"
            {...a11y('apellido')}
            {...register('apellido')}
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
          id="telefono"
          label="Teléfono"
          optional
          error={errors.telefono?.message}
        >
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="off"
            {...a11y('telefono')}
            {...register('telefono')}
          />
        </FormField>
      </FormSection>

      <FormSection step={3} title="Acceso">
        <FormField id="rol" label="Rol" error={errors.rol?.message}>
          <Select
            id="rol"
            options={ROL_OPTIONS}
            aria-invalid={errors.rol ? true : undefined}
            aria-describedby={errors.rol ? 'rol-error' : undefined}
            {...register('rol')}
          />
        </FormField>
      </FormSection>

      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={registrar.isPending}>
          {registrar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </FormActions>
    </form>
  );
}
