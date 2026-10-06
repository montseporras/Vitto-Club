import type { AuthenticatedAccount } from '../authenticated-account.js';

// Lo que devuelve accounts cuando las credenciales son válidas
export type VerifiedAccount = {
  // La identidad que viaja en el access token
  account: AuthenticatedAccount;
  // Email de acceso de la cuenta, ya normalizado. Se le devuelve al front pero no va en
  // el token, porque puede cambiar.
  email: string;
};

// Puerto hacia el módulo dueño de las cuentas y las contraseñas (accounts). auth nunca ve
// un hash ni normaliza el email: le pasa lo que tipeó el usuario.
export abstract class CredentialsVerifier {
  // null si el email no tiene cuenta, la contraseña no coincide o la cuenta está inactiva.
  // A propósito no distingue la causa: el login responde siempre el mismo mensaje.
  abstract verify(email: string, password: string): Promise<VerifiedAccount | null>;

  // Datos actuales de la cuenta, o null si no existe o está inactiva. Lo usa la renovación
  // para emitir el access token con el rol vigente.
  abstract findActiveById(accountId: number): Promise<VerifiedAccount | null>;
}
