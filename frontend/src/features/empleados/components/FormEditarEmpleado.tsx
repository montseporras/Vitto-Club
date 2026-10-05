// Formulario de edición de empleado (RF-02). El mail no se edita.
// La baja lógica (RF-04) se ofrece acá mismo (onSolicitarBaja) en vez de un
// botón aparte en la tabla. Lo mismo con el alta del usuario (SCRUM-21):
// si el empleado no tiene, se ofrece crearlo (onCreateAccount).
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ROLES_EMPLEADO } from '@/domain/roles';
import { FormActions } from '@/shared/components/forms/FormActions';
import { FormField } from '@/shared/components/forms/FormField';
import { FormSection } from '@/shared/components/forms/FormSection';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Icon } from '@/shared/components/ui/Icon';
import { ICONS } from '@/shared/components/ui/icons';
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
  onCreateAccount: () => void;
}

const ROL_OPTIONS = Object.entries(ROLES_EMPLEADO).map(([value, label]) => ({
  value,
  label,
}));

export function FormEditarEmpleado({
  empleado,
  onSuccess,
  onCancel,
  onSolicitarBaja,
  onCreateAccount,
}: FormEditarEmpleadoProps) {
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
      {actualizar.isError && (
        <Alert variant="error" className="mb-6">
          No se pudieron guardar los cambios. Intentá nuevamente.
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

      <FormSection step={4} title="Usuario del sistema">
        {empleado.hasAccount ? (
          <div className="flex flex-col gap-2">
            <Badge variant="success">Con usuario</Badge>
            <p className="text-sm text-neutral-600">
              Ingresa al sistema con el mail <strong>{empleado.email}</strong>.
            </p>
          </div>
        ) : empleado.isActive ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-neutral-600">
              Todavía no tiene usuario, así que no puede ingresar al sistema.
            </p>
            <Button type="button" variant="secondary" onClick={onCreateAccount}>
              <Icon d={ICONS.userPlus} className="size-4" />
              Crear usuario
            </Button>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">
            No tiene usuario. Para crearlo, el empleado tiene que estar activo.
          </p>
        )}
      </FormSection>

      <FormActions>
        {empleado.isActive && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onSolicitarBaja}
            className="sm:mr-auto"
          >
            Dar de baja
          </Button>
        )}
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={actualizar.isPending}>
          {actualizar.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </FormActions>
    </form>
  );
}
