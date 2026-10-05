import type { AuthenticatedAccount } from '../authenticated-account.js';

// Puerto hacia el módulo dueño de las cuentas y las contraseñas (accounts). auth nunca ve
// un hash ni decide cómo se normaliza el identificador.
export abstract class CredentialsVerifier {
  // null si el identificador no existe, la contraseña no coincide o la cuenta está inactiva.
  // A propósito no distingue la causa: el login responde siempre el mismo mensaje.
  abstract verify(identifier: string, password: string): Promise<AuthenticatedAccount | null>;

  // Datos actuales de la cuenta, o null si no existe o está inactiva. Lo usa la renovación
  // para emitir el access token con el rol vigente.
  abstract findActiveById(accountId: number): Promise<AuthenticatedAccount | null>;
}
