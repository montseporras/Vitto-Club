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
