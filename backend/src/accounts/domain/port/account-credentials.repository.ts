// PERFIL: lo que hace falta de una cuenta (de cualquier rol) para que su dueño cambie su propia
// contraseña o su correo. Es un puerto aparte de AccountRepository (ABMC de usuarios, solo
// empleados) y de CustomerAccountRepository (registro y altas de clientes).

export type AccountCredentials = {
  accountId: number;
  // Email de acceso, ya normalizado
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'CASHIER' | 'CUSTOMER';
  // null en cuentas de empleado
  customerId: number | null;
};

export abstract class AccountCredentialsRepository {
  // null si no existe o está inactiva
  abstract findActiveById(accountId: number): Promise<AccountCredentials | null>;
  // null si el cliente no tiene cuenta activa
  abstract findActiveByCustomerId(customerId: number): Promise<AccountCredentials | null>;

  // Guarda el hash nuevo y pone mustChangePassword = false
  abstract updatePassword(accountId: number, passwordHash: string): Promise<void>;

  // ¿Hay otra cuenta ACTIVA (distinta de excludeAccountId) con ese email ya normalizado?
  abstract existsActiveByEmail(email: string, excludeAccountId: number): Promise<boolean>;
}
