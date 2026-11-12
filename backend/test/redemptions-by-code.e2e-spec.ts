import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { deletePointsMovements } from './delete-points-movements.js';
import { REDEMPTION_DURATION_MS } from '../src/redemptions/domain/redemption.js';

// US-44: el barrido no corre durante los e2e (ver la nota en test/redemptions-expiration.e2e-spec.ts)
process.env.REDEMPTIONS_EXPIRATION_CRON_ENABLED = 'false';

const MINUTE = 60_000;

// Cubre US-41 (contrato S4 §3.8.1, §3.6.1 y §3.11) contra Postgres real. Los canjes se insertan
// directo en la base, respetando los CHECK de BASE-4.
describe('Canjes por código (e2e, US-41)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lastAuditId = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    // Mismo mecanismo que redemptions-query.e2e-spec.ts: el token se arma con los headers de test
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
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
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
    await prisma.customerStatusChange.deleteMany();
    await prisma.customer.deleteMany();
  }

  const newAudits = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  async function seed() {
    const employee = await prisma.employee.create({
      data: { firstName: 'Bruno', lastName: 'Pérez', phone: '3510000000', email: 'cajero@vitto.club', role: 'CASHIER', isActive: true },
    });
    const cashier = await prisma.account.create({
      data: { email: 'cajero@vitto.club', passwordHash: 'hashed:x', role: 'CASHIER', isActive: true, employeeId: employee.id },
    });
    const adminEmployee = await prisma.employee.create({
      data: { firstName: 'Ana', lastName: 'Gómez', phone: '3510000001', email: 'admin@vitto.club', role: 'ADMIN', isActive: true },
    });
    const admin = await prisma.account.create({
      data: { email: 'admin@vitto.club', passwordHash: 'hashed:x', role: 'ADMIN', isActive: true, employeeId: adminEmployee.id },
    });
    const carolina = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'PASSPORT', documentNumber: 'AB123456', email: 'carolina@example.com' },
    });
    const cafe = await prisma.reward.create({ data: { name: 'Café + medialuna', points: 150, stock: 5 } });

    const redemption = (code: string, createdAgo: number, extra: Record<string, unknown> = {}) => {
      const createdAt = new Date(Date.now() - createdAgo);
      return {
        code,
        customerId: carolina.id,
        rewardId: cafe.id,
        rewardName: cafe.name,
        points: cafe.points,
        origin: 'APP' as const,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + REDEMPTION_DURATION_MS),
        ...extra,
      };
    };
    const resolvedAt = new Date(Date.now() - MINUTE);
    await prisma.redemption.createMany({
      data: [
        redemption('K7MP2X', 2 * MINUTE),
        redemption('VVVVVV', 20 * MINUTE),
        redemption('UUUUUU', 30 * MINUTE, {
          status: 'USED',
          resolvedAt,
          resolvedByAccountId: cashier.id,
          resolvedByName: 'Bruno Pérez',
          balanceBefore: 900,
          balanceAfter: 750,
        }),
        redemption('XXXXXX', 30 * MINUTE, { status: 'CANCELLED', resolvedAt }),
        redemption('RRRRRR', 30 * MINUTE, {
          status: 'REJECTED',
          resolvedAt,
          resolvedByAccountId: cashier.id,
          resolvedByName: 'Bruno Pérez',
          rejectionReason: 'Sin insumo',
        }),
        redemption('EEEEEE', 40 * MINUTE, {
          status: 'EXPIRED',
          resolvedAt: new Date(Date.now() - 25 * MINUTE),
          resolvedByName: 'Sistema',
        }),
      ],
    });
    return { employee, cashier, adminEmployee, admin, carolina, cafe };
  }

  type Seed = Awaited<ReturnType<typeof seed>>;

  const cashierHeaders = (s: Seed) => ({
    'x-test-auth-role': 'CASHIER',
    'x-test-account-id': String(s.cashier.id),
    'x-test-employee-id': String(s.employee.id),
  });
  const adminHeaders = (s: Seed) => ({
    'x-test-auth-role': 'ADMIN',
    'x-test-account-id': String(s.admin.id),
    'x-test-employee-id': String(s.adminEmployee.id),
  });
  const get = (path: string, headers: Record<string, string> = {}) =>
    request(app.getHttpServer()).get(`/api/canjes/${encodeURIComponent(path)}`).set(headers);

  describe('buscar (CA-41.1)', () => {
    it('devuelve el canje completo con el cliente y su tipo de documento reales', async () => {
      const s = await seed();

      const res = await get('K7MP2X', cashierHeaders(s)).expect(200);

      expect(res.body).toMatchObject({
        code: 'K7MP2X',
        status: 'CONFIRMED',
        reward: { id: s.cafe.id, name: 'Café + medialuna', points: 150 },
        customer: {
          id: s.carolina.id,
          firstName: 'Carolina',
          lastName: 'Fernández',
          documentType: 'PASSPORT',
          documentNumber: 'AB123456',
        },
        origin: 'APP',
        resolvedAt: null,
      });
      expect(typeof res.body.expiresAt).toBe('string');
    });

    it.each(['k7mp2x', ' k7mp 2x ', 'k7-mp-2x', 'K7MP-2X'])('normaliza "%s" a K7MP2X', async (typed) => {
      const s = await seed();

      const res = await get(typed, cashierHeaders(s)).expect(200);

      expect(res.body.code).toBe('K7MP2X');
    });

    it('el Administrador también puede buscar', async () => {
      const s = await seed();

      await get('K7MP2X', adminHeaders(s)).expect(200);
    });

    it('no audita una consulta de un canje vigente', async () => {
      const s = await seed();

      await get('K7MP2X', cashierHeaders(s)).expect(200);

      expect(await newAudits()).toHaveLength(0);
    });
  });

  describe('no existe o mal escrito (CA-41.2)', () => {
    it.each(['ZZZZZZ', 'K7MP2', 'K7MP2XX', 'K0MP2X', 'K7OP2X', 'K1MP2X', 'KIMP2X', '------'])(
      '"%s" responde 404 "Código no encontrado."',
      async (typed) => {
        const s = await seed();

        const res = await get(typed, cashierHeaders(s)).expect(404);

        expect(res.body.message).toBe('Código no encontrado.');
      },
    );
  });

  describe('cada estado (CA-41.5)', () => {
    it.each([
      ['UUUUUU', 'USED'],
      ['XXXXXX', 'CANCELLED'],
      ['RRRRRR', 'REJECTED'],
      ['EEEEEE', 'EXPIRED'],
    ])('%s devuelve 200 con el estado %s', async (code, status) => {
      const s = await seed();

      const res = await get(code, cashierHeaders(s)).expect(200);

      expect(res.body.status).toBe(status);
      expect(res.body.resolvedAt).not.toBeNull();
    });

    it('el Utilizado trae el saldo antes y después; el Rechazado, el motivo', async () => {
      const s = await seed();

      const used = await get('UUUUUU', cashierHeaders(s)).expect(200);
      const rejected = await get('RRRRRR', cashierHeaders(s)).expect(200);

      expect(used.body).toMatchObject({ balanceBefore: 900, balanceAfter: 750 });
      expect(rejected.body.rejectionReason).toBe('Sin insumo');
    });
  });

  describe('vencido al leer (CA-41.4)', () => {
    it('pasa a EXPIRED antes de responder y audita REDEMPTION_EXPIRED con actor Sistema', async () => {
      const s = await seed();

      const res = await get('VVVVVV', cashierHeaders(s)).expect(200);

      expect(res.body.status).toBe('EXPIRED');
      expect(res.body.resolvedAt).toBe(res.body.expiresAt);
      const stored = await prisma.redemption.findUniqueOrThrow({ where: { code: 'VVVVVV' } });
      expect(stored.status).toBe('EXPIRED');
      const audits = await newAudits();
      expect(audits).toHaveLength(1);
      expect(audits[0].actionCode).toBe('REDEMPTION_EXPIRED');
    });

    it('leerlo dos veces no duplica la auditoría', async () => {
      const s = await seed();

      await get('VVVVVV', cashierHeaders(s)).expect(200);
      await get('VVVVVV', cashierHeaders(s)).expect(200);

      expect(await newAudits()).toHaveLength(1);
    });
  });

  describe('permisos (CA-41.7)', () => {
    it('el Cliente recibe 403', async () => {
      const s = await seed();

      await get('K7MP2X', {
        'x-test-auth-role': 'CUSTOMER',
        'x-test-customer-id': String(s.carolina.id),
      }).expect(403);
    });

    it('sin token recibe 401', async () => {
      await seed();

      await get('K7MP2X').expect(401);
    });
  });
});
