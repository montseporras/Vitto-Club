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
