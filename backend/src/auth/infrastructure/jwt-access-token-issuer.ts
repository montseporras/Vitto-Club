import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_ROLES, AuthRole } from '../domain/auth-role.js';
import type { AuthenticatedAccount } from '../domain/authenticated-account.js';
import { AccessTokenIssuer } from '../domain/port/access-token-issuer.js';

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

// Reconstruye el usuario a partir del contenido del token. Devuelve null si le falta algo
// o tiene una forma inesperada: un token bien firmado pero con datos raros no se acepta.
function toAccount(payload: Record<string, unknown>): AuthenticatedAccount | null {
  const accountId = positiveInteger(Number(payload.sub));
  const role = payload.role;

  if (accountId === undefined || !AUTH_ROLES.includes(role as AuthRole)) {
    return null;
  }

  const employeeId = positiveInteger(payload.employeeId);
  const customerId = positiveInteger(payload.customerId);

  return {
    accountId,
    role: role as AuthRole,
    ...(employeeId !== undefined ? { employeeId } : {}),
    ...(customerId !== undefined ? { customerId } : {}),
  };
}

// Access token como JWT firmado. El secreto, el algoritmo y la duración los configura el
// módulo (ver auth.module.ts); acá solo se arma y se lee el contenido.
@Injectable()
export class JwtAccessTokenIssuer implements AccessTokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  async issue(account: AuthenticatedAccount): Promise<string> {
    return await this.jwt.signAsync({
      // "sub" es el nombre estándar para "de quién es este token"; el estándar pide texto
      sub: String(account.accountId),
      role: account.role,
      ...(account.employeeId !== undefined ? { employeeId: account.employeeId } : {}),
      ...(account.customerId !== undefined ? { customerId: account.customerId } : {}),
    });
  }

  async verify(token: string): Promise<AuthenticatedAccount | null> {
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token);
      return toAccount(payload);
    } catch {
      // Firma inválida, token vencido o texto que no es un JWT: mismo resultado
      return null;
    }
  }
}
