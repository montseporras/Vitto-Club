import { Employee } from '../employee.js';

export type EmployeeListFilters = {
  // Nombre y/o apellido, sin distinguir mayúsculas
  nameContains?: string;
  // undefined = activos e inactivos
  active?: boolean;
};

export abstract class EmployeeRepository {
  abstract save(employee: Employee): Promise<Employee>;
  abstract findById(id: number): Promise<Employee | null>;
  abstract findAll(filters?: EmployeeListFilters): Promise<Employee[]>;

  // Guarda solo los datos editables (nombre, apellido, rol y teléfono)
  abstract update(employee: Employee): Promise<void>;

  // Guarda solo el estado (isActive y deactivatedAt). Nunca borra el registro.
  abstract updateStatus(employee: Employee): Promise<void>;

  // El email se compara sin distinguir mayúsculas e incluye a los empleados inactivos
  abstract existsByEmail(email: string): Promise<boolean>;
}
