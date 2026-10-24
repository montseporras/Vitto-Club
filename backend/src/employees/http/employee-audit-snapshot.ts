import type { EmployeeSnapshot } from '../../audit/domain/audit-entries.js';
import type { Employee } from '../domain/employee.js';

// Foto del empleado para la auditoría: datos primitivos, sin la entidad.
export function toEmployeeSnapshot(employee: Employee): EmployeeSnapshot {
  return {
    firstName: employee.getFirstName(),
    lastName: employee.getLastName(),
    email: employee.getEmail(),
    role: employee.getRole(),
    phone: employee.getPhone(),
  };
}
