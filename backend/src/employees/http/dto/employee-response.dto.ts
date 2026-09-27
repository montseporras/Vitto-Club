import { Employee, EmployeeRole } from '../../domain/employee.js';

// Forma exacta que espera el frontend (features/empleados/types/empleado.ts)
export class EmployeeResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  role: EmployeeRole;
  isActive: boolean;

  private constructor(employee: Employee) {
    this.id = employee.getId() as number;
    this.firstName = employee.getFirstName();
    this.lastName = employee.getLastName();
    this.phone = employee.getPhone();
    this.email = employee.getEmail();
    this.role = employee.getRole();
    this.isActive = employee.isActive();
  }

  static fromDomain(employee: Employee): EmployeeResponseDto {
    return new EmployeeResponseDto(employee);
  }
}
