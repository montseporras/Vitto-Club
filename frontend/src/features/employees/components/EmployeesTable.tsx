// Tabla de empleados activos: apellido, nombre, teléfono y rol (datos mostrados
// de RF-03). Si su cuenta está desactivada, se muestra la etiqueta
// "Desactivado" junto al rol. Cada fila es clickeable y abre la edición del empleado (RF-02);
// la baja lógica (RF-04) y el usuario se manejan dentro de ese modal.
import { EMPLOYEE_ROLES } from '@/domain/roles';
import { ActionsMenu } from '@/shared/components/ui/ActionsMenu';
import { Badge } from '@/shared/components/ui/Badge';
import { ICONS } from '@/shared/components/ui/icons';
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table';
import type { Employee } from '../types/employee';

interface EmployeesTableProps {
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  /** "Eliminar" del menú de tres puntos: abre la confirmación de la baja. */
  onDeleteEmployee: (employee: Employee) => void;
}

export function EmployeesTable({
  employees,
  onSelectEmployee,
  onDeleteEmployee,
}: EmployeesTableProps) {
  return (
    // Cada fila en una sola línea: si no entra, la tabla se desplaza de costado.
    <Table className="whitespace-nowrap">
      <TableHead>
        <tr>
          <TableHeaderCell>Apellido</TableHeaderCell>
          <TableHeaderCell>Nombre</TableHeaderCell>
          <TableHeaderCell>Teléfono</TableHeaderCell>
          <TableHeaderCell>Rol</TableHeaderCell>
          <TableHeaderCell className="w-12">
            <span className="sr-only">Acciones</span>
          </TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {employees.map((employee) => (
          <TableRow
            key={employee.id}
            interactive
            onClick={() => onSelectEmployee(employee)}
          >
            <TableCell>{employee.lastName}</TableCell>
            <TableCell>{employee.firstName}</TableCell>
            <TableCell>
              {employee.phone ?? <span className="text-neutral-500">—</span>}
            </TableCell>
            <TableCell>
              {/* La etiqueta va pegada al rol, posicionada fuera del flujo: así
                  no ensancha la columna ni corre las otras filas. */}
              <span className="relative">
                {EMPLOYEE_ROLES[employee.role]}
                {employee.account && !employee.account.active && (
                  <Badge
                    variant="alert"
                    className="absolute top-1/2 left-full ml-2 -translate-y-1/2"
                  >
                    Desactivado
                  </Badge>
                )}
              </span>
            </TableCell>
            <TableCell className="py-1">
              <ActionsMenu
                label={`Acciones de ${employee.firstName} ${employee.lastName}`}
                items={[
                  { label: 'Editar', icon: ICONS.pencil, onSelect: () => onSelectEmployee(employee) },
                  ...(employee.isActive
                    ? [{ label: 'Eliminar', danger: true, onSelect: () => onDeleteEmployee(employee) }]
                    : []),
                ]}
              />
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
