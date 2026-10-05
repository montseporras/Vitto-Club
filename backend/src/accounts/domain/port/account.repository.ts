import type { EmployeeRole } from '../../../employees/domain/employee.js';
import { Account } from '../account.js';

export abstract class AccountRepository {
  abstract save(account: Account): Promise<Account>;
  abstract findById(id: number): Promise<Account | null>;
  abstract findByEmployeeId(employeeId: number): Promise<Account | null>;
  abstract existsByEmployeeId(employeeId: number): Promise<boolean>;

  // Guarda solo el hash de password
  abstract updatePasswordHash(account: Account): Promise<void>;

  // Guarda solo el estado (active/deactivatedAt). Nunca borra el registro.
  abstract updateStatus(account: Account): Promise<void>;

  // Persiste Account.role como copia derivada de Employee.role (decisión del equipo:
  // Employee.role sigue siendo la única fuente de verdad; esta columna de Prisma existe
  // físicamente y hay que mantenerla sincronizada). Sin lógica de negocio: quien llama
  // decide CUÁNDO corresponde sincronizar (ver AccountsService.updateRole); este método
  // solo escribe el valor ya decidido.
  abstract syncRoleFromEmployee(accountId: number, role: EmployeeRole): Promise<void>;

  // PROVISIONAL: de los employeeId dados, cuántos tienen una Account activa.
  // Necesario para la protección del último ADMIN disponible (Employee.active &&
  // Employee.role === 'ADMIN' && Account.active), que no se puede resolver contando
  // solo Employees. La implementación Prisma definitiva (join employees <-> accounts)
  // queda pendiente hasta integrar la persistencia real de Account con la rama de auth.
  abstract countActiveByEmployeeIds(employeeIds: number[]): Promise<number>;
}
