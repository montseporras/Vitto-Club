// Tabla de empleados registrados (listado de RF-01). Cada fila es clickeable
// y abre la edición del empleado (RF-02); la baja lógica vive dentro de ese modal.
import { ROLES_EMPLEADO } from '@/domain/roles';
import type { Empleado } from '../types/empleado';

interface TablaEmpleadosProps {
  empleados: Empleado[];
  onSeleccionarEmpleado: (empleado: Empleado) => void;
}

const headerClass =
  'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]';
const cellClass = 'px-3 py-3 text-[var(--text-heading)]';

export function TablaEmpleados({
  empleados,
  onSeleccionarEmpleado,
}: TablaEmpleadosProps) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-[var(--border)]">
          <th className={headerClass}>Nombre</th>
          <th className={headerClass}>Apellido</th>
          <th className={headerClass}>Rol</th>
          <th className={headerClass}>Mail</th>
          <th className={headerClass}>Estado</th>
        </tr>
      </thead>
      <tbody>
        {empleados.map((empleado) => (
          <tr
            key={empleado.id}
            onClick={() => onSeleccionarEmpleado(empleado)}
            className="cursor-pointer border-b border-[var(--border)] hover:bg-[var(--surface-muted)]"
          >
            <td className={cellClass}>{empleado.firstName}</td>
            <td className={cellClass}>{empleado.lastName}</td>
            <td className={cellClass}>{ROLES_EMPLEADO[empleado.role]}</td>
            <td className={cellClass}>{empleado.email}</td>
            <td className={cellClass}>
              <span
                className={
                  empleado.isActive
                    ? 'rounded-full bg-accent-100 px-2 py-0.5 text-sm text-accent-700'
                    : 'rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-sm text-[var(--text-muted)]'
                }
              >
                {empleado.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
