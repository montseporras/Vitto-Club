import { INestApplication, ValidationPipe } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { deletePointsMovements } from './delete-points-movements.js';
import { PrismaTransactionRunner } from '../src/prisma/prisma-transaction-runner.js';
import { REDEMPTION_DURATION_MS } from '../src/redemptions/domain/redemption.js';
import {
  REWARD_DEACTIVATED,
  REWARD_DELETED,
  type RedemptionsRejectedResult,
} from '../src/shared/events/domain-events.js';

// US-44: el barrido no corre durante los e2e (ver la nota en test/redemptions-expiration.e2e-spec.ts)
process.env.REDEMPTIONS_EXPIRATION_CRON_ENABLED = 'false';

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MINUTE = 60_000;

// Cubre US-43 (contrato S4 §3.10, §3.13.1 y REDEMPTION_REJECTED de §3.14.2) contra Postgres real.
// US-40 (confirmar) no está: los canjes se insertan directo en la base, respetando los CHECK de
// BASE-4. US-36 y US-38 tampoco: reward.deactivated y reward.deleted se publican directo, como lo van
// a hacer esas historias (dentro de su transacción, con emitAsync).
describe('Rechazar y cancelar canjes (e2e, US-43)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let events: EventEmitter2;
  let transactionRunner: PrismaTransactionRunner;
  let lastAuditId = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    // Mismo mecanismo que points-adjustments.e2e-spec.ts: el token se arma con los headers de test
    const issuer = moduleFixture.get(AccessTokenIssuer, { strict: false });
    app.use(async (req: Request, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-auth-role') as AuthRole | undefined;
      if (role) {
        const accountId = Number(req.header('x-test-account-id') ?? 1);
        const employeeIdHeader = req.header('x-test-employee-id');
        const customerIdHeader = req.header('x-test-customer-id');
        const token = await issuer.issue({
          accountId,
          role,
          ...(employeeIdHeader ? { employeeId: Number(employeeIdHeader) } : {}),
          ...(customerIdHeader ? { customerId: Number(customerIdHeader) } : {}),
        });
        req.headers.authorization = `Bearer ${token}`;
      }
      next();
    });

    await app.init();
    prisma = app.get(PrismaService);
    events = app.get(EventEmitter2);
    transactionRunner = app.get(PrismaTransactionRunner);
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await cleanDatabase();
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  async function cleanDatabase() {
    await deletePointsMovements(prisma);
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    // La baja de cliente (§3.13.1) deja su historial de estado
    await prisma.customerStatusChange.deleteMany();
    await prisma.customer.deleteMany();
  }

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  const redemptionOf = (code: string) => prisma.redemption.findUniqueOrThrow({ where: { code } });

  // Escenario:
  // - Bruno (Cajero) y Ana (Administradora).
  // - Carolina (saldo 300, con su cuenta) y Martín, otro cliente.
  // - "Café + medialuna" (stock 5) y "Licuado" (sin límite).
  // - Canjes de Carolina: AAAAAA y BBBBBB Confirmados vigentes de "Café + medialuna"; CCCCCC
  //   Confirmado vigente de "Licuado"; VVVVVV Confirmado pero vencido (sin marcar); UUUUUU Utilizado.
  // - Canje de Martín: MMMMMM Confirmado vigente de "Café + medialuna".
  async function seedScenario() {
    const seedEmployee = async (email: string, role: 'ADMIN' | 'CASHIER', firstName: string, lastName: string) => {
      const employee = await prisma.employee.create({
        data: { firstName, lastName, phone: '3510000000', email, role, isActive: true },
      });
      const account = await prisma.account.create({
        data: { email, passwordHash: 'hashed:secreta123', role, isActive: true, employeeId: employee.id },
      });
      return { employee, account };
    };
    const cashier = await seedEmployee('cajero@vitto.club', 'CASHIER', 'Bruno', 'Pérez');
    const admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Ana', 'Gómez');

    const carolina = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
    });
    await prisma.account.create({
      data: { email: 'carolina@example.com', passwordHash: 'hashed:x', role: 'CUSTOMER', isActive: true, customerId: carolina.id },
    });
    const martin = await prisma.customer.create({
      data: { firstName: 'Martín', lastName: 'Ríos', documentType: 'PASSPORT', documentNumber: 'AB123456', email: 'martin@example.com' },
    });

    await prisma.customerPoints.create({ data: { customerId: carolina.id, balance: 300, debt: 0, lifetimePoints: 500 } });
    await prisma.pointsLot.create({
      data: {
        customerId: carolina.id,
        initialPoints: 300,
        remainingPoints: 300,
        accreditedAt: new Date('2026-06-01T15:00:00.000Z'),
        expiresAt: new Date('2027-06-01T15:00:00.000Z'),
      },
    });

    const cafe = await prisma.reward.create({ data: { name: 'Café + medialuna', points: 150, stock: 5 } });
    const licuado = await prisma.reward.create({ data: { name: 'Licuado', points: 200 } });

    const now = Date.now();
    const confirmed = (code: string, customerId: number, reward: { id: number; name: string; points: number }, createdAgo: number) => {
      const createdAt = new Date(now - createdAgo);
      return {
        code,
        customerId,
        rewardId: reward.id,
        rewardName: reward.name,
        points: reward.points,
        origin: 'APP' as const,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + REDEMPTION_DURATION_MS),
      };
    };
    await prisma.redemption.createMany({
      data: [
        confirmed('AAAAAA', carolina.id, cafe, 2 * MINUTE),
        confirmed('BBBBBB', carolina.id, cafe, 3 * MINUTE),
        confirmed('CCCCCC', carolina.id, licuado, 1 * MINUTE),
        confirmed('VVVVVV', carolina.id, cafe, 20 * MINUTE),
        {
          ...confirmed('UUUUUU', carolina.id, cafe, 40 * MINUTE),
          status: 'USED',
          resolvedAt: new Date(now - 35 * MINUTE),
          resolvedByAccountId: cashier.account.id,
          resolvedByName: 'Bruno Pérez',
          balanceBefore: 450,
          balanceAfter: 300,
        },
        confirmed('MMMMMM', martin.id, cafe, 4 * MINUTE),
      ],
    });

    return { cashier, admin, carolina, martin, cafe, licuado };
  }

  type Scenario = Awaited<ReturnType<typeof seedScenario>>;
  type Staff = Scenario['cashier'];

  const staffHeaders = (role: 'ADMIN' | 'CASHIER', staff: Staff) => ({
    'x-test-auth-role': role,
    'x-test-account-id': String(staff.account.id),
    'x-test-employee-id': String(staff.employee.id),
  });

  const customerHeaders = (customerId: number) => ({
    'x-test-auth-role': 'CUSTOMER',
    'x-test-account-id': '999',
    'x-test-customer-id': String(customerId),
  });

  const reject = (code: string, body: object, headers: Record<string, string>) =>
    request(app.getHttpServer()).patch(`/api/canjes/${code}/rechazar`).set(headers).send(body);

  const cancel = (code: string, headers: Record<string, string>) =>
    request(app.getHttpServer()).patch(`/api/customers/me/canjes/${code}/cancelar`).set(headers).send();

  async function untouchedSnapshot(s: Scenario) {
    return {
      points: await prisma.customerPoints.findUnique({ where: { customerId: s.carolina.id } }),
      lots: await prisma.pointsLot.findMany({ orderBy: { id: 'asc' } }),
      movements: await prisma.pointsMovement.count(),
      rewards: await prisma.reward.findMany({ orderBy: { id: 'asc' }, select: { stock: true, usedCount: true, status: true } }),
    };
  }

  describe('PATCH /api/canjes/:code/rechazar', () => {
    it('CA-43.1: el Cajero rechaza con "Sin insumo": 200 con el canje completo, auditoría y nada más cambia', async () => {
      const s = await seedScenario();
      const before = await untouchedSnapshot(s);

      const res = await reject('aaa-aaa', { reason: '  Sin insumo  ' }, staffHeaders('CASHIER', s.cashier)).expect(200);

      const stored = await redemptionOf('AAAAAA');
      expect(res.body).toEqual({
        redemption: {
          id: stored.id,
          code: 'AAAAAA',
          createdAt: stored.createdAt.toISOString(),
          expiresAt: stored.expiresAt.toISOString(),
          status: 'REJECTED',
          reward: { id: s.cafe.id, name: 'Café + medialuna', points: 150 },
          customer: {
            id: s.carolina.id,
            firstName: 'Carolina',
            lastName: 'Fernández',
            documentType: 'DNI',
            documentNumber: '38456001',
          },
          origin: 'APP',
          confirmedBy: null,
          resolvedAt: expect.stringMatching(ISO_INSTANT),
          resolvedBy: { actorType: 'EMPLOYEE', accountId: s.cashier.account.id, name: 'Bruno Pérez' },
          rejectionReason: 'Sin insumo',
          balanceBefore: null,
          balanceAfter: null,
        },
      });
      expect(stored).toMatchObject({
        status: 'REJECTED',
        rejectionReason: 'Sin insumo',
        resolvedByAccountId: s.cashier.account.id,
        resolvedByName: 'Bruno Pérez',
      });
      expect(await untouchedSnapshot(s)).toEqual(before);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: s.cashier.account.id,
        performedBy: 'Bruno Pérez',
        module: 'REDEMPTIONS',
        actionCode: 'REDEMPTION_REJECTED',
        description: 'Rechazó el canje de Carolina Fernández',
        affectedCustomerId: s.carolina.id,
        affectedCustomerName: 'Carolina Fernández',
        documentType: 'DNI',
        documentNumber: '38456001',
        operationCode: 'AAAAAA',
        details: [
          { label: 'Código del canje', value: 'AAAAAA' },
          { label: 'Recompensa', value: 'Café + medialuna' },
          { label: 'Motivo', value: 'Sin insumo' },
        ],
      });
    });

    it.each(['El cliente desistió', 'El cliente no está', 'Se cortó la luz en la cocina'])(
      'CA-43.2: el Administrador rechaza con "%s"',
      async (reason) => {
        const s = await seedScenario();

        const res = await reject('BBBBBB', { reason }, staffHeaders('ADMIN', s.admin)).expect(200);

        expect(res.body.redemption).toMatchObject({
          status: 'REJECTED',
          rejectionReason: reason,
          resolvedBy: { actorType: 'EMPLOYEE', accountId: s.admin.account.id, name: 'Ana Gómez' },
        });
      },
    );

    it.each([
      [{}, 'El motivo es obligatorio.'],
      [{ reason: '' }, 'El motivo es obligatorio.'],
      [{ reason: '    ' }, 'El motivo es obligatorio.'],
      [{ reason: 'Otro' }, 'Indicá un motivo de al menos 5 caracteres.'],
      [{ reason: 'x'.repeat(501) }, 'El motivo no puede superar los 500 caracteres.'],
    ])('CA-43.2: body %p → 400 "%s" y el canje sigue Confirmado', async (body, message) => {
      const s = await seedScenario();

      const res = await reject('AAAAAA', body, staffHeaders('CASHIER', s.cashier)).expect(400);

      expect(res.body.message).toEqual([message]);
      expect((await redemptionOf('AAAAAA')).status).toBe('CONFIRMED');
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('un campo de más en el body → 400', async () => {
      const s = await seedScenario();

      await reject('AAAAAA', { reason: 'Sin insumo', status: 'USED' }, staffHeaders('CASHIER', s.cashier)).expect(400);
    });

    it.each(['ZZZZZZ', 'K7MP2O', 'ABC'])('código %s inexistente o mal escrito → 404 "Código no encontrado." sin code', async (code) => {
      const s = await seedScenario();

      const res = await reject(code, { reason: 'Sin insumo' }, staffHeaders('CASHIER', s.cashier)).expect(404);

      expect(res.body.message).toBe('Código no encontrado.');
      expect(res.body.code).toBeUndefined();
    });

    it('CA-43.3: ya Utilizado → 409 REDEMPTION_NOT_CONFIRMED con el estado', async () => {
      const s = await seedScenario();

      const res = await reject('UUUUUU', { reason: 'Sin insumo' }, staffHeaders('CASHIER', s.cashier)).expect(409);

      expect(res.body).toMatchObject({ code: 'REDEMPTION_NOT_CONFIRMED', message: 'El canje ya está en estado "Utilizado".' });
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('rechazar dos veces el mismo → la segunda da 409 con el estado "Rechazado"', async () => {
      const s = await seedScenario();
      await reject('AAAAAA', { reason: 'Sin insumo' }, staffHeaders('CASHIER', s.cashier)).expect(200);

      const res = await reject('AAAAAA', { reason: 'Sin insumo' }, staffHeaders('ADMIN', s.admin)).expect(409);

      expect(res.body).toMatchObject({ code: 'REDEMPTION_NOT_CONFIRMED', message: 'El canje ya está en estado "Rechazado".' });
      expect(await newAuditRows()).toHaveLength(1);
    });

    it('CA-43.3: vencido → 409 REDEMPTION_EXPIRED y el canje queda EXPIRED, con su auditoría (Sistema)', async () => {
      const s = await seedScenario();

      const res = await reject('VVVVVV', { reason: 'Sin insumo' }, staffHeaders('CASHIER', s.cashier)).expect(409);

      expect(res.body).toMatchObject({
        code: 'REDEMPTION_EXPIRED',
        message: 'El canje venció. El cliente tiene que pedirlo de nuevo.',
      });
      const stored = await redemptionOf('VVVVVV');
      expect(stored).toMatchObject({ status: 'EXPIRED', resolvedByName: 'Sistema', rejectionReason: null });
      expect(stored.resolvedAt).toEqual(stored.expiresAt);
      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual(['REDEMPTION_EXPIRED']);
    });

    it('dos rechazos a la vez no ganan los dos (el canje queda bloqueado mientras se rechaza)', async () => {
      const s = await seedScenario();

      const [first, second] = await Promise.all([
        reject('AAAAAA', { reason: 'Sin insumo' }, staffHeaders('CASHIER', s.cashier)),
        reject('AAAAAA', { reason: 'El cliente desistió' }, staffHeaders('ADMIN', s.admin)),
      ]);

      expect([first.status, second.status].sort()).toEqual([200, 409]);
      expect(await newAuditRows()).toHaveLength(1);
    });
  });

  describe('PATCH /api/customers/me/canjes/:code/cancelar', () => {
    it('CA-43.4: el Cliente cancela el suyo: 200 con su vista, sin auditoría y nada más cambia', async () => {
      const s = await seedScenario();
      const before = await untouchedSnapshot(s);

      const res = await cancel('cccccc', customerHeaders(s.carolina.id)).expect(200);

      const stored = await redemptionOf('CCCCCC');
      expect(res.body).toEqual({
        redemption: {
          id: stored.id,
          code: 'CCCCCC',
          createdAt: stored.createdAt.toISOString(),
          expiresAt: stored.expiresAt.toISOString(),
          status: 'CANCELLED',
          reward: { id: s.licuado.id, name: 'Licuado', points: 200 },
          resolvedAt: expect.stringMatching(ISO_INSTANT),
          rejectionReason: null,
          canCancel: false,
        },
      });
      expect(stored).toMatchObject({ status: 'CANCELLED', resolvedByAccountId: null, resolvedByName: null });
      expect(stored.resolvedAt).not.toBeNull();
      expect(await untouchedSnapshot(s)).toEqual(before);
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('CA-43.5: el de otro cliente → 404 "No existe el canje." y no se toca', async () => {
      const s = await seedScenario();

      const res = await cancel('MMMMMM', customerHeaders(s.carolina.id)).expect(404);

      expect(res.body.message).toBe('No existe el canje.');
      expect(res.body.code).toBeUndefined();
      expect((await redemptionOf('MMMMMM')).status).toBe('CONFIRMED');
    });

    it.each(['ZZZZZZ', 'ABC'])('código %s inexistente o mal escrito → 404 "No existe el canje."', async (code) => {
      const s = await seedScenario();

      const res = await cancel(code, customerHeaders(s.carolina.id)).expect(404);

      expect(res.body.message).toBe('No existe el canje.');
    });

    it('CA-43.6: vencido → 409 REDEMPTION_EXPIRED "El canje ya venció." y queda EXPIRED', async () => {
      const s = await seedScenario();

      const res = await cancel('VVVVVV', customerHeaders(s.carolina.id)).expect(409);

      expect(res.body).toMatchObject({ code: 'REDEMPTION_EXPIRED', message: 'El canje ya venció.' });
      expect((await redemptionOf('VVVVVV')).status).toBe('EXPIRED');
    });

    it('CA-43.6: resuelto → 409 REDEMPTION_NOT_CONFIRMED "El canje ya no se puede cancelar."', async () => {
      const s = await seedScenario();

      const res = await cancel('UUUUUU', customerHeaders(s.carolina.id)).expect(409);

      expect(res.body).toMatchObject({ code: 'REDEMPTION_NOT_CONFIRMED', message: 'El canje ya no se puede cancelar.' });
    });
  });

  describe('CA-43.7: rechazos automáticos (Sistema)', () => {
    async function systemRejectionRows() {
      return (await newAuditRows()).filter((row) => row.actionCode === 'REDEMPTION_REJECTED');
    }

    it.each([
      [REWARD_DEACTIVATED, 'Recompensa desactivada'],
      [REWARD_DELETED, 'Recompensa eliminada'],
    ])('%s rechaza los Confirmados vigentes de la recompensa con "%s"', async (event, reason) => {
      const s = await seedScenario();

      const results = await transactionRunner.run(() => events.emitAsync(event, { rewardId: s.cafe.id }));

      expect(results).toContainEqual({ rejectedRedemptions: 3 } satisfies RedemptionsRejectedResult);
      for (const code of ['AAAAAA', 'BBBBBB', 'MMMMMM']) {
        expect(await redemptionOf(code)).toMatchObject({
          status: 'REJECTED',
          rejectionReason: reason,
          resolvedByAccountId: null,
          resolvedByName: 'Sistema',
        });
      }
      // El de otra recompensa y el Utilizado no se tocan; el vencido se vence, no se rechaza
      expect((await redemptionOf('CCCCCC')).status).toBe('CONFIRMED');
      expect((await redemptionOf('UUUUUU')).status).toBe('USED');
      expect((await redemptionOf('VVVVVV')).status).toBe('EXPIRED');

      const rows = await systemRejectionRows();
      expect(rows).toHaveLength(3);
      expect(rows.every((row) => row.actorType === 'SYSTEM' && row.performedBy === 'Sistema')).toBe(true);
      expect(rows.find((row) => row.operationCode === 'MMMMMM')).toMatchObject({
        description: 'Rechazó el canje de Martín Ríos',
        details: [
          { label: 'Código del canje', value: 'MMMMMM' },
          { label: 'Recompensa', value: 'Café + medialuna' },
          { label: 'Motivo', value: reason },
        ],
      });
    });

    it('un canje rechazado por la recompensa ya no se puede cancelar', async () => {
      const s = await seedScenario();
      await transactionRunner.run(() => events.emitAsync(REWARD_DEACTIVATED, { rewardId: s.cafe.id }));

      await cancel('AAAAAA', customerHeaders(s.carolina.id)).expect(409);
    });

    it('si la operación que dispara el rechazo se deshace, los canjes siguen Confirmados', async () => {
      const s = await seedScenario();

      await expect(
        transactionRunner.run(async () => {
          await events.emitAsync(REWARD_DELETED, { rewardId: s.cafe.id });
          throw new Error('falló la eliminación');
        }),
      ).rejects.toThrow('falló la eliminación');

      expect((await redemptionOf('AAAAAA')).status).toBe('CONFIRMED');
      expect(await systemRejectionRows()).toHaveLength(0);
    });

    it('§3.13.1: dar de baja a Carolina rechaza sus Confirmados y suma "Canjes rechazados: 3"', async () => {
      const s = await seedScenario();

      await request(app.getHttpServer())
        .patch(`/api/customers/${s.carolina.id}/deactivate`)
        .set(staffHeaders('ADMIN', s.admin))
        .expect(204);

      for (const code of ['AAAAAA', 'BBBBBB', 'CCCCCC']) {
        expect(await redemptionOf(code)).toMatchObject({
          status: 'REJECTED',
          rejectionReason: 'Cliente dado de baja',
          resolvedByName: 'Sistema',
        });
      }
      expect((await redemptionOf('VVVVVV')).status).toBe('EXPIRED');
      expect((await redemptionOf('MMMMMM')).status).toBe('CONFIRMED');

      const rows = await newAuditRows();
      expect(rows.filter((row) => row.actionCode === 'REDEMPTION_REJECTED')).toHaveLength(3);
      const deactivated = rows.find((row) => row.actionCode === 'CUSTOMER_DEACTIVATED');
      expect(deactivated?.details).toEqual([
        { label: 'Estado', value: 'Activo → Inactivo' },
        { label: 'Saldo perdido', value: '300 pts' },
        { label: 'Canjes rechazados', value: '3' },
      ]);
    });

    it('§3.13.1: dar de baja a un cliente sin Confirmados no agrega la fila', async () => {
      const s = await seedScenario();
      await prisma.redemption.deleteMany({ where: { customerId: s.martin.id } });

      await request(app.getHttpServer())
        .patch(`/api/customers/${s.martin.id}/deactivate`)
        .set(staffHeaders('ADMIN', s.admin))
        .expect(204);

      const deactivated = (await newAuditRows()).find((row) => row.actionCode === 'CUSTOMER_DEACTIVATED');
      expect(deactivated?.details).toEqual([
        { label: 'Estado', value: 'Activo → Inactivo' },
        { label: 'Saldo perdido', value: '0 pts' },
      ]);
    });
  });

  describe('CA-43.8: permisos', () => {
    it('el Cliente no puede rechazar → 403, sin auditoría', async () => {
      const s = await seedScenario();

      await reject('AAAAAA', { reason: 'Sin insumo' }, customerHeaders(s.carolina.id)).expect(403);

      expect((await redemptionOf('AAAAAA')).status).toBe('CONFIRMED');
      expect(await newAuditRows()).toHaveLength(0);
    });

    it.each(['ADMIN', 'CASHIER'] as const)('el %s no puede usar la ruta de cancelar del Cliente → 403', async (role) => {
      const s = await seedScenario();

      await cancel('AAAAAA', staffHeaders(role, role === 'ADMIN' ? s.admin : s.cashier)).expect(403);

      expect((await redemptionOf('AAAAAA')).status).toBe('CONFIRMED');
    });

    it('sin token → 401 en las dos rutas', async () => {
      await seedScenario();

      await request(app.getHttpServer()).patch('/api/canjes/AAAAAA/rechazar').send({ reason: 'Sin insumo' }).expect(401);
      await request(app.getHttpServer()).patch('/api/customers/me/canjes/AAAAAA/cancelar').send().expect(401);
    });
  });
});
