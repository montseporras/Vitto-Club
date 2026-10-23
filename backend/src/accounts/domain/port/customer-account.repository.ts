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

  // Crea la cuenta de un cliente (rol CUSTOMER) con el email normalizado y el hash ya calculado.
  // mustChangePassword es true solo si la cuenta nace con la contraseña inicial (= documento).
  abstract create(data: {
    customerId: number;
    email: string;
    passwordHash: string;
    mustChangePassword: boolean;
  }): Promise<{ accountId: number }>;

  // Un cliente dado de baja perdió su cuenta (decisión del PO): si vuelve a registrarse con
  // el mismo email, su cuenta vieja se desactiva para liberar ese email
  abstract deactivate(accountId: number): Promise<void>;

  // CLI-ADM: deja inactiva la cuenta ACTIVA del cliente dado de baja. Devuelve el id de la cuenta
  // (para cerrar sus sesiones) o null si el cliente no tenía cuenta activa.
  abstract deactivateByCustomerId(customerId: number): Promise<number | null>;

  // CLI-ADM: cambia el hash solo si la cuenta todavía tiene la contraseña inicial
  // (mustChangePassword = true). Devuelve true si la cambió; si el cliente ya eligió su
  // contraseña, no la toca.
  abstract replaceInitialPasswordHash(customerId: number, passwordHash: string): Promise<boolean>;
}
