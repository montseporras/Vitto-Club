import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { deletePointsMovements } from './delete-points-movements.js';
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

// Cubre US-38 (contrato S4 §3.2.7, §3.10.4 y la auditoría REWARD_DELETED y REDEMPTION_REJECTED de
// §3.14.2) contra Postgres real. El rechazo de los canjes lo hace redemptions (US-43) al escuchar
// reward.deleted.
describe('Eliminar recompensas (e2e)', () => {
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
    await deletePointsMovements(prisma);
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

  const asAdmin = () => ({
    get: (path: string) => request(app.getHttpServer()).get(path).set(staffHeaders('ADMIN', admin)),
    patch: (path: string, body: object = {}) =>
      request(app.getHttpServer()).patch(path).set(staffHeaders('ADMIN', admin)).send(body),
    post: (path: string, body: object) => request(app.getHttpServer()).post(path).set(staffHeaders('ADMIN', admin)).send(body),
  });

  const remove = (id: number) => asAdmin().patch(`/api/recompensas/${id}/eliminar`);

  // Una Activa de 1.200 pts, stock 10, que vence en 30 días
  async function seedReward(data: Partial<Prisma.RewardUncheckedCreateInput> = {}) {
    return await prisma.reward.create({
      data: { name: 'Brunch para dos', points: 1200, stock: 10, expiresAt: dateOnly(argentinaDay(30)), ...data },
    });
  }

  // Canjes CONFIRMED de una recompensa, confirmados hace un minuto
  async function seedConfirmed(reward: { id: number; name: string; points: number }, codes: string[]) {
    const customer = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
    });
    const createdAt = new Date(Date.now() - MINUTE_MS);
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
    return customer;
  }

  describe('CA-38.1: eliminar desde cualquier estado menos DELETED', () => {
    it.each([
      ['Activa', {}, 'Activa → Dada de baja'],
      ['Deshabilitada', { stock: 0, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' }, 'Deshabilitada → Dada de baja'],
      ['Inactiva', { status: 'INACTIVE' }, 'Inactiva → Dada de baja'],
    ] as const)('%s → DELETED con deletedAt y sin motivo; REWARD_DELETED "%s"', async (_case, data, value) => {
      const reward = await seedReward(data);

      const res = await remove(reward.id).expect(200);

      expect(res.body).toEqual({ rejectedRedemptions: 0 });
      const saved = await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } });
      expect(saved).toMatchObject({ status: 'DELETED', disabledReason: null });
      expect(saved.deletedAt).toBeInstanceOf(Date);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: admin.account.id,
        performedBy: 'Valeria Vitto',
        module: 'REWARDS',
        actionCode: 'REWARD_DELETED',
        description: 'Eliminó la recompensa "Brunch para dos"',
        details: [{ label: 'Estado', value }],
      });
    });
  });

  it('CA-38.2: con 2 confirmados → rechazados como Sistema con "Recompensa eliminada" y "Canjes rechazados: 2"', async () => {
    const reward = await seedReward();
    await seedConfirmed(reward, ['AAAAAA', 'BBBBBB']);

    const res = await remove(reward.id).expect(200);

    expect(res.body).toEqual({ rejectedRedemptions: 2 });
    for (const redemption of await prisma.redemption.findMany()) {
      expect(redemption).toMatchObject({
        status: 'REJECTED',
        rejectionReason: 'Recompensa eliminada',
        resolvedByAccountId: null,
        resolvedByName: 'Sistema',
      });
    }
    const rows = await newAuditRows();
    expect(rows.map((row) => [row.actionCode, row.actorType])).toEqual([
      ['REDEMPTION_REJECTED', 'SYSTEM'],
      ['REDEMPTION_REJECTED', 'SYSTEM'],
      ['REWARD_DELETED', 'EMPLOYEE'],
    ]);
    expect(rows[0].details).toEqual(
      expect.arrayContaining([{ label: 'Motivo', value: 'Recompensa eliminada' }]),
    );
    expect(rows[2].details).toEqual([
      { label: 'Estado', value: 'Activa → Dada de baja' },
      { label: 'Canjes rechazados', value: '2' },
    ]);
  });

  describe('CA-38.3 y CA-38.7: desaparece', () => {
    it('no figura en GET /recompensas y da 404 en GET, PATCH, activar, desactivar y en eliminar otra vez', async () => {
      const reward = await seedReward();
      await remove(reward.id).expect(200);
      lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;

      const list = await asAdmin().get('/api/recompensas').expect(200);
      expect(list.body).toMatchObject({ items: [], total: 0 });

      // Se arman recién al usarlas: supertest abre y cierra el servidor en cada pedido
      const calls = [
        () => asAdmin().get(`/api/recompensas/${reward.id}`),
        () => asAdmin().patch(`/api/recompensas/${reward.id}`, { points: 100 }),
        () => asAdmin().patch(`/api/recompensas/${reward.id}/activar`),
        () => asAdmin().patch(`/api/recompensas/${reward.id}/desactivar`),
        () => remove(reward.id),
      ];
      for (const call of calls) {
        const res = await call().expect(404);
        expect(res.body.message).toBe('No existe la recompensa.');
      }
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('una que no existe → 404', async () => {
      const res = await remove(999999).expect(404);
      expect(res.body.message).toBe('No existe la recompensa.');
    });
  });

  it('CA-38.4 (parte back): el canje viejo conserva el nombre de la recompensa eliminada', async () => {
    const reward = await seedReward();
    const customer = await seedConfirmed(reward, ['AAAAAA']);
    const usedAt = new Date(Date.now() - DAY_MS);
    await prisma.redemption.create({
      data: {
        code: 'ZZZZZZ',
        customerId: customer.id,
        rewardId: reward.id,
        rewardName: reward.name,
        points: reward.points,
        origin: 'APP',
        status: 'USED',
        createdAt: usedAt,
        expiresAt: new Date(usedAt.getTime() + 15 * MINUTE_MS),
        resolvedAt: new Date(usedAt.getTime() + 5 * MINUTE_MS),
        resolvedByName: 'Bruno Pérez',
        balanceBefore: 2000,
        balanceAfter: 800,
      },
    });

    await remove(reward.id).expect(200);

    const old = await prisma.redemption.findUniqueOrThrow({ where: { code: 'ZZZZZZ' } });
    expect(old).toMatchObject({ status: 'USED', rewardName: 'Brunch para dos', rewardId: reward.id, points: 1200 });
  });

  it('CA-38.5: libera el nombre: se puede crear otra "Brunch para dos"', async () => {
    const reward = await seedReward();
    await remove(reward.id).expect(200);

    const res = await asAdmin()
      .post('/api/recompensas', { name: 'Brunch para dos', points: 1000, stock: null, expiresAt: null })
      .expect(201);
    expect(res.body).toMatchObject({ name: 'Brunch para dos', status: 'ACTIVE' });
  });

  it('rollback: si falla la auditoría, la recompensa y los canjes quedan como estaban', async () => {
    const reward = await seedReward();
    await seedConfirmed(reward, ['AAAAAA']);
    const record = auditService.record.bind(auditService);
    jest.spyOn(auditService, 'record').mockImplementation(async (entry: AuditEntryInput) => {
      if (entry.action === 'REWARD_DELETED') throw new Error('audit down');
      await record(entry);
    });

    await remove(reward.id).expect(500);

    expect(await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } })).toMatchObject({
      status: 'ACTIVE',
      deletedAt: null,
    });
    expect((await prisma.redemption.findUniqueOrThrow({ where: { code: 'AAAAAA' } })).status).toBe('CONFIRMED');
    expect(await newAuditRows()).toHaveLength(0);
  });

  it('CA-38.7: permisos: Cajero → 403, Cliente → 403, sin token → 401', async () => {
    const reward = await seedReward();
    const call = () => request(app.getHttpServer()).patch(`/api/recompensas/${reward.id}/eliminar`);

    await call().set(staffHeaders('CASHIER', cashier)).expect(403);
    await call().set(customerHeaders).expect(403);
    await call().expect(401);

    expect((await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } })).status).toBe('ACTIVE');
    expect(await newAuditRows()).toHaveLength(0);
  });
});
