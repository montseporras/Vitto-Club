// Formulario de alta de empleado (RF-01).
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ROLES_EMPLEADO } from '@/domain/roles';
import { useRegistrarEmpleado } from '../api/empleados.queries';
import {
  registrarEmpleadoSchema,
  type RegistrarEmpleadoForm,
} from '../schemas/empleado.schema';

interface FormRegistrarEmpleadoProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded border border-[var(--border)] bg-white px-3 py-2 text-[var(--text-heading)] outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500';
const labelClass = 'mb-1 block text-sm font-medium text-[var(--text-heading)]';
const errorClass = 'mt-1 text-sm text-red-600';

export function FormRegistrarEmpleado({
  onSuccess,
  onCancel,
}: FormRegistrarEmpleadoProps) {
  const {
    register,
    handleSubmit,
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
    registrar.mutate(form, { onSuccess });
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
        <label className={labelClass} htmlFor="email">
          Mail
        </label>
        <input
          id="email"
          type="email"
          className={inputClass}
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
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

      {registrar.isError && (
        <p className={errorClass}>
          No se pudo registrar el empleado. Intentá nuevamente.
        </p>
      )}

      <div className="mt-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-[var(--border)] bg-white px-4 py-2 font-medium text-[var(--text-heading)] hover:bg-[var(--surface-muted)]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={registrar.isPending}
          className="rounded bg-accent-500 px-4 py-2 font-medium text-white hover:bg-accent-700 disabled:opacity-60"
        >
          {registrar.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
