// Tabla de empleados registrados: nombre, apellido, teléfono, rol y estado
// lógico (datos mostrados de RF-03). Cada fila es clickeable y abre la edición
// del empleado (RF-02); la baja lógica (RF-04) vive dentro de ese modal.
import { ROLES_EMPLEADO } from '@/domain/roles';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/ui/Table';
import type { Empleado } from '../types/empleado';

interface TablaEmpleadosProps {
  empleados: Empleado[];
  onSeleccionarEmpleado: (empleado: Empleado) => void;
}

export function TablaEmpleados({
  empleados,
  onSeleccionarEmpleado,
}: TablaEmpleadosProps) {
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Nombre</TableHeaderCell>
          <TableHeaderCell>Apellido</TableHeaderCell>
          <TableHeaderCell>Teléfono</TableHeaderCell>
          <TableHeaderCell>Rol</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
        </tr>
      </TableHead>
      <tbody>
        {empleados.map((empleado) => (
          <TableRow
            key={empleado.id}
            interactive
            onClick={() => onSeleccionarEmpleado(empleado)}
          >
            <TableCell>{empleado.firstName}</TableCell>
            <TableCell>{empleado.lastName}</TableCell>
            <TableCell>
              {empleado.phone ?? <span className="text-neutral-500">—</span>}
            </TableCell>
            <TableCell>{ROLES_EMPLEADO[empleado.role]}</TableCell>
            <TableCell>
              <Badge variant={empleado.isActive ? 'success' : 'danger'}>
                {empleado.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
