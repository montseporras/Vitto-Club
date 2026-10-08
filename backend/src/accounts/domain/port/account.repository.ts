import type { AccountRole } from '../account-role.js';
import { Account } from '../account.js';

// Una cuenta de CLIENTE, vista solo para el login. No es la entidad Account (esa modela
// únicamente cuentas de empleado): acá hace falta apenas lo que verifyCredentials y
// findActiveById necesitan. El estado "activo" del cliente no se copia: se lee de Customer.
export type CustomerLoginRecord = {
  accountId: number;
  customerId: number;
  email: string;
  passwordHash: string;
  active: boolean;
};

export abstract class AccountRepository {
  abstract save(account: Account): Promise<Account>;
  abstract findById(id: number): Promise<Account | null>;
  abstract findByEmployeeId(employeeId: number): Promise<Account | null>;
  // Login: todos los roles usan email + password (ver infrastructure). Devuelve null si
  // no existe, o si la fila encontrada no es una cuenta de empleado (employeeId nulo).
  abstract findByEmail(email: string): Promise<Account | null>;
  abstract existsByEmployeeId(employeeId: number): Promise<boolean>;

  // Guarda solo el hash de password
  abstract updatePasswordHash(account: Account): Promise<void>;

  // Guarda solo el estado (active/deactivatedAt). Nunca borra el registro.
  abstract updateStatus(account: Account): Promise<void>;

  // Persiste Account.role como copia derivada de Employee.role (decisión del equipo:
  // Employee.role sigue siendo la única fuente de verdad; esta columna de Prisma existe
  // físicamente y hay que mantenerla sincronizada). Sin lógica de negocio: quien llama
  // decide CUÁNDO corresponde sincronizar (ver el listener de employee.role-changed);
  // este método solo escribe el valor ya decidido.
  abstract syncRoleFromEmployee(accountId: number, role: AccountRole): Promise<void>;

  // PROVISIONAL: de los employeeId dados, cuántos tienen una Account activa.
  // Necesario para la protección del último ADMIN disponible (Employee.active &&
  // Employee.role === 'ADMIN' && Account.active), que no se puede resolver contando
  // solo Employees.
  abstract countActiveByEmployeeIds(employeeIds: number[]): Promise<number>;

  // --- Cuentas de CLIENTE (login). Las de empleado siguen yendo por findByEmail/findById ---

  // null si no existe o si la fila no es una cuenta de cliente (customerId nulo)
  abstract findCustomerLoginByEmail(email: string): Promise<CustomerLoginRecord | null>;
  abstract findCustomerLoginById(accountId: number): Promise<CustomerLoginRecord | null>;

  // Copia el email del cliente en su cuenta (el email de acceso es una copia de
  // Customer.email, igual que el de un empleado lo es de Employee.email). Sin cuenta, no
  // hace nada: un cliente puede existir sin cuenta.
  abstract updateEmailByCustomerId(customerId: number, email: string): Promise<void>;
}
