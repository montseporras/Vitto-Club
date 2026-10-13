import { UnauthorizedException } from '@nestjs/common';
import { AuthService, INVALID_CREDENTIALS, INVALID_SESSION } from './auth.service.js';
import type { AuthenticatedAccount } from '../domain/authenticated-account.js';
import { Session } from '../domain/session.js';
import { AccessTokenIssuer } from '../domain/port/access-token-issuer.js';
import { CredentialsVerifier, VerifiedAccount } from '../domain/port/credentials-verifier.js';
import { SessionPolicies, SessionPolicy } from '../domain/port/session-policies.js';
import { SessionRepository } from '../domain/port/session.repository.js';
import { CryptoRefreshTokenGenerator } from '../infrastructure/crypto-refresh-token-generator.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const EMPLOYEE_POLICY: SessionPolicy = { inactivityMs: 30 * MINUTE, absoluteMs: 12 * HOUR };
const CUSTOMER_POLICY: SessionPolicy = { inactivityMs: 7 * DAY, absoluteMs: 30 * DAY };

// --- Puertos falsos ---

const copy = (session: Session, overrides: { expiresAt?: Date; absoluteExpiresAt?: Date; revokedAt?: Date | null } = {}) =>
  Session.reconstruct({
    id: session.getId() as number,
    accountId: session.getAccountId(),
    tokenHash: session.getTokenHash(),
    expiresAt: overrides.expiresAt ?? session.getExpiresAt(),
    absoluteExpiresAt: overrides.absoluteExpiresAt ?? session.getAbsoluteExpiresAt(),
    revokedAt: overrides.revokedAt !== undefined ? overrides.revokedAt : session.getRevokedAt(),
    createdAt: session.getCreatedAt(),
  });

// Se comporta como el repositorio real: guarda copias y la renovación exige el token anterior
class InMemorySessions extends SessionRepository {
  rows: Session[] = [];
  private nextId = 1;

  async save(session: Session): Promise<Session> {
    const saved = Session.reconstruct({
      id: this.nextId++,
      accountId: session.getAccountId(),
      tokenHash: session.getTokenHash(),
      expiresAt: session.getExpiresAt(),
      absoluteExpiresAt: session.getAbsoluteExpiresAt(),
      revokedAt: session.getRevokedAt(),
      createdAt: session.getCreatedAt(),
    });
    this.rows.push(saved);
    return copy(saved);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const row = this.rows.find((r) => r.getTokenHash() === tokenHash);
    return row ? copy(row) : null;
  }

  async saveRotation(session: Session, previousTokenHash: string): Promise<boolean> {
    const index = this.rows.findIndex(
      (r) => r.getId() === session.getId() && r.getTokenHash() === previousTokenHash && r.getRevokedAt() === null,
    );
    if (index < 0) return false;
    this.rows[index] = copy(session);
    return true;
  }

  async saveRevocation(session: Session): Promise<void> {
    const index = this.rows.findIndex((r) => r.getId() === session.getId() && r.getRevokedAt() === null);
    if (index >= 0) this.rows[index] = copy(session);
  }

  async revokeAllForAccount(accountId: number, now: Date): Promise<void> {
    this.rows = this.rows.map((r) =>
      r.getAccountId() === accountId && r.getRevokedAt() === null ? copy(r, { revokedAt: now }) : r,
    );
  }

  // Solo para los tests: simular que pasó el tiempo o que alguien revocó la sesión
  patch(index: number, overrides: { expiresAt?: Date; absoluteExpiresAt?: Date; revokedAt?: Date | null }): void {
    this.rows[index] = copy(this.rows[index], overrides);
  }
}

class FakeCredentials extends CredentialsVerifier {
  private readonly accounts = new Map<number, { verified: VerifiedAccount; password: string; active: boolean }>();

  add(
    account: AuthenticatedAccount,
    email: string,
    password: string,
    names?: { firstName: string; lastName: string },
  ): void {
    this.accounts.set(account.accountId, { verified: { account, email, ...names }, password, active: true });
  }

  deactivate(accountId: number): void {
    this.accounts.get(accountId)!.active = false;
  }

  changeRole(accountId: number, role: AuthenticatedAccount['role']): void {
    const entry = this.accounts.get(accountId)!;
    entry.verified = { ...entry.verified, account: { ...entry.verified.account, role } };
  }

  async verify(email: string, password: string): Promise<VerifiedAccount | null> {
    for (const entry of this.accounts.values()) {
      if (entry.verified.email === email.trim().toLowerCase()) {
        return entry.active && entry.password === password ? entry.verified : null;
      }
    }
    return null;
  }

  async findActiveById(accountId: number): Promise<VerifiedAccount | null> {
    const entry = this.accounts.get(accountId);
    return entry && entry.active ? entry.verified : null;
  }
}

// El "token" es la identidad en JSON: alcanza para ver qué se emitió
class FakeAccessTokens extends AccessTokenIssuer {
  async issue(account: AuthenticatedAccount): Promise<string> {
    return JSON.stringify(account);
  }

  async verify(token: string): Promise<AuthenticatedAccount | null> {
    return JSON.parse(token) as AuthenticatedAccount;
  }
}

class FixedPolicies extends SessionPolicies {
  forRole(role: AuthenticatedAccount['role']): SessionPolicy {
    return role === 'CUSTOMER' ? CUSTOMER_POLICY : EMPLOYEE_POLICY;
  }
}

const ANA: AuthenticatedAccount = { accountId: 1, role: 'CASHIER', employeeId: 10 };
const LUCIA: AuthenticatedAccount = { accountId: 2, role: 'CUSTOMER', customerId: 20 };

async function unauthorizedCode(promise: Promise<unknown>): Promise<unknown> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(UnauthorizedException);
  return ((error as UnauthorizedException).getResponse() as { code: unknown }).code;
}

describe('AuthService', () => {
  let sessions: InMemorySessions;
  let credentials: FakeCredentials;
  let refreshTokens: CryptoRefreshTokenGenerator;
  let service: AuthService;

  beforeEach(() => {
    sessions = new InMemorySessions();
    credentials = new FakeCredentials();
    refreshTokens = new CryptoRefreshTokenGenerator();
    service = new AuthService(credentials, sessions, new FakeAccessTokens(), refreshTokens, new FixedPolicies());

    // Ana es empleada: accounts conoce su nombre. Lucía es clienta: hoy no viene.
    credentials.add(ANA, 'ana.gomez@vitto.club', 'secreta-de-ana', { firstName: 'Ana', lastName: 'Gómez' });
    credentials.add(LUCIA, 'lucia@example.com', 'secreta-de-lucia');
  });

  describe('login', () => {
    it('devuelve los dos tokens, la fecha tope y la identidad con el email y el nombre', async () => {
      const result = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');

      // El nombre NO va dentro del access token: solo la identidad
      expect(JSON.parse(result.accessToken)).toEqual(ANA);
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user).toEqual({
        ...ANA,
        email: 'ana.gomez@vitto.club',
        firstName: 'Ana',
        lastName: 'Gómez',
      });
      expect(result.refreshTokenExpiresAt).toEqual(sessions.rows[0].getAbsoluteExpiresAt());
    });

    it('si accounts no conoce el nombre (clientes), la respuesta no lo trae', async () => {
      const result = await service.login('lucia@example.com', 'secreta-de-lucia');

      expect(result.user).toEqual({ ...LUCIA, email: 'lucia@example.com' });
      expect(result.user).not.toHaveProperty('firstName');
      expect(result.user).not.toHaveProperty('lastName');
    });

    it('guarda el hash del refresh token, nunca el token', async () => {
      const result = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');

      expect(sessions.rows).toHaveLength(1);
      expect(sessions.rows[0].getTokenHash()).toBe(refreshTokens.hash(result.refreshToken));
      expect(sessions.rows[0].getTokenHash()).not.toBe(result.refreshToken);
    });

    it('un empleado recibe los plazos de empleado', async () => {
      await service.login('ana.gomez@vitto.club', 'secreta-de-ana');

      const session = sessions.rows[0];
      const start = session.getCreatedAt().getTime();
      expect(session.getExpiresAt().getTime() - start).toBe(30 * MINUTE);
      expect(session.getAbsoluteExpiresAt().getTime() - start).toBe(12 * HOUR);
    });

    it('un cliente recibe los plazos de cliente', async () => {
      await service.login('lucia@example.com', 'secreta-de-lucia');

      const session = sessions.rows[0];
      const start = session.getCreatedAt().getTime();
      expect(session.getExpiresAt().getTime() - start).toBe(7 * DAY);
      expect(session.getAbsoluteExpiresAt().getTime() - start).toBe(30 * DAY);
    });

    it('con contraseña incorrecta o email inexistente responde el mismo error y no guarda sesión', async () => {
      const wrongPassword = service.login('ana.gomez@vitto.club', 'otra');
      const unknownEmail = service.login('nadie@vitto.club', 'secreta-de-ana');

      expect(await unauthorizedCode(wrongPassword)).toBe(INVALID_CREDENTIALS);
      expect(await unauthorizedCode(unknownEmail)).toBe(INVALID_CREDENTIALS);
      expect(sessions.rows).toHaveLength(0);
    });

    it('una cuenta dada de baja recibe exactamente el mismo error', async () => {
      credentials.deactivate(ANA.accountId);

      const error = await service.login('ana.gomez@vitto.club', 'secreta-de-ana').catch((e: unknown) => e);

      expect((error as UnauthorizedException).getResponse()).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Los datos de acceso son incorrectos',
        code: INVALID_CREDENTIALS,
      });
    });
  });

  describe('refresh', () => {
    it('devuelve lo mismo que el login, con tokens nuevos', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');

      const refreshed = await service.refresh(login.refreshToken);

      expect(refreshed.user).toEqual(login.user);
      // Al recargar la página el front solo tiene la renovación: tiene que traer el nombre
      expect(refreshed.user).toMatchObject({ firstName: 'Ana', lastName: 'Gómez' });
      expect(refreshed.refreshTokenExpiresAt).toEqual(login.refreshTokenExpiresAt);
      expect(JSON.parse(refreshed.accessToken)).toEqual(ANA);
      expect(refreshed.refreshToken).not.toBe(login.refreshToken);
    });

    it('el refresh token anterior deja de servir y el nuevo sirve', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      const refreshed = await service.refresh(login.refreshToken);

      expect(await unauthorizedCode(service.refresh(login.refreshToken))).toBe(INVALID_SESSION);
      await expect(service.refresh(refreshed.refreshToken)).resolves.toBeDefined();
    });

    it('no crea otra sesión: renueva la misma', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');

      await service.refresh(login.refreshToken);

      expect(sessions.rows).toHaveLength(1);
    });

    it('corre el vencimiento por inactividad', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      // A la sesión le queda un minuto
      sessions.patch(0, { expiresAt: new Date(Date.now() + 1 * MINUTE) });

      await service.refresh(login.refreshToken);

      expect(sessions.rows[0].getExpiresAt().getTime()).toBeGreaterThan(Date.now() + 29 * MINUTE);
    });

    it('emite el access token con el rol actual de la cuenta', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      credentials.changeRole(ANA.accountId, 'ADMIN');

      const refreshed = await service.refresh(login.refreshToken);

      expect(JSON.parse(refreshed.accessToken).role).toBe('ADMIN');
      expect(refreshed.user.role).toBe('ADMIN');
    });

    it('falla sin token', async () => {
      expect(await unauthorizedCode(service.refresh(undefined))).toBe(INVALID_SESSION);
    });

    it('falla con un token desconocido', async () => {
      expect(await unauthorizedCode(service.refresh('no-existe'))).toBe(INVALID_SESSION);
    });

    it('falla si la sesión venció por inactividad', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      sessions.patch(0, { expiresAt: new Date(Date.now() - 1 * MINUTE) });

      expect(await unauthorizedCode(service.refresh(login.refreshToken))).toBe(INVALID_SESSION);
    });

    it('falla si la sesión pasó el tope máximo, aunque siga activa', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      sessions.patch(0, {
        expiresAt: new Date(Date.now() + 10 * MINUTE),
        absoluteExpiresAt: new Date(Date.now() - 1 * MINUTE),
      });

      expect(await unauthorizedCode(service.refresh(login.refreshToken))).toBe(INVALID_SESSION);
    });

    it('falla si la sesión fue revocada', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      sessions.patch(0, { revokedAt: new Date() });

      expect(await unauthorizedCode(service.refresh(login.refreshToken))).toBe(INVALID_SESSION);
    });

    it('falla si la cuenta fue dada de baja', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      credentials.deactivate(ANA.accountId);

      expect(await unauthorizedCode(service.refresh(login.refreshToken))).toBe(INVALID_SESSION);
    });

    it('falla si otra pestaña renovó primero con el mismo token', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      jest.spyOn(sessions, 'saveRotation').mockResolvedValueOnce(false);

      expect(await unauthorizedCode(service.refresh(login.refreshToken))).toBe(INVALID_SESSION);
    });
  });

  describe('logout', () => {
    it('revoca la sesión, y después no se puede renovar', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');

      await service.logout(login.refreshToken);

      expect(sessions.rows[0].getRevokedAt()).not.toBeNull();
      expect(await unauthorizedCode(service.refresh(login.refreshToken))).toBe(INVALID_SESSION);
    });

    it('no da error sin token, con un token desconocido ni al repetirlo', async () => {
      const login = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');

      await expect(service.logout(undefined)).resolves.toBeUndefined();
      await expect(service.logout('no-existe')).resolves.toBeUndefined();
      await expect(service.logout(login.refreshToken)).resolves.toBeUndefined();
      await expect(service.logout(login.refreshToken)).resolves.toBeUndefined();
    });

    it('cierra solo esa sesión: otra de la misma cuenta sigue vigente', async () => {
      const cashRegister = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      const phone = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');

      await service.logout(cashRegister.refreshToken);

      await expect(service.refresh(phone.refreshToken)).resolves.toBeDefined();
    });
  });

  describe('revokeAllSessionsOfAccount', () => {
    it('revoca todas las sesiones de esa cuenta y no las de otra', async () => {
      const ana1 = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      const ana2 = await service.login('ana.gomez@vitto.club', 'secreta-de-ana');
      const lucia = await service.login('lucia@example.com', 'secreta-de-lucia');

      await service.revokeAllSessionsOfAccount(ANA.accountId);

      expect(await unauthorizedCode(service.refresh(ana1.refreshToken))).toBe(INVALID_SESSION);
      expect(await unauthorizedCode(service.refresh(ana2.refreshToken))).toBe(INVALID_SESSION);
      await expect(service.refresh(lucia.refreshToken)).resolves.toBeDefined();
    });
  });
});
