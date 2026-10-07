import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/auth/application/auth.service.js';
import { ACCOUNT_DEACTIVATED } from '../src/shared/events/domain-events.js';
import { Session } from '../src/auth/domain/session.js';
import { SessionRepository } from '../src/auth/domain/port/session.repository.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import { SessionPolicies } from '../src/auth/domain/port/session-policies.js';
import { TransactionRunner } from '../src/auth/domain/port/transaction-runner.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const INACTIVITY = 30 * MINUTE;
const ABSOLUTE = 12 * HOUR;

const T0 = new Date('2026-10-05T12:00:00.000Z');
const after = (ms: number) => new Date(T0.getTime() + ms);

// Cubre el repositorio de sesiones contra la base real y que AuthModule liga cada puerto
// con su implementación. Corre contra la base de tests.
describe('Sesiones de auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sessions: SessionRepository;
  let accountId: number;

  // Una sesión necesita una cuenta, y una cuenta de empleado necesita un empleado
  const createAccount = async (email: string): Promise<number> => {
    const employee = await prisma.employee.create({
      data: { firstName: 'Test', lastName: 'Auth', phone: '3510000000', email, role: 'CASHIER' },
    });
    const account = await prisma.account.create({
      data: { email, passwordHash: 'x', role: 'CASHIER', employeeId: employee.id },
    });
    return account.id;
  };

  const startSession = (tokenHash: string, forAccountId = accountId) =>
    Session.start({
      accountId: forAccountId,
      tokenHash,
      now: T0,
      inactivityMs: INACTIVITY,
      absoluteMs: ABSOLUTE,
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    sessions = app.get(SessionRepository);
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    accountId = await createAccount('a@test.com');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('repositorio', () => {
    it('guarda una sesión y la recupera por el hash de su token', async () => {
      const saved = await sessions.save(startSession('hash-1'));

      const found = await sessions.findByTokenHash('hash-1');

      expect(saved.getId()).not.toBeNull();
      expect(found?.getId()).toBe(saved.getId());
      expect(found?.getAccountId()).toBe(accountId);
      expect(found?.getExpiresAt()).toEqual(after(INACTIVITY));
      expect(found?.getAbsoluteExpiresAt()).toEqual(after(ABSOLUTE));
      expect(found?.getRevokedAt()).toBeNull();
    });

    it('devuelve null si ningún token tiene ese hash', async () => {
      expect(await sessions.findByTokenHash('no-existe')).toBeNull();
    });

    it('guarda una renovación: el token anterior deja de servir y el nuevo sirve', async () => {
      const session = await sessions.save(startSession('hash-1'));

      session.rotate('hash-2', after(20 * MINUTE), INACTIVITY);
      const rotated = await sessions.saveRotation(session, 'hash-1');

      expect(rotated).toBe(true);
      expect(await sessions.findByTokenHash('hash-1')).toBeNull();
      const found = await sessions.findByTokenHash('hash-2');
      expect(found?.getExpiresAt()).toEqual(after(50 * MINUTE));
    });

    it('dos pestañas renuevan con el mismo token: solo gana la primera', async () => {
      await sessions.save(startSession('hash-1'));
      // Cada pestaña lee la sesión antes de que la otra la renueve
      const tabA = (await sessions.findByTokenHash('hash-1'))!;
      const tabB = (await sessions.findByTokenHash('hash-1'))!;

      tabA.rotate('hash-a', after(20 * MINUTE), INACTIVITY);
      tabB.rotate('hash-b', after(20 * MINUTE), INACTIVITY);
      const first = await sessions.saveRotation(tabA, 'hash-1');
      const second = await sessions.saveRotation(tabB, 'hash-1');

      expect(first).toBe(true);
      expect(second).toBe(false);
      expect(await sessions.findByTokenHash('hash-a')).not.toBeNull();
      expect(await sessions.findByTokenHash('hash-b')).toBeNull();
    });

    it('no guarda una renovación sobre una sesión que fue revocada mientras tanto', async () => {
      const session = await sessions.save(startSession('hash-1'));
      await sessions.revokeAllForAccount(accountId, after(5 * MINUTE));

      // La copia en memoria todavía no sabe que fue revocada
      session.rotate('hash-2', after(10 * MINUTE), INACTIVITY);
      const rotated = await sessions.saveRotation(session, 'hash-1');

      expect(rotated).toBe(false);
      expect(await sessions.findByTokenHash('hash-2')).toBeNull();
    });

    it('guarda la revocación de una sesión', async () => {
      const session = await sessions.save(startSession('hash-1'));

      session.revoke(after(5 * MINUTE));
      await sessions.saveRevocation(session);

      const found = await sessions.findByTokenHash('hash-1');
      expect(found?.getRevokedAt()).toEqual(after(5 * MINUTE));
      expect(found?.isUsable(after(6 * MINUTE))).toBe(false);
    });

    it('revoca todas las sesiones vigentes de una cuenta, y solo las de esa cuenta', async () => {
      const otherAccountId = await createAccount('b@test.com');
      await sessions.save(startSession('hash-1'));
      await sessions.save(startSession('hash-2'));
      await sessions.save(startSession('hash-otra', otherAccountId));
      // Una que ya estaba revocada de antes: tiene que conservar su fecha
      const old = await sessions.save(startSession('hash-vieja'));
      old.revoke(after(1 * MINUTE));
      await sessions.saveRevocation(old);

      await sessions.revokeAllForAccount(accountId, after(5 * MINUTE));

      expect((await sessions.findByTokenHash('hash-1'))?.getRevokedAt()).toEqual(after(5 * MINUTE));
      expect((await sessions.findByTokenHash('hash-2'))?.getRevokedAt()).toEqual(after(5 * MINUTE));
      expect((await sessions.findByTokenHash('hash-vieja'))?.getRevokedAt()).toEqual(after(1 * MINUTE));
      expect((await sessions.findByTokenHash('hash-otra'))?.getRevokedAt()).toBeNull();
    });

    it('participa de la transacción: si el caso de uso falla, la sesión no queda guardada', async () => {
      const transactions = app.get(TransactionRunner);

      await expect(
        transactions.run(async () => {
          await sessions.save(startSession('hash-1'));
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(await sessions.findByTokenHash('hash-1')).toBeNull();
    });
  });

  describe('baja de una cuenta', () => {
    it('al publicar account.deactivated se revocan las sesiones de esa cuenta', async () => {
      const otherAccountId = await createAccount('b@test.com');
      await sessions.save(startSession('hash-1'));
      await sessions.save(startSession('hash-otra', otherAccountId));

      await app.get(EventEmitter2).emitAsync(ACCOUNT_DEACTIVATED, { accountId });

      expect((await sessions.findByTokenHash('hash-1'))?.getRevokedAt()).not.toBeNull();
      expect((await sessions.findByTokenHash('hash-otra'))?.getRevokedAt()).toBeNull();
    });

    it('si la operación de quien publica falla, las sesiones no quedan revocadas', async () => {
      await sessions.save(startSession('hash-1'));

      await expect(
        app.get(TransactionRunner).run(async () => {
          await app.get(EventEmitter2).emitAsync(ACCOUNT_DEACTIVATED, { accountId });
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect((await sessions.findByTokenHash('hash-1'))?.getRevokedAt()).toBeNull();
    });
  });

  describe('armado del módulo', () => {
    it('el emisor de access tokens funciona con el secreto y la duración configurados', async () => {
      const issuer = app.get(AccessTokenIssuer);
      const account = { accountId, role: 'CASHIER' as const, employeeId: 1 };

      const token = await issuer.issue(account);

      expect(await issuer.verify(token)).toEqual(account);
    });

    it('los plazos de sesión salen de la configuración según el rol', () => {
      const policies = app.get(SessionPolicies);

      expect(policies.forRole('ADMIN')).toEqual(policies.forRole('CASHIER'));
      expect(policies.forRole('CUSTOMER').absoluteMs).toBeGreaterThan(policies.forRole('ADMIN').absoluteMs);
    });

    it('con el verificador real, una contraseña que no coincide no inicia sesión', async () => {
      // La cuenta de prueba tiene un hash inválido ("x"): no hay contraseña que le sirva
      await expect(app.get(AuthService).login('a@test.com', 'cualquiera1')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
