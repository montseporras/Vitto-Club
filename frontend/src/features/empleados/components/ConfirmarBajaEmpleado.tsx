// Confirmación de baja de empleado (RF-04), embebida en el modal de edición.
// Baja lógica: el empleado deja de estar activo pero el registro se conserva.
import { useDarDeBajaEmpleado } from '../api/empleados.queries';
import type { Empleado } from '../types/empleado';

interface ConfirmarBajaEmpleadoProps {
  empleado: Empleado;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ConfirmarBajaEmpleado({
  empleado,
  onSuccess,
  onCancel,
}: ConfirmarBajaEmpleadoProps) {
  const darDeBaja = useDarDeBajaEmpleado();

  const confirmar = () => {
    darDeBaja.mutate(empleado.id, { onSuccess });
  };

  return (
    <div>
      <p className="text-[var(--text-heading)]">
        ¿Dar de baja a{' '}
        <span className="font-semibold">
          {empleado.firstName} {empleado.lastName}
        </span>
        ? Va a dejar de poder ingresar al sistema.
      </p>

      {darDeBaja.isError && (
        <p className="mt-3 text-sm text-red-600">
          No se pudo dar de baja al empleado. Intentá nuevamente.
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-[var(--border)] bg-white px-4 py-2 font-medium text-[var(--text-heading)] hover:bg-[var(--surface-muted)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={darDeBaja.isPending}
          className="rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {darDeBaja.isPending ? 'Dando de baja…' : 'Dar de baja'}
        </button>
      </div>
    </div>
  );
}
