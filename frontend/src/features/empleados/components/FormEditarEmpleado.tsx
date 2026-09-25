// Formulario de edición de empleado (RF-02). El mail no se edita.
// La baja lógica se ofrece acá mismo (onSolicitarBaja) en vez de un botón
// aparte en la tabla.
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ROLES_EMPLEADO } from '@/domain/roles';
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

const inputClass =
  'w-full rounded border border-[var(--border)] bg-white px-3 py-2 text-[var(--text-heading)] outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500';
const labelClass = 'mb-1 block text-sm font-medium text-[var(--text-heading)]';
const errorClass = 'mt-1 text-sm text-red-600';

export function FormEditarEmpleado({
  empleado,
  onSuccess,
  onCancel,
  onSolicitarBaja,
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

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <label className={labelClass} htmlFor="nombre">
          Nombre
        </label>
        <input
          id="nombre"
          className={inputClass}
          aria-invalid={!!errors.nombre}
          {...register('nombre')}
        />
        {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
      </div>

      <div>
        <label className={labelClass} htmlFor="apellido">
          Apellido
        </label>
        <input
          id="apellido"
          className={inputClass}
          aria-invalid={!!errors.apellido}
          {...register('apellido')}
        />
        {errors.apellido && (
          <p className={errorClass}>{errors.apellido.message}</p>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="telefono">
          Teléfono <span className="text-[var(--text-muted)]">(opcional)</span>
        </label>
        <input
          id="telefono"
          className={inputClass}
          aria-invalid={!!errors.telefono}
          {...register('telefono')}
        />
        {errors.telefono && (
          <p className={errorClass}>{errors.telefono.message}</p>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="mail">
          Mail
        </label>
        <input
          id="mail"
          className={`${inputClass} cursor-not-allowed bg-[var(--surface-muted)] text-[var(--text-muted)]`}
          value={empleado.email}
          disabled
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="rol">
          Rol
        </label>
        <select
          id="rol"
          className={inputClass}
          aria-invalid={!!errors.rol}
          {...register('rol')}
        >
          {Object.entries(ROLES_EMPLEADO).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.rol && <p className={errorClass}>{errors.rol.message}</p>}
      </div>

      {actualizar.isError && (
        <p className={errorClass}>
          No se pudieron guardar los cambios. Intentá nuevamente.
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        {empleado.isActive ? (
          <button
            type="button"
            onClick={onSolicitarBaja}
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Dar de baja
          </button>
        ) : (
          <span />
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[var(--border)] bg-white px-4 py-2 font-medium text-[var(--text-heading)] hover:bg-[var(--surface-muted)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={actualizar.isPending}
            className="rounded bg-accent-500 px-4 py-2 font-medium text-white hover:bg-accent-700 disabled:opacity-60"
          >
            {actualizar.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  );
}
