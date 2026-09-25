// Tabla de empleados registrados (listado de RF-01).
import { ROLES_EMPLEADO } from '@/domain/roles';
import type { Empleado } from '../types/empleado';

interface TablaEmpleadosProps {
  empleados: Empleado[];
}

const headerClass =
  'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]';
const cellClass = 'px-3 py-3 text-[var(--text-heading)]';

export function TablaEmpleados({ empleados }: TablaEmpleadosProps) {
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
          <tr key={empleado.id} className="border-b border-[var(--border)]">
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
