import { Injectable } from '@nestjs/common';
import { AccountsService } from '../../accounts/application/accounts.service.js';
import type { AuthRole } from '../domain/auth-role.js';
import { CredentialsVerifier } from '../domain/port/credentials-verifier.js';
import type { VerifiedAccount } from '../domain/port/credentials-verifier.js';

// Lo que auth necesita de lo que devuelve accounts. Es un tipo propio, más ancho que el de
// accounts, a propósito: firstName y lastName son opcionales, así que cuando accounts los
// empiece a entregar (hoy solo se conocen para empleados) pasan solos a la respuesta, sin
// tocar este archivo.
type AccountLoginInfo = {
  accountId: number;
  role: AuthRole;
  owner: { employeeId: number } | { customerId: number };
  email: string;
  firstName?: string;
  lastName?: string;
};

// Traduce la forma de accounts a la del puerto de auth:
// - "no hay resultado" de accounts (undefined) pasa a null;
// - "owner" (de quién es la cuenta) pasa a employeeId o customerId, que es lo que viaja en
//   el access token.
function toVerifiedAccount(info: AccountLoginInfo | undefined): VerifiedAccount | null {
  if (!info) return null;

  return {
    account: {
      accountId: info.accountId,
      role: info.role,
      ...('employeeId' in info.owner
        ? { employeeId: info.owner.employeeId }
        : { customerId: info.owner.customerId }),
    },
    email: info.email,
    ...(info.firstName !== undefined ? { firstName: info.firstName } : {}),
    ...(info.lastName !== undefined ? { lastName: info.lastName } : {}),
  };
}

// Adaptador del puerto CredentialsVerifier hacia el módulo dueño de las cuentas.
// auth no ve ningún hash: le pregunta a accounts, que verifica la contraseña y le responde
// quién es o nada. Tampoco normaliza el email: accounts lo hace (trim y minúsculas).
@Injectable()
export class AccountsCredentialsVerifier implements CredentialsVerifier {
  constructor(private readonly accounts: AccountsService) {}

  async verify(email: string, password: string): Promise<VerifiedAccount | null> {
    return toVerifiedAccount(await this.accounts.verifyCredentials(email, password));
  }

  async findActiveById(accountId: number): Promise<VerifiedAccount | null> {
    return toVerifiedAccount(await this.accounts.findActiveById(accountId));
  }
}
