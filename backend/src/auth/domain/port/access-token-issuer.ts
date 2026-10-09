import type { AuthenticatedAccount } from '../authenticated-account.js';

// Emite y verifica el access token (vida corta). auth no decide acá el formato ni la
// librería: eso es del adaptador.
export abstract class AccessTokenIssuer {
  abstract issue(account: AuthenticatedAccount): Promise<string>;

  // Devuelve null si el token es inválido o está vencido
  abstract verify(token: string): Promise<AuthenticatedAccount | null>;
}
