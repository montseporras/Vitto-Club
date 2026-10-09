// SCRUM-160: acceso a la tabla de cuentas para el registro de clientes. Es un puerto aparte
// de AccountRepository (el del ABMC de usuarios) para no mezclar el registro con ese ABMC.

// Una fila de la tabla de cuentas, con lo que el registro necesita saber de ella
export type AccountByEmail = {
  accountId: number;
  customerId: number | null;
  employeeId: number | null;
  active: boolean;
};

export abstract class CustomerAccountRepository {
  // La cuenta que usa ese email (ya normalizado), de un empleado o de un cliente, o null
  abstract findByEmail(email: string): Promise<AccountByEmail | null>;

  // Crea la cuenta de un cliente (rol CUSTOMER) con el email normalizado y el hash ya calculado
  abstract create(data: { customerId: number; email: string; passwordHash: string }): Promise<{ accountId: number }>;

  // Un cliente dado de baja perdió su cuenta (decisión del PO): si vuelve a registrarse con
  // el mismo email, su cuenta vieja se desactiva para liberar ese email
  abstract deactivate(accountId: number): Promise<void>;
}
