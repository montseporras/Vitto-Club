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
  // Usuario con el que entra al sistema (SCRUM-21/24/27); null si no tiene.
  account: EmployeeAccount | null;
}

// Resumen del usuario de cada empleado: el id para operar sobre él y si está
// activo (un usuario dado de baja no puede ingresar). El backend no lo manda con
// el empleado: el front lo arma cruzando GET /usuarios por employeeId.
export interface EmployeeAccount {
  id: number;
  active: boolean;
}

// Empleado tal como lo devuelve /empleados, sin el resumen del usuario.
export type EmployeeResponse = Omit<Employee, 'account'>;

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

// Cuerpo del POST /usuarios (SCRUM-21). El mail tiene que ser el del
// empleado: con él inicia sesión. La contraseña se genera en el front.
export interface CreateAccountDto {
  employeeId: number;
  email: string;
  password: string;
}

// Respuesta del alta de usuario. El rol es una copia del rol del empleado y
// la contraseña nunca vuelve del backend.
export interface Account {
  accountId: number;
  employeeId: number;
  email: string;
  role: EmployeeRole;
  active: boolean;
}

// Cuerpo del PATCH /usuarios/:id (SCRUM-24, contrato §3.11.2). Solo viaja la
// contraseña: el backend rechaza `role` con 400, el rol se cambia desde el empleado.
export interface UpdateAccountPasswordDto {
  password: string;
}
