// DTOs del feature empleados. Espejan el contrato del backend (NestJS + Prisma):
// campos en inglés, tal como los expondrá la API real.
import type { EmployeeRole } from '@/domain/roles';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  role: EmployeeRole;
  isActive: boolean;
  // true si el empleado ya tiene usuario para entrar al sistema (SCRUM-21)
  hasAccount: boolean;
}

// Cuerpo del POST /empleados. Teléfono opcional (RF-01).
export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;
  role: EmployeeRole;
}

// Cuerpo del PATCH /empleados/:id. El mail no se edita (RF-02).
export interface UpdateEmployeeDto {
  firstName: string;
  lastName: string;
  phone?: string;
  role: EmployeeRole;
}

// Cuerpo del POST /empleados/:id/usuario (SCRUM-21). El usuario es el mail
// del empleado y la contraseña se genera en el front.
export interface CreateAccountDto {
  username: string;
  password: string;
}

// Respuesta del alta de usuario. La contraseña nunca vuelve del backend.
export interface Account {
  id: number;
  username: string;
  employeeId: number;
}
