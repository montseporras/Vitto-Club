import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { toArgentinaDateString } from '../src/shared/time/argentina-date.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Días en hora de Argentina, YYYY-MM-DD, como los guarda una columna DATE
const argentinaDay = (offsetDays: number) => toArgentinaDateString(new Date(Date.now() + offsetDays * DAY_MS));
const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);

// Cubre US-39 (contrato S4 §2.5 y §3.5.1) contra Postgres real: el catálogo del Cliente y su saldo.
describe('Catálogo de recompensas del Cliente (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerId: number;
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
  });

  // Limpia al terminar: los canjes referencian clientes y recompensas (onDelete Restrict), y las
  // suites que corren después borran clientes y cuentas sin saber de canjes.
  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
    // PointsService.resumen (el saldo de /customers/me/puntos) necesita una configuración activa
    await prisma.loyaltyProgramConfiguration.create({
      data: {
        version: 1,
        baseAmount: 1000,
        pointsAwarded: 10,
        silverMinPoints: 300,
        goldMinPoints: 800,
        pointsExpirationMonths: 12,
        isActive: true,
      },
    });
    admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Valeria', 'Vitto');
    cashier = await seedEmployee('cajero@vitto.club', 'CASHIER', 'Bruno', 'Pérez');
    const customer = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
    });
    customerId = customer.id;
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
    await prisma.loyaltyProgramConfiguration.deleteMany();
  }

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

  const customerHeaders = () => ({ 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '999', 'x-test-customer-id': String(customerId) });

  const catalog = (filter?: string) =>
    request(app.getHttpServer())
      .get('/api/customers/me/recompensas')
      .query(filter ? { filter } : {})
      .set(customerHeaders());

  const names = (res: request.Response) => res.body.items.map((item: { name: string }) => item.name);

  async function seedReward(data: Partial<Prisma.RewardUncheckedCreateInput>) {
    return await prisma.reward.create({ data: { name: 'Café', points: 150, stock: 20, ...data } });
  }

  // Activas, Deshabilitadas, Inactivas y dadas de baja mezcladas
  async function seedCatalog() {
    await seedReward({ name: 'Pizza', points: 900, usedCount: 2, expiresAt: dateOnly(argentinaDay(12)) });
    await seedReward({ name: 'Café', points: 150, usedCount: 31, expiresAt: dateOnly(argentinaDay(3)) });
    await seedReward({ name: 'Agotada', points: 100, stock: 0, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', usedCount: 5 });
    await seedReward({ name: 'Inactiva', points: 50, status: 'INACTIVE' });
    await seedReward({ name: 'Dada de baja', points: 60, status: 'DELETED', deletedAt: new Date() });
    await seedReward({ name: 'Vence hoy', points: 400, expiresAt: dateOnly(argentinaDay(0)) });
    await seedReward({ name: 'Vence en 8', points: 300, expiresAt: dateOnly(argentinaDay(8)) });
    await seedReward({ name: 'Vencida sin marcar', points: 200, expiresAt: dateOnly(argentinaDay(-1)) });
  }

  describe('GET /api/customers/me/recompensas', () => {
    it('CA-39.1: { balance, items } con la forma del contrato, sin confirmedCount ni updatedAt', async () => {
      await prisma.customerPoints.create({ data: { customerId, balance: 480, debt: 0, lifetimePoints: 480 } });
      const expiresAt = argentinaDay(3);
      await seedReward({ name: 'Medialunas x3', description: 'Tres medialunas de manteca para llevar.', points: 100, stock: 30, usedCount: 31, expiresAt: dateOnly(expiresAt) });

      const res = await catalog().expect(200);

      expect(res.body).toEqual({
        balance: 480,
        items: [
          {
            id: expect.any(Number),
            name: 'Medialunas x3',
            description: 'Tres medialunas de manteca para llevar.',
            points: 100,
            stock: 30,
            expiresAt,
            daysToExpire: 3,
            status: 'ACTIVE',
            disabledReason: null,
            photoUrl: null,
            usedCount: 31,
          },
        ],
      });
    });

    it('CA-39.1: nunca Inactivas ni dadas de baja; la Activa vencida sin marcar viene DISABLED / EXPIRED', async () => {
      await seedCatalog();

      const res = await catalog().expect(200);

      expect(names(res)).not.toEqual(expect.arrayContaining(['Inactiva']));
      expect(names(res)).not.toEqual(expect.arrayContaining(['Dada de baja']));
      const expired = res.body.items.find((item: { name: string }) => item.name === 'Vencida sin marcar');
      expect(expired).toMatchObject({ status: 'DISABLED', disabledReason: 'EXPIRED', daysToExpire: -1 });
      // En la base sigue ACTIVE: el catálogo no la cambia, solo la muestra
      expect((await prisma.reward.findFirstOrThrow({ where: { name: 'Vencida sin marcar' } })).status).toBe('ACTIVE');
    });

    it('CA-39.2 "Todas" (por defecto y con filter=ALL): por puntos ascendentes', async () => {
      await seedCatalog();
      const expected = ['Agotada', 'Café', 'Vencida sin marcar', 'Vence en 8', 'Vence hoy', 'Pizza'];

      expect(names(await catalog().expect(200))).toEqual(expected);
      expect(names(await catalog('ALL').expect(200))).toEqual(expected);
    });

    it('CA-39.2 "Más canjeadas": por usedCount descendente', async () => {
      await seedCatalog();

      expect(names(await catalog('MOST_REDEEMED').expect(200))).toEqual([
        'Café',
        'Agotada',
        'Pizza',
        'Vencida sin marcar',
        'Vence en 8',
        'Vence hoy',
      ]);
    });

    it('CA-39.2 "Próx. a vencer": la que vence hoy sí, la de 8 días no; por fecha', async () => {
      await seedCatalog();

      expect(names(await catalog('EXPIRING_SOON').expect(200))).toEqual(['Vence hoy', 'Café']);
    });

    it('vacío → items []', async () => {
      await seedReward({ name: 'Inactiva', status: 'INACTIVE' });

      expect((await catalog().expect(200)).body).toEqual({ balance: 0, items: [] });
      expect((await catalog('EXPIRING_SOON').expect(200)).body.items).toEqual([]);
    });

    it('filter inválido → 400', async () => {
      await catalog('CHEAPEST').expect(400);
    });

    describe('balance: el mismo saldo de GET /customers/me/puntos', () => {
      it.each([
        ['con saldo', 480],
        ['negativo (deuda)', -50],
      ])('%s', async (_case, balance) => {
        await prisma.customerPoints.create({
          data: { customerId, balance, debt: balance < 0 ? -balance : 0, lifetimePoints: 500 },
        });

        const res = await catalog().expect(200);
        const points = await request(app.getHttpServer()).get('/api/customers/me/puntos').set(customerHeaders()).expect(200);

        expect(res.body.balance).toBe(balance);
        expect(res.body.balance).toBe(points.body.balance);
      });

      it('sin ningún movimiento todavía → 0', async () => {
        expect((await catalog().expect(200)).body.balance).toBe(0);
      });
    });
  });

  it('CA-39.7: permisos: Administrador → 403, Cajero → 403, sin token → 401', async () => {
    const call = () => request(app.getHttpServer()).get('/api/customers/me/recompensas');

    await call().set(staffHeaders('ADMIN', admin)).expect(403);
    await call().set(staffHeaders('CASHIER', cashier)).expect(403);
    await call().expect(401);
  });
});
