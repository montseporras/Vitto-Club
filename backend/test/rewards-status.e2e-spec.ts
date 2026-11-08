import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuditService } from '../src/audit/application/audit.service.js';
import type { AuditEntryInput } from '../src/audit/domain/audit-entry.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { toArgentinaDateString } from '../src/shared/time/argentina-date.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

// Días en hora de Argentina, YYYY-MM-DD, como los guarda una columna DATE
const argentinaDay = (offsetDays: number) => toArgentinaDateString(new Date(Date.now() + offsetDays * DAY_MS));
const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);

// Cubre US-36 (contrato S4 §3.2.5, §3.2.6, §3.10.4 y la auditoría REWARD_ACTIVATED, REWARD_DEACTIVATED y
// REDEMPTION_REJECTED de §3.14.2) contra Postgres real. El rechazo de los canjes lo hace redemptions
// (US-43) al escuchar reward.deactivated.
describe('Activar y desactivar recompensas (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auditService: AuditService;
  // La auditoría es solo inserción: no se borra, se mira desde el último id
  let lastAuditId = 0;
  let admin: Staff;
  let cashier: Staff;

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
    auditService = app.get(AuditService);
  });

  // Limpia al terminar: los canjes referencian clientes y recompensas (onDelete Restrict), y las
  // suites que corren después borran clientes y cuentas sin saber de canjes.
  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await cleanDatabase();
    admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Valeria', 'Vitto');
    cashier = await seedEmployee('cajero@vitto.club', 'CASHIER', 'Bruno', 'Pérez');
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  async function cleanDatabase() {
    await prisma.pointsMovement.deleteMany();
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
  }

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  async function seedEmployee(email: string, role: 'ADMIN' | 'CASHIER', firstName: string, lastName: string) {
    const employee = await prisma.employee.create({
      data: { firstName, lastName, phone: '3510000000', email, role, isActive: true },
    });
    const account = await prisma.account.create({
      data: { email, passwordHash: 'hashed:secreta123', role, isActive: true, employeeId: employee.id },
    });
    return { employee, account };
  }

  type Staff = Awaited<ReturnType<typeof seedEmployee>>;

  const staffHeaders = (role: 'ADMIN' | 'CASHIER', staff: Staff) => ({
    'x-test-auth-role': role,
    'x-test-account-id': String(staff.account.id),
    'x-test-employee-id': String(staff.employee.id),
  });

  const customerHeaders = { 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '999', 'x-test-customer-id': '1' };

  const action = (id: number, verb: 'activar' | 'desactivar') =>
    request(app.getHttpServer()).patch(`/api/recompensas/${id}/${verb}`).set(staffHeaders('ADMIN', admin));

  // Una Activa de 150 pts, stock 20, que vence en 30 días
  async function seedReward(data: Partial<Prisma.RewardUncheckedCreateInput> = {}) {
    return await prisma.reward.create({
      data: { name: 'Café + medialuna', points: 150, stock: 20, expiresAt: dateOnly(argentinaDay(30)), ...data },
    });
  }

  // Canjes CONFIRMED de una recompensa, confirmados hace `minutesAgo` minutos (15 o más = vencido)
  async function seedConfirmed(reward: { id: number; name: string; points: number }, codes: string[], minutesAgo = 1) {
    const customer =
      (await prisma.customer.findFirst({ where: { documentNumber: '38456001' } })) ??
      (await prisma.customer.create({
        data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
      }));
    const createdAt = new Date(Date.now() - minutesAgo * MINUTE_MS);
    for (const code of codes) {
      await prisma.redemption.create({
        data: {
          code,
          customerId: customer.id,
          rewardId: reward.id,
          rewardName: reward.name,
          points: reward.points,
          origin: 'APP',
          createdAt,
          expiresAt: new Date(createdAt.getTime() + 15 * MINUTE_MS),
        },
      });
    }
  }

  describe('PATCH /api/recompensas/:id/desactivar', () => {
    it('CA-36.1: Activa sin confirmados → INACTIVE, "Estado: Activa → Inactiva", rejectedRedemptions 0', async () => {
      const reward = await seedReward();

      const res = await action(reward.id, 'desactivar').expect(200);

      expect(res.body).toEqual({
        reward: expect.objectContaining({ id: reward.id, status: 'INACTIVE', disabledReason: null, confirmedCount: 0 }),
        rejectedRedemptions: 0,
      });
      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: admin.account.id,
        performedBy: 'Valeria Vitto',
        module: 'REWARDS',
        actionCode: 'REWARD_DEACTIVATED',
        description: 'Desactivó la recompensa "Café + medialuna"',
        details: [{ label: 'Estado', value: 'Activa → Inactiva' }],
      });
    });

    it('CA-36.2: con 2 confirmados → los rechaza como Sistema, 2 REDEMPTION_REJECTED y "Canjes rechazados: 2"', async () => {
      const reward = await seedReward();
      await seedConfirmed(reward, ['AAAAAA', 'BBBBBB']);

      const res = await action(reward.id, 'desactivar').expect(200);

      expect(res.body).toMatchObject({ reward: { status: 'INACTIVE', confirmedCount: 0 }, rejectedRedemptions: 2 });

      const redemptions = await prisma.redemption.findMany({ orderBy: { code: 'asc' } });
      for (const redemption of redemptions) {
        expect(redemption).toMatchObject({
          status: 'REJECTED',
          rejectionReason: 'Recompensa desactivada',
          resolvedByAccountId: null,
          resolvedByName: 'Sistema',
        });
        expect(redemption.resolvedAt).toBeInstanceOf(Date);
      }

      const rows = await newAuditRows();
      expect(rows.map((row) => [row.actionCode, row.actorType])).toEqual([
        ['REDEMPTION_REJECTED', 'SYSTEM'],
        ['REDEMPTION_REJECTED', 'SYSTEM'],
        ['REWARD_DEACTIVATED', 'EMPLOYEE'],
      ]);
      expect(rows[0]).toMatchObject({
        operationCode: 'AAAAAA',
        performedBy: 'Sistema',
        details: [
          { label: 'Código del canje', value: 'AAAAAA' },
          { label: 'Recompensa', value: 'Café + medialuna' },
          { label: 'Motivo', value: 'Recompensa desactivada' },
        ],
      });
      expect(rows[2].details).toEqual([
        { label: 'Estado', value: 'Activa → Inactiva' },
        { label: 'Canjes rechazados', value: '2' },
      ]);
    });

    it('un confirmado ya vencido que el barrido no marcó se vence, no se rechaza ni se cuenta', async () => {
      const reward = await seedReward();
      await seedConfirmed(reward, ['AAAAAA']);
      await seedConfirmed(reward, ['CCCCCC'], 20);

      const res = await action(reward.id, 'desactivar').expect(200);

      expect(res.body.rejectedRedemptions).toBe(1);
      expect((await prisma.redemption.findUniqueOrThrow({ where: { code: 'CCCCCC' } })).status).toBe('EXPIRED');
      expect((await prisma.redemption.findUniqueOrThrow({ where: { code: 'AAAAAA' } })).status).toBe('REJECTED');
    });

    it('canjes de otra recompensa o ya resueltos no se tocan', async () => {
      const reward = await seedReward();
      const other = await seedReward({ name: 'Licuado' });
      await seedConfirmed(other, ['DDDDDD']);

      await action(reward.id, 'desactivar').expect(200);

      expect((await prisma.redemption.findUniqueOrThrow({ where: { code: 'DDDDDD' } })).status).toBe('CONFIRMED');
    });

    it('CA-36.3: desde Deshabilitada → INACTIVE, pierde el motivo, "Estado: Deshabilitada → Inactiva"', async () => {
      const reward = await seedReward({ stock: 0, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' });

      const res = await action(reward.id, 'desactivar').expect(200);

      expect(res.body.reward).toMatchObject({ status: 'INACTIVE', disabledReason: null });
      const [row] = await newAuditRows();
      expect(row.details).toEqual([{ label: 'Estado', value: 'Deshabilitada → Inactiva' }]);
    });

    it('CA-36.8 (parte back): una Inactiva no figura entre las Activas del listado', async () => {
      const reward = await seedReward();
      await action(reward.id, 'desactivar').expect(200);

      const list = await request(app.getHttpServer())
        .get('/api/recompensas')
        .query({ status: 'ACTIVE' })
        .set(staffHeaders('ADMIN', admin))
        .expect(200);
      expect(list.body.items).toEqual([]);
    });

    it('rollback: si falla la auditoría, la recompensa y los canjes quedan como estaban', async () => {
      const reward = await seedReward();
      await seedConfirmed(reward, ['AAAAAA', 'BBBBBB']);
      const record = auditService.record.bind(auditService);
      jest.spyOn(auditService, 'record').mockImplementation(async (entry: AuditEntryInput) => {
        if (entry.action === 'REWARD_DEACTIVATED') throw new Error('audit down');
        await record(entry);
      });

      await action(reward.id, 'desactivar').expect(500);

      expect((await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } })).status).toBe('ACTIVE');
      const statuses = (await prisma.redemption.findMany()).map((redemption) => redemption.status);
      expect(statuses).toEqual(['CONFIRMED', 'CONFIRMED']);
      expect(await newAuditRows()).toHaveLength(0);
    });
  });

  describe('PATCH /api/recompensas/:id/activar', () => {
    it('CA-36.4: Inactiva con stock y sin vencer → ACTIVE, "Estado: Inactiva → Activa"', async () => {
      const reward = await seedReward({ status: 'INACTIVE' });

      const res = await action(reward.id, 'activar').expect(200);

      expect(res.body).toEqual({
        reward: expect.objectContaining({ id: reward.id, status: 'ACTIVE', disabledReason: null, confirmedCount: 0 }),
      });
      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actionCode: 'REWARD_ACTIVATED',
        description: 'Activó la recompensa "Café + medialuna"',
        details: [{ label: 'Estado', value: 'Inactiva → Activa' }],
      });
    });

    it.each([
      ['stock 0', { stock: 0 }, 'OUT_OF_STOCK'],
      ['vencida', { expiresAt: dateOnly(argentinaDay(-2)) }, 'EXPIRED'],
    ] as const)('CA-36.5: Inactiva con %s → 200, DISABLED con su motivo, "Inactiva → Deshabilitada"', async (_case, data, reason) => {
      const reward = await seedReward({ status: 'INACTIVE', ...data });

      const res = await action(reward.id, 'activar').expect(200);

      expect(res.body.reward).toMatchObject({ status: 'DISABLED', disabledReason: reason });
      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual(['REWARD_ACTIVATED']);
      expect(rows[0].details).toEqual([{ label: 'Estado', value: 'Inactiva → Deshabilitada' }]);
    });
  });

  describe('CA-36.6: transiciones inválidas → 409 INVALID_REWARD_STATUS', () => {
    it.each([
      ['activar una Activa', { status: 'ACTIVE' }, 'activar', 'La recompensa no está inactiva.'],
      ['activar una Deshabilitada', { status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 0 }, 'activar', 'La recompensa no está inactiva.'],
      ['desactivar una Inactiva', { status: 'INACTIVE' }, 'desactivar', 'La recompensa ya está inactiva.'],
    ] as const)('%s', async (_case, data, verb, message) => {
      const reward = await seedReward(data);

      const res = await action(reward.id, verb).expect(409);

      expect(res.body).toMatchObject({ code: 'INVALID_REWARD_STATUS', message });
      expect((await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } })).status).toBe(data.status);
      expect(await newAuditRows()).toHaveLength(0);
    });
  });

  it.each(['activar', 'desactivar'] as const)('%s una dada de baja o inexistente → 404 "No existe la recompensa."', async (verb) => {
    const deleted = await seedReward({ status: 'DELETED', deletedAt: new Date() });

    for (const id of [deleted.id, 999999]) {
      const res = await action(id, verb).expect(404);
      expect(res.body.message).toBe('No existe la recompensa.');
    }
    expect(await newAuditRows()).toHaveLength(0);
  });

  describe('CA-36.9: permisos', () => {
    it.each(['activar', 'desactivar'] as const)('%s: Cajero → 403, Cliente → 403, sin token → 401', async (verb) => {
      const reward = await seedReward({ status: verb === 'activar' ? 'INACTIVE' : 'ACTIVE' });
      const call = () => request(app.getHttpServer()).patch(`/api/recompensas/${reward.id}/${verb}`);

      await call().set(staffHeaders('CASHIER', cashier)).expect(403);
      await call().set(customerHeaders).expect(403);
      await call().expect(401);

      expect((await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } })).status).toBe(
        verb === 'activar' ? 'INACTIVE' : 'ACTIVE',
      );
      expect(await newAuditRows()).toHaveLength(0);
    });
  });
});
