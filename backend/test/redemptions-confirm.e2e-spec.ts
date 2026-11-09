import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AuditService } from '../src/audit/application/audit.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';

// US-40 (Confirmar canje) contra Postgres real: POST /customers/me/canjes,
// POST /customers/:id/canjes (contrato S4 §3.7.1) y GET /recompensas/disponibles (§3.5.2).
// Confirmar NO descuenta nada: ni saldo, ni lotes, ni movimientos, ni stock (decisión S4-1).
describe('Confirmar canje (e2e, US-40)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // La auditoría es solo inserción: no se borra, se mira desde el último id
  let lastAuditId = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    // Mismo mecanismo que consumptions.e2e-spec.ts: headers de prueba -> token real
    const issuer = moduleFixture.get(AccessTokenIssuer, { strict: false });
    app.use(async (req: Request, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-auth-role') as AuthRole | undefined;
      if (role) {
        const employeeIdHeader = req.header('x-test-employee-id');
        const customerIdHeader = req.header('x-test-customer-id');
        const token = await issuer.issue({
          accountId: Number(req.header('x-test-account-id') ?? 1),
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

  async function cleanDatabase() {
    await prisma.pointsMovement.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
  }

  beforeEach(async () => {
    await cleanDatabase();
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  // YYYY-MM-DD de hoy +/- n días, en hora de Argentina (UTC−03:00)
  const argentinaDay = (offsetDays: number) =>
    new Date(Date.now() - 3 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  async function seedEmployee(role: 'ADMIN' | 'CASHIER', email: string) {
    const employee = await prisma.employee.create({
      data: { firstName: 'Diego', lastName: 'Sosa', phone: '3510000000', email, role, isActive: true },
    });
    const account = await prisma.account.create({
      data: { email, passwordHash: 'hashed:secreta123', role, isActive: true, employeeId: employee.id },
    });
    return { employee, account };
  }

  async function seedCustomer(params: { documentNumber: string; email: string; active?: boolean; balance?: number }) {
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Sofía',
        lastName: 'Ríos',
        documentType: 'DNI',
        documentNumber: params.documentNumber,
        email: params.email,
        isActive: params.active ?? true,
      },
    });
    if (params.balance !== undefined) {
      await prisma.customerPoints.create({
        data: { customerId: customer.id, balance: params.balance, debt: 0, lifetimePoints: params.balance },
      });
      if (params.balance > 0) {
        await prisma.pointsLot.create({
          data: {
            customerId: customer.id,
            initialPoints: params.balance,
            remainingPoints: params.balance,
            accreditedAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
    return customer;
  }

  const seedReward = (overrides: Record<string, unknown> = {}) =>
    prisma.reward.create({ data: { name: 'Medialunas x3', points: 150, stock: 10, ...overrides } });

  const staffHeaders = (role: 'ADMIN' | 'CASHIER', accountId: number, employeeId: number) => ({
    'x-test-auth-role': role,
    'x-test-account-id': String(accountId),
    'x-test-employee-id': String(employeeId),
  });

  const customerHeaders = (customerId: number) => ({
    'x-test-auth-role': 'CUSTOMER',
    'x-test-account-id': '999',
    'x-test-customer-id': String(customerId),
  });

  describe('POST /api/customers/me/canjes (Cliente, desde la app)', () => {
    it('CA-40.1: confirma, devuelve la vista del Cliente y no toca saldo, lotes, movimientos ni stock', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com', balance: 480 });
      const reward = await seedReward();

      const before = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(customerHeaders(customer.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(201);
      const { redemption } = response.body;
      expect(redemption.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      // Vista del Cliente (§3.6.2): sin customer, origin, confirmedBy, resolvedBy ni saldos
      expect(Object.keys(redemption).sort()).toEqual(
        ['canCancel', 'code', 'createdAt', 'expiresAt', 'id', 'rejectionReason', 'resolvedAt', 'reward', 'status'].sort(),
      );
      expect(redemption).toMatchObject({
        status: 'CONFIRMED',
        reward: { id: reward.id, name: 'Medialunas x3', points: 150 },
        resolvedAt: null,
        rejectionReason: null,
        canCancel: true,
      });
      const createdAt = new Date(redemption.createdAt).getTime();
      expect(createdAt).toBeGreaterThanOrEqual(before - 1000);
      expect(new Date(redemption.expiresAt).getTime() - createdAt).toBe(15 * 60 * 1000);

      // En la base: origen APP, sin empleado, nada de resolución ni saldos
      const stored = await prisma.redemption.findUniqueOrThrow({ where: { code: redemption.code } });
      expect(stored).toMatchObject({
        customerId: customer.id,
        rewardId: reward.id,
        rewardName: 'Medialunas x3',
        points: 150,
        status: 'CONFIRMED',
        origin: 'APP',
        confirmedByAccountId: null,
        confirmedByName: null,
        resolvedAt: null,
        balanceBefore: null,
        balanceAfter: null,
      });

      // Confirmar no descuenta nada (decisión S4-1)
      expect(await prisma.customerPoints.findUnique({ where: { customerId: customer.id } })).toMatchObject({
        balance: 480,
        lifetimePoints: 480,
      });
      expect(await prisma.pointsLot.findMany({ where: { customerId: customer.id } })).toEqual([
        expect.objectContaining({ remainingPoints: 480, status: 'ACTIVE' }),
      ]);
      expect(await prisma.pointsMovement.count({ where: { customerId: customer.id } })).toBe(0);
      expect(await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } })).toMatchObject({
        stock: 10,
        usedCount: 0,
        status: 'ACTIVE',
      });
    });

    it('CA-40.5: desde la app no se audita (decisión S4-6)', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com', balance: 480 });
      const reward = await seedReward();

      const response = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(customerHeaders(customer.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(201);
      expect(await newAuditRows()).toEqual([]);
    });

    it('CA-40.2: no valida el saldo (se valida al registrar el uso)', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });
      const reward = await seedReward({ points: 1000 });

      const response = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(customerHeaders(customer.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(201);
    });

    it('el código es único: dos canjes de la misma recompensa tienen códigos distintos', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });
      const reward = await seedReward();
      const confirm = () =>
        request(app.getHttpServer())
          .post('/api/customers/me/canjes')
          .set(customerHeaders(customer.id))
          .send({ rewardId: reward.id });

      const first = await confirm();
      const second = await confirm();

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.redemption.code).not.toBe(second.body.redemption.code);
    });

    it('CA-40.4: un cliente dado de baja recibe 409 CUSTOMER_INACTIVE', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com', active: false });
      const reward = await seedReward();

      const response = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(customerHeaders(customer.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'CUSTOMER_INACTIVE', message: 'El cliente está dado de baja.' });
      expect(await prisma.redemption.count()).toBe(0);
    });

    it('CA-40.10: customerId en el body responde 400', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });
      const reward = await seedReward();

      const response = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(customerHeaders(customer.id))
        .send({ rewardId: reward.id, customerId: customer.id });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(['property customerId should not exist']);
    });

    it.each([
      ['falta rewardId', {}, ['Completá este campo.']],
      ['rewardId null', { rewardId: null }, ['Completá este campo.']],
      ['rewardId decimal', { rewardId: 2.5 }, ['Ingresá un número entero mayor a 0.']],
      ['rewardId 0', { rewardId: 0 }, ['Ingresá un número entero mayor a 0.']],
      ['rewardId negativo', { rewardId: -1 }, ['Ingresá un número entero mayor a 0.']],
      ['rewardId texto', { rewardId: 'abc' }, ['Ingresá un número entero mayor a 0.']],
    ])('CA-40.11: %s responde 400 con el mensaje del contrato', async (_name, body, message) => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });

      const response = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(customerHeaders(customer.id))
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(message);
    });

    it('CA-40.11: una recompensa que no existe responde 404 "No existe la recompensa."', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });

      const response = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(customerHeaders(customer.id))
        .send({ rewardId: 999999 });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No existe la recompensa.');
    });

    it('CA-40.3: una recompensa dada de baja responde 404 igual que una inexistente', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });
      const reward = await seedReward({ status: 'DELETED', deletedAt: new Date() });

      const response = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(customerHeaders(customer.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No existe la recompensa.');
    });

    it.each([
      ['Inactiva', { status: 'INACTIVE' }],
      ['Deshabilitada por falta de stock', { status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 0 }],
      ['Deshabilitada por vencimiento', { status: 'DISABLED', disabledReason: 'EXPIRED' }],
      ['Activa sin stock', { stock: 0 }],
      ['Activa con la fecha vencida (el proceso diario todavía no corrió)', { expiresAt: new Date(`${argentinaDay(-1)}T00:00:00Z`) }],
    ])('CA-40.3: %s responde 409 REWARD_NOT_AVAILABLE', async (_name, overrides) => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });
      const reward = await seedReward(overrides);

      const response = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(customerHeaders(customer.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        code: 'REWARD_NOT_AVAILABLE',
        message: 'La recompensa ya no está disponible.',
      });
      expect(await prisma.redemption.count()).toBe(0);
    });

    it('una recompensa que vence hoy sigue disponible', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });
      const reward = await seedReward({ expiresAt: new Date(`${argentinaDay(0)}T00:00:00Z`) });

      const response = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(customerHeaders(customer.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(201);
    });

    it('roles: sin token 401; Administrador y Cajero 403 en la ruta del Cliente', async () => {
      const reward = await seedReward();
      const admin = await seedEmployee('ADMIN', 'admin@vitto.club');
      const cashier = await seedEmployee('CASHIER', 'cajero@vitto.club');

      const anonymous = await request(app.getHttpServer()).post('/api/customers/me/canjes').send({ rewardId: reward.id });
      const asAdmin = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(staffHeaders('ADMIN', admin.account.id, admin.employee.id))
        .send({ rewardId: reward.id });
      const asCashier = await request(app.getHttpServer())
        .post('/api/customers/me/canjes')
        .set(staffHeaders('CASHIER', cashier.account.id, cashier.employee.id))
        .send({ rewardId: reward.id });

      expect(anonymous.status).toBe(401);
      expect(asAdmin.status).toBe(403);
      expect(asCashier.status).toBe(403);
      expect(await prisma.redemption.count()).toBe(0);
    });
  });

  describe('POST /api/customers/:id/canjes (Cajero o Administrador, desde la caja)', () => {
    it.each(['CASHIER', 'ADMIN'] as const)(
      'CA-40.1 y CA-40.5: %s confirma en nombre del cliente, queda COUNTER con confirmedBy y se audita',
      async (role) => {
        const { employee, account } = await seedEmployee(role, `${role.toLowerCase()}@vitto.club`);
        const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com', balance: 480 });
        const reward = await seedReward({ name: 'Desayuno completo', points: 400 });

        const response = await request(app.getHttpServer())
          .post(`/api/customers/${customer.id}/canjes`)
          .set(staffHeaders(role, account.id, employee.id))
          .send({ rewardId: reward.id });

        expect(response.status).toBe(201);
        const { redemption } = response.body;
        // Forma completa de §3.6.2 (sin canCancel)
        expect(Object.keys(redemption).sort()).toEqual(
          [
            'balanceAfter',
            'balanceBefore',
            'code',
            'confirmedBy',
            'createdAt',
            'customer',
            'expiresAt',
            'id',
            'origin',
            'rejectionReason',
            'resolvedAt',
            'resolvedBy',
            'reward',
            'status',
          ].sort(),
        );
        expect(redemption).toMatchObject({
          status: 'CONFIRMED',
          origin: 'COUNTER',
          confirmedBy: { accountId: account.id, name: 'Diego Sosa' },
          customer: {
            id: customer.id,
            firstName: 'Sofía',
            lastName: 'Ríos',
            documentType: 'DNI',
            documentNumber: '30111222',
          },
          reward: { id: reward.id, name: 'Desayuno completo', points: 400 },
          resolvedAt: null,
          resolvedBy: null,
          rejectionReason: null,
          balanceBefore: null,
          balanceAfter: null,
        });
        expect(new Date(redemption.expiresAt).getTime() - new Date(redemption.createdAt).getTime()).toBe(
          15 * 60 * 1000,
        );

        // Auditoría: a nombre del empleado, con la forma de §3.14.2
        const audit = await newAuditRows();
        expect(audit).toHaveLength(1);
        expect(audit[0]).toMatchObject({
          module: 'REDEMPTIONS',
          actionCode: 'REDEMPTION_CONFIRMED',
          actorType: 'EMPLOYEE',
          description: 'Confirmó el canje de Sofía Ríos',
          operationCode: redemption.code,
          actorAccountId: account.id,
          performedBy: 'Diego Sosa',
          affectedCustomerId: customer.id,
          affectedCustomerName: 'Sofía Ríos',
        });
        expect(audit[0].details).toEqual([
          { label: 'Código del canje', value: redemption.code },
          { label: 'Recompensa', value: 'Desayuno completo' },
          { label: 'Puntos', value: '400 pts' },
        ]);

        // Tampoco desde la caja se descuenta nada
        expect(await prisma.customerPoints.findUnique({ where: { customerId: customer.id } })).toMatchObject({
          balance: 480,
        });
        expect(await prisma.pointsMovement.count({ where: { customerId: customer.id } })).toBe(0);
        expect(await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } })).toMatchObject({ stock: 10 });
      },
    );

    it('CA-40.2: el Cajero puede confirmar aunque el saldo no alcance', async () => {
      const { employee, account } = await seedEmployee('CASHIER', 'cajero@vitto.club');
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com', balance: 10 });
      const reward = await seedReward({ points: 1000 });

      const response = await request(app.getHttpServer())
        .post(`/api/customers/${customer.id}/canjes`)
        .set(staffHeaders('CASHIER', account.id, employee.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(201);
    });

    it('un cliente que no existe responde 404', async () => {
      const { employee, account } = await seedEmployee('CASHIER', 'cajero@vitto.club');
      const reward = await seedReward();

      const response = await request(app.getHttpServer())
        .post('/api/customers/999999/canjes')
        .set(staffHeaders('CASHIER', account.id, employee.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(404);
    });

    it('CA-40.4: un cliente dado de baja responde 409 CUSTOMER_INACTIVE y no deja nada', async () => {
      const { employee, account } = await seedEmployee('CASHIER', 'cajero@vitto.club');
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com', active: false });
      const reward = await seedReward();

      const response = await request(app.getHttpServer())
        .post(`/api/customers/${customer.id}/canjes`)
        .set(staffHeaders('CASHIER', account.id, employee.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('CUSTOMER_INACTIVE');
      expect(await prisma.redemption.count()).toBe(0);
      expect(await newAuditRows()).toEqual([]);
    });

    it('CA-40.3: una recompensa no disponible responde 409 REWARD_NOT_AVAILABLE y no se audita', async () => {
      const { employee, account } = await seedEmployee('CASHIER', 'cajero@vitto.club');
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });
      const reward = await seedReward({ status: 'INACTIVE' });

      const response = await request(app.getHttpServer())
        .post(`/api/customers/${customer.id}/canjes`)
        .set(staffHeaders('CASHIER', account.id, employee.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('REWARD_NOT_AVAILABLE');
      expect(await newAuditRows()).toEqual([]);
    });

    it('CA-40.11 y CA-40.10: valida el body igual que la ruta del Cliente', async () => {
      const { employee, account } = await seedEmployee('CASHIER', 'cajero@vitto.club');
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });
      const headers = staffHeaders('CASHIER', account.id, employee.id);
      const post = (body: object) =>
        request(app.getHttpServer()).post(`/api/customers/${customer.id}/canjes`).set(headers).send(body);

      const missing = await post({});
      const decimal = await post({ rewardId: 1.5 });
      const withCustomerId = await post({ rewardId: 1, customerId: customer.id });

      expect(missing.status).toBe(400);
      expect(missing.body.message).toEqual(['Completá este campo.']);
      expect(decimal.status).toBe(400);
      expect(decimal.body.message).toEqual(['Ingresá un número entero mayor a 0.']);
      expect(withCustomerId.status).toBe(400);
      expect(withCustomerId.body.message).toEqual(['property customerId should not exist']);
    });

    it('roles: sin token 401; el Cliente recibe 403 y nada queda escrito (el 403 no se audita)', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });
      const reward = await seedReward();

      const anonymous = await request(app.getHttpServer())
        .post(`/api/customers/${customer.id}/canjes`)
        .send({ rewardId: reward.id });
      const asCustomer = await request(app.getHttpServer())
        .post(`/api/customers/${customer.id}/canjes`)
        .set(customerHeaders(customer.id))
        .send({ rewardId: reward.id });

      expect(anonymous.status).toBe(401);
      expect(asCustomer.status).toBe(403);
      expect(await prisma.redemption.count()).toBe(0);
      expect(await newAuditRows()).toEqual([]);
    });

    it('rollback: si falla la auditoría no queda el canje', async () => {
      const { employee, account } = await seedEmployee('CASHIER', 'cajero@vitto.club');
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });
      const reward = await seedReward();
      jest.spyOn(app.get(AuditService), 'record').mockRejectedValueOnce(new Error('falla la auditoría'));

      const response = await request(app.getHttpServer())
        .post(`/api/customers/${customer.id}/canjes`)
        .set(staffHeaders('CASHIER', account.id, employee.id))
        .send({ rewardId: reward.id });

      expect(response.status).toBe(500);
      expect(await prisma.redemption.count()).toBe(0);
    });
  });

  describe('GET /api/recompensas/disponibles (Cajero y Administrador)', () => {
    it('devuelve solo las disponibles, por puntos ascendentes, con la forma de §3.1 sin confirmedCount', async () => {
      const { employee, account } = await seedEmployee('CASHIER', 'cajero@vitto.club');
      await seedReward({ name: 'Torta', points: 300, stock: null, expiresAt: new Date(`${argentinaDay(3)}T00:00:00Z`) });
      await seedReward({ name: 'Café', points: 100, stock: null });
      await seedReward({ name: 'Jugo', points: 200, stock: 5 });
      // No disponibles: Inactiva, Deshabilitada, dada de baja, sin stock y con la fecha vencida
      await seedReward({ name: 'Inactiva', points: 50, status: 'INACTIVE' });
      await seedReward({ name: 'Agotada', points: 60, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 0 });
      await seedReward({ name: 'Eliminada', points: 70, status: 'DELETED', deletedAt: new Date() });
      await seedReward({ name: 'Sin stock', points: 80, stock: 0 });
      await seedReward({ name: 'Vencida', points: 90, expiresAt: new Date(`${argentinaDay(-1)}T00:00:00Z`) });

      const response = await request(app.getHttpServer())
        .get('/api/recompensas/disponibles')
        .set(staffHeaders('CASHIER', account.id, employee.id));

      expect(response.status).toBe(200);
      expect(response.body.map((reward: { name: string }) => reward.name)).toEqual(['Café', 'Jugo', 'Torta']);
      expect(Object.keys(response.body[0]).sort()).toEqual(
        [
          'daysToExpire',
          'description',
          'disabledReason',
          'expiresAt',
          'id',
          'name',
          'photoUrl',
          'points',
          'status',
          'stock',
          'updatedAt',
          'usedCount',
        ].sort(),
      );
      expect(response.body[0]).toMatchObject({
        name: 'Café',
        points: 100,
        stock: null,
        expiresAt: null,
        daysToExpire: null,
        status: 'ACTIVE',
        disabledReason: null,
        photoUrl: null,
        usedCount: 0,
      });
      expect(response.body[2]).toMatchObject({ name: 'Torta', expiresAt: argentinaDay(3), daysToExpire: 3 });
    });

    it('sin recompensas disponibles devuelve una lista vacía', async () => {
      const { employee, account } = await seedEmployee('ADMIN', 'admin@vitto.club');

      const response = await request(app.getHttpServer())
        .get('/api/recompensas/disponibles')
        .set(staffHeaders('ADMIN', account.id, employee.id));

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('roles: sin token 401 y el Cliente 403', async () => {
      const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com' });

      const anonymous = await request(app.getHttpServer()).get('/api/recompensas/disponibles');
      const asCustomer = await request(app.getHttpServer())
        .get('/api/recompensas/disponibles')
        .set(customerHeaders(customer.id));

      expect(anonymous.status).toBe(401);
      expect(asCustomer.status).toBe(403);
    });
  });
});
