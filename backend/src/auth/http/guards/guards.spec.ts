import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from '../../../shared/security/public.decorator.js';
import { Roles } from '../../../shared/security/roles.decorator.js';
import type { CurrentUserData } from '../../../shared/security/current-user-data.js';
import type { AuthenticatedAccount } from '../../domain/authenticated-account.js';
import { AccessTokenIssuer } from '../../domain/port/access-token-issuer.js';
import { JwtAuthGuard, UNAUTHENTICATED } from './jwt-auth.guard.js';
import { FORBIDDEN, RolesGuard } from './roles.guard.js';

// Endpoints de mentira, solo para tener las marcas de los decoradores
class Probe {
  @Public()
  open() {}

  @Roles('ADMIN')
  adminOnly() {}

  @Roles('ADMIN', 'CASHIER')
  staff() {}

  undeclared() {}
}

type FakeRequest = { headers: { authorization?: string }; user?: CurrentUserData };

const contextFor = (handler: () => void, request: FakeRequest) =>
  ({
    getHandler: () => handler,
    getClass: () => Probe,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const CASHIER: AuthenticatedAccount = { accountId: 1, role: 'CASHIER', employeeId: 10 };

class FakeAccessTokens extends AccessTokenIssuer {
  async issue(): Promise<string> {
    return 'valid';
  }

  async verify(token: string): Promise<AuthenticatedAccount | null> {
    return token === 'valid' ? CASHIER : null;
  }
}

const codeOf = (error: unknown) =>
  ((error as UnauthorizedException | ForbiddenException).getResponse() as { code: unknown }).code;

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard(new Reflector(), new FakeAccessTokens());

  it('deja pasar un endpoint público sin token', async () => {
    const request: FakeRequest = { headers: {} };

    expect(await guard.canActivate(contextFor(Probe.prototype.open, request))).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('con un token válido deja pasar y guarda al usuario en el pedido', async () => {
    const request: FakeRequest = { headers: { authorization: 'Bearer valid' } };

    expect(await guard.canActivate(contextFor(Probe.prototype.staff, request))).toBe(true);
    expect(request.user).toEqual(CASHIER);
  });

  it('rechaza un pedido sin encabezado de autorización', async () => {
    const error = await guard
      .canActivate(contextFor(Probe.prototype.staff, { headers: {} }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(codeOf(error)).toBe(UNAUTHENTICATED);
  });

  it('rechaza un encabezado que no es Bearer', async () => {
    const request: FakeRequest = { headers: { authorization: 'Basic valid' } };

    await expect(guard.canActivate(contextFor(Probe.prototype.staff, request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un token inválido o vencido', async () => {
    const request: FakeRequest = { headers: { authorization: 'Bearer vencido' } };

    await expect(guard.canActivate(contextFor(Probe.prototype.staff, request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });
});

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const asCashier: FakeRequest = { headers: {}, user: CASHIER };

  it('deja pasar un endpoint público', () => {
    expect(guard.canActivate(contextFor(Probe.prototype.open, { headers: {} }))).toBe(true);
  });

  it('deja pasar si el rol del usuario está entre los permitidos', () => {
    expect(guard.canActivate(contextFor(Probe.prototype.staff, asCashier))).toBe(true);
  });

  it('rechaza si el rol no está entre los permitidos', () => {
    let error: unknown;
    try {
      guard.canActivate(contextFor(Probe.prototype.adminOnly, asCashier));
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(codeOf(error)).toBe(FORBIDDEN);
  });

  it('un endpoint sin @Roles() ni @Public() queda cerrado para todos', () => {
    expect(() => guard.canActivate(contextFor(Probe.prototype.undeclared, asCashier))).toThrow(ForbiddenException);
  });

  it('rechaza si no hay usuario en el pedido', () => {
    expect(() => guard.canActivate(contextFor(Probe.prototype.staff, { headers: {} }))).toThrow(ForbiddenException);
  });
});
