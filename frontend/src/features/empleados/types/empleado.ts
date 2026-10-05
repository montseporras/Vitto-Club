// DTOs del feature empleados. Espejan el contrato del backend (NestJS + Prisma):
// campos en inglés, tal como los expondrá la API real.
import type { RolEmpleado } from '@/domain/roles';

export interface Empleado {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  role: RolEmpleado;
  isActive: boolean;
  // true si el empleado ya tiene usuario para entrar al sistema (SCRUM-21)
  hasAccount: boolean;
}

// Cuerpo del POST /empleados. Teléfono opcional (RF-01).
export interface CrearEmpleadoDto {
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;
  role: RolEmpleado;
}

// Cuerpo del PATCH /empleados/:id. El mail no se edita (RF-02).
export interface ActualizarEmpleadoDto {
  firstName: string;
  lastName: string;
  phone?: string;
  role: RolEmpleado;
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
