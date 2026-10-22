import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';

// Cubre US-46 (GET /customers/:id/puntos) y US-19 (GET /customers/me/puntos), contra
// Postgres real. Los puntos se siembran directo en la base: acá no se prueba cómo se
// acreditan (eso es US-21/BASE), sino la lectura y los permisos.
describe('Puntos del cliente (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    // Mismo mecanismo que consumptions.e2e-spec.ts, más x-test-customer-id para el Cliente
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

  // Limpia al terminar: los lotes y saldos referencian clientes (onDelete Restrict), y las suites
  // que corren después borran esas tablas sin saber de puntos.
  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
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
  });

  async function cleanDatabase() {
    await prisma.pointsMovement.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.loyaltyProgramConfiguration.deleteMany();
  }

  async function seedCustomer(documentNumber: string, active = true) {
    return await prisma.customer.create({
      data: {
        firstName: 'Carolina',
        lastName: 'Fernández',
        documentType: 'DNI',
        documentNumber,
        email: `cliente.${documentNumber}@example.com`,
        isActive: active,
      },
    });
  }

  function headers(role: AuthRole, ids: { customerId?: number; employeeId?: number } = {}) {
    const result: Record<string, string> = { 'x-test-auth-role': role, 'x-test-account-id': '1' };
    if (ids.employeeId !== undefined) result['x-test-employee-id'] = String(ids.employeeId);
    if (ids.customerId !== undefined) result['x-test-customer-id'] = String(ids.customerId);
    return result;
  }

  const ADMIN = () => headers('ADMIN', { employeeId: 1 });
  const CASHIER = () => headers('CASHIER', { employeeId: 2 });

  describe('GET /api/customers/:id/puntos (US-46)', () => {
    it('cliente con lotes: forma completa de §3.4.1, vencimientos ordenados y sin lotes agotados', async () => {
      const customer = await seedCustomer('38456001');
      await prisma.customerPoints.create({
        data: { customerId: customer.id, balance: 350, debt: 0, lifetimePoints: 450 },
      });
      // Cargados fuera de orden: la respuesta los ordena por vencimiento
      await prisma.pointsLot.createMany({
        data: [
          { customerId: customer.id, initialPoints: 200, remainingPoints: 150, expiresAt: new Date('2026-12-15T15:00:00.000Z') },
          { customerId: customer.id, initialPoints: 200, remainingPoints: 200, expiresAt: new Date('2026-11-30T15:00:00.000Z') },
          { customerId: customer.id, initialPoints: 50, remainingPoints: 0, expiresAt: new Date('2026-11-01T15:00:00.000Z') },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}/puntos`)
        .set(ADMIN());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        customerId: customer.id,
        balance: 350,
        negativeBalance: false,
        lifetimePoints: 450,
        level: {
          current: 'SILVER',
          next: 'GOLD',
          currentMinPoints: 300,
          nextMinPoints: 800,
          pointsToNext: 350,
          progressPercent: 30,
        },
        nextExpirations: [
          { points: 200, expiresAt: '2026-11-30' },
          { points: 150, expiresAt: '2026-12-15' },
        ],
      });
    });

    it('cliente con deuda: saldo negativo y negativeBalance=true (Cajero)', async () => {
      const customer = await seedCustomer('38456002');
      await prisma.customerPoints.create({
        data: { customerId: customer.id, balance: -350, debt: 350, lifetimePoints: 1250 },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}/puntos`)
        .set(CASHIER());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        customerId: customer.id,
        balance: -350,
        negativeBalance: true,
        lifetimePoints: 1250,
        level: {
          current: 'GOLD',
          next: null,
          currentMinPoints: 800,
          nextMinPoints: null,
          pointsToNext: 0,
          progressPercent: 100,
        },
        nextExpirations: [],
      });
    });

    it('cliente sin movimientos: saldo 0, Bronce y sin vencimientos', async () => {
      const customer = await seedCustomer('38456003');

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}/puntos`)
        .set(CASHIER());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        customerId: customer.id,
        balance: 0,
        negativeBalance: false,
        lifetimePoints: 0,
        level: {
          current: 'BRONZE',
          next: 'SILVER',
          currentMinPoints: 0,
          nextMinPoints: 300,
          pointsToNext: 300,
          progressPercent: 0,
        },
        nextExpirations: [],
      });
    });

    it('cliente inactivo: se consulta igual (solo lectura, §8.2)', async () => {
      const customer = await seedCustomer('38456004', false);

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}/puntos`)
        .set(ADMIN());

      expect(response.status).toBe(200);
      expect(response.body.customerId).toBe(customer.id);
    });

    it('Cliente → 403 FORBIDDEN', async () => {
      const customer = await seedCustomer('38456005');

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}/puntos`)
        .set(headers('CUSTOMER', { customerId: customer.id }));

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('sin token → 401', async () => {
      const customer = await seedCustomer('38456006');

      const response = await request(app.getHttpServer()).get(`/api/customers/${customer.id}/puntos`);

      expect(response.status).toBe(401);
    });

    it('id inexistente → 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/customers/999999/puntos')
        .set(ADMIN());

      expect(response.status).toBe(404);
    });

    it('id no numérico → 400', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/customers/abc/puntos')
        .set(ADMIN());

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/customers/me/puntos (US-19)', () => {
    it('Cliente → 200 con sus propios puntos (el del token, no otro)', async () => {
      const me = await seedCustomer('38456010');
      const other = await seedCustomer('38456011');
      await prisma.customerPoints.createMany({
        data: [
          { customerId: me.id, balance: 120, debt: 0, lifetimePoints: 120 },
          { customerId: other.id, balance: 900, debt: 0, lifetimePoints: 900 },
        ],
      });
      await prisma.pointsLot.create({
        data: { customerId: me.id, initialPoints: 120, remainingPoints: 120, expiresAt: new Date('2027-01-10T15:00:00.000Z') },
      });

      const response = await request(app.getHttpServer())
        .get('/api/customers/me/puntos')
        .set(headers('CUSTOMER', { customerId: me.id }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        customerId: me.id,
        balance: 120,
        negativeBalance: false,
        lifetimePoints: 120,
        level: {
          current: 'BRONZE',
          next: 'SILVER',
          currentMinPoints: 0,
          nextMinPoints: 300,
          pointsToNext: 180,
          progressPercent: 40,
        },
        nextExpirations: [{ points: 120, expiresAt: '2027-01-10' }],
      });
    });

    it('Cajero → 403 FORBIDDEN', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/customers/me/puntos')
        .set(CASHIER());

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('Administrador → 403 FORBIDDEN', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/customers/me/puntos')
        .set(ADMIN());

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('sin token → 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/customers/me/puntos');

      expect(response.status).toBe(401);
    });
  });
});
