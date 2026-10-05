// Formulario de edición de empleado (RF-02). El mail no se edita.
// La baja lógica (RF-04) se ofrece acá mismo (onSolicitarBaja) en vez de un
// botón aparte en la tabla.
// Un empleado dado de baja no se puede editar (el backend responde 409): sus
// datos se muestran en modo sólo lectura.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ROLES_EMPLEADO } from '@/domain/roles';
import { toApiError } from '@/shared/api/ApiError';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { FormSection } from '@/shared/components/forms/FormSection';
import { StatusText } from '@/shared/components/feedback/StatusText';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { useActualizarEmpleado } from '../api/empleados.queries';
import {
  editarEmpleadoSchema,
  type EditarEmpleadoForm,
} from '../schemas/empleado.schema';
import type { Empleado } from '../types/empleado';

interface FormEditarEmpleadoProps {
  empleado: Empleado;
  onSuccess: () => void;
  onCancel: () => void;
  onSolicitarBaja: () => void;
}

const ROL_OPTIONS = Object.entries(ROLES_EMPLEADO).map(([value, label]) => ({
  value,
  label,
}));

// Mensaje según la respuesta del backend (PATCH /empleados/:id).
function mensajeDeError(error: unknown): string {
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

export function FormEditarEmpleado({
  empleado,
  onSuccess,
  onCancel,
  onSolicitarBaja,
}: FormEditarEmpleadoProps) {
  const soloLectura = !empleado.isActive;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditarEmpleadoForm>({
    resolver: zodResolver(editarEmpleadoSchema),
    defaultValues: {
      nombre: empleado.firstName,
      apellido: empleado.lastName,
      telefono: empleado.phone ?? '',
      rol: empleado.role,
    },
  });

  const actualizar = useActualizarEmpleado(empleado.id);

  const onSubmit = handleSubmit((form) => {
    if (soloLectura) return;
    actualizar.mutate(form, { onSuccess });
  });

  // Props de accesibilidad para cada input con su mensaje de error
  const a11y = (field: Exclude<keyof EditarEmpleadoForm, 'rol'>) => ({
    id: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {soloLectura && (
        <StatusText className="mb-6">
          Este empleado está dado de baja: sus datos no se pueden editar.
        </StatusText>
      )}

      {actualizar.isError && (
        <Alert variant="error" className="mb-6">
          {mensajeDeError(actualizar.error)}
        </Alert>
      )}

      <FormSection step={1} title="Datos personales">
        <FormField id="nombre" label="Nombre" error={errors.nombre?.message}>
          <Input
            autoComplete="off"
            disabled={soloLectura}
            {...a11y('nombre')}
            {...register('nombre')}
          />
        </FormField>

        <FormField
          id="apellido"
          label="Apellido"
          error={errors.apellido?.message}
        >
          <Input
            autoComplete="off"
            disabled={soloLectura}
            {...a11y('apellido')}
            {...register('apellido')}
          />
        </FormField>
      </FormSection>

      <FormSection step={2} title="Contacto">
        <FormField id="mail" label="Mail">
          <Input id="mail" value={empleado.email} readOnly disabled />
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
            disabled={soloLectura}
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
            disabled={soloLectura}
            aria-invalid={errors.rol ? true : undefined}
            aria-describedby={errors.rol ? 'rol-error' : undefined}
            {...register('rol')}
          />
        </FormField>
      </FormSection>

      {soloLectura ? (
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
            onClick={onSolicitarBaja}
            className="sm:mr-auto"
          >
            Dar de baja
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={actualizar.isPending}>
            {actualizar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </FormActions>
      )}
    </form>
  );
}
