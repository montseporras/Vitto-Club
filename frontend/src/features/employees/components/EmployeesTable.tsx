// Tabla de empleados registrados: apellido, nombre, teléfono, rol y estado
// lógico (datos mostrados de RF-03). Cada fila es clickeable y abre la edición
// del empleado (RF-02); la baja lógica (RF-04) vive dentro de ese modal.
import { EMPLOYEE_ROLES } from '@/domain/roles';
import { Badge } from '@/shared/components/ui/Badge';
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
}

export function EmployeesTable({
  employees,
  onSelectEmployee,
}: EmployeesTableProps) {
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Apellido</TableHeaderCell>
          <TableHeaderCell>Nombre</TableHeaderCell>
          <TableHeaderCell>Teléfono</TableHeaderCell>
          <TableHeaderCell>Rol</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
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
            <TableCell>{EMPLOYEE_ROLES[employee.role]}</TableCell>
            <TableCell>
              <Badge variant={employee.isActive ? 'success' : 'danger'}>
                {employee.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
