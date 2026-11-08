import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';

// US-42 (Registrar uso del canje) contra Postgres real: PATCH /api/canjes/:code/usar
// (contrato S4 §3.9.1). TODO (US-44, todavía sin empezar): no se prueba CA-42.6 (vencido)
// porque el paso 2 ("vencer al leer") no está implementado — ver el TODO en
// redemptions.service.ts (decisión: avanzar con el resto de US-42, a pedido de Montse).
describe('Registrar uso del canje (e2e, US-42)', () => {
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

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

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
    const balance = params.balance ?? 0;
    await prisma.customerPoints.create({
      data: { customerId: customer.id, balance, debt: 0, lifetimePoints: balance },
    });
    if (balance > 0) {
      await prisma.pointsLot.create({
        data: {
          customerId: customer.id,
          initialPoints: balance,
          remainingPoints: balance,
          accreditedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    }
    return customer;
  }

  const seedReward = (overrides: Record<string, unknown> = {}) =>
    prisma.reward.create({ data: { name: 'Medialunas x3', points: 150, stock: 10, ...overrides } });

  let nextCode = 1000;
  // Código válido: 6 caracteres, sin 0/O/1/I (CHECK redemptions_code_format_check)
  function uniqueCode(): string {
    const code = (nextCode++).toString(36).toUpperCase().replace(/[01OI]/g, '2').padStart(6, '2');
    return code.slice(-6);
  }

  const seedRedemption = (
    customerId: number,
    reward: { id: number; name: string; points: number },
    confirmedByAccountId: number,
    overrides: Record<string, unknown> = {},
  ) => {
    const createdAt = new Date();
    return prisma.redemption.create({
      data: {
        code: uniqueCode(),
        customerId,
        rewardId: reward.id,
        rewardName: reward.name,
        points: reward.points,
        status: 'CONFIRMED',
        origin: 'COUNTER',
        confirmedByAccountId,
        confirmedByName: 'Diego Sosa',
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
        ...overrides,
      },
    });
  };

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

  it('CA-42.1: descuenta FIFO, inserta el movimiento REDEMPTION, pasa a USED y audita REDEMPTION_USED', async () => {
    const { account, employee } = await seedEmployee('CASHIER', 'cajero@vitto.club');
    const customer = await seedCustomer({ documentNumber: '30111222', email: 'sofia@mail.com', balance: 1240 });
    const reward = await seedReward({ points: 150, stock: 20 });
    const redemption = await seedRedemption(customer.id, reward, account.id);

    const response = await request(app.getHttpServer())
      .patch(`/api/canjes/${redemption.code}/usar`)
      .set(staffHeaders('CASHIER', account.id, employee.id))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ balanceBefore: 1240, balanceAfter: 1090 });
    expect(response.body.redemption).toMatchObject({ status: 'USED', code: redemption.code });

    const stored = await prisma.redemption.findUniqueOrThrow({ where: { id: redemption.id } });
    expect(stored.status).toBe('USED');
    expect(stored.resolvedByAccountId).toBe(account.id);
    expect(stored.balanceBefore).toBe(1240);
    expect(stored.balanceAfter).toBe(1090);

    const points = await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: customer.id } });
    expect(points.balance).toBe(1090);
    expect(points.lifetimePoints).toBe(1240); // canjear no baja el nivel

    const movement = await prisma.pointsMovement.findFirstOrThrow({ where: { redemptionId: redemption.id } });
    expect(movement).toMatchObject({ type: 'REDEMPTION', points: -150, balanceAfter: 1090 });

    const rewardAfter = await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } });
    expect(rewardAfter).toMatchObject({ stock: 19, usedCount: 1, status: 'ACTIVE' });

    const rows = await newAuditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorType: 'EMPLOYEE',
      actorAccountId: account.id,
      module: 'REDEMPTIONS',
      actionCode: 'REDEMPTION_USED',
      operationCode: redemption.code,
    });
    expect(rows[0].details).toEqual([
      { label: 'Código del canje', value: redemption.code },
      { label: 'Recompensa', value: 'Medialunas x3' },
      { label: 'Puntos descontados', value: '−150 pts' },
      { label: 'Saldo resultante', value: '1.090 pts' },
    ]);
  });

  it('CA-42.2: con stock null no lo toca', async () => {
    const { account, employee } = await seedEmployee('ADMIN', 'admin@vitto.club');
    const customer = await seedCustomer({ documentNumber: '30111223', email: 'sofia2@mail.com', balance: 500 });
    const reward = await seedReward({ points: 100, stock: null });
    const redemption = await seedRedemption(customer.id, reward, account.id);

    const response = await request(app.getHttpServer())
      .patch(`/api/canjes/${redemption.code}/usar`)
      .set(staffHeaders('ADMIN', account.id, employee.id))
      .send();

    expect(response.status).toBe(200);
    const rewardAfter = await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } });
    expect(rewardAfter.stock).toBeNull();
    expect(rewardAfter.usedCount).toBe(1);
  });

  it('CA-42.3: última unidad: stock a 0, DISABLED/OUT_OF_STOCK y audita REWARD_DISABLED (Sistema)', async () => {
    const { account, employee } = await seedEmployee('CASHIER', 'cajero3@vitto.club');
    const customer = await seedCustomer({ documentNumber: '30111224', email: 'sofia3@mail.com', balance: 500 });
    const reward = await seedReward({ points: 100, stock: 1 });
    const redemption = await seedRedemption(customer.id, reward, account.id);

    const response = await request(app.getHttpServer())
      .patch(`/api/canjes/${redemption.code}/usar`)
      .set(staffHeaders('CASHIER', account.id, employee.id))
      .send();

    expect(response.status).toBe(200);
    const rewardAfter = await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } });
    expect(rewardAfter).toMatchObject({ stock: 0, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' });

    const rows = await newAuditRows();
    expect(rows).toHaveLength(2); // REDEMPTION_USED + REWARD_DISABLED
    expect(rows[1]).toMatchObject({ actorType: 'SYSTEM', actorAccountId: null, module: 'REWARDS', actionCode: 'REWARD_DISABLED' });
    expect(rows[1].details).toEqual([{ label: 'Motivo', value: 'Sin stock' }]);
  });

  it('CA-42.4: saldo insuficiente: 409 INSUFFICIENT_BALANCE, el canje sigue CONFIRMED y no se descuenta nada', async () => {
    const { account, employee } = await seedEmployee('CASHIER', 'cajero4@vitto.club');
    const customer = await seedCustomer({ documentNumber: '30111225', email: 'sofia4@mail.com', balance: 50 });
    const reward = await seedReward({ points: 400, stock: 10 });
    const redemption = await seedRedemption(customer.id, reward, account.id);

    const response = await request(app.getHttpServer())
      .patch(`/api/canjes/${redemption.code}/usar`)
      .set(staffHeaders('CASHIER', account.id, employee.id))
      .send();

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INSUFFICIENT_BALANCE');

    const stored = await prisma.redemption.findUniqueOrThrow({ where: { id: redemption.id } });
    expect(stored.status).toBe('CONFIRMED');
    const points = await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: customer.id } });
    expect(points.balance).toBe(50);
    expect(await newAuditRows()).toHaveLength(0);
  });

  it('CA-42.5: recompensa dada de baja (no disponible): 409 REWARD_NOT_AVAILABLE, el canje sigue CONFIRMED', async () => {
    const { account, employee } = await seedEmployee('CASHIER', 'cajero5@vitto.club');
    const customer = await seedCustomer({ documentNumber: '30111226', email: 'sofia5@mail.com', balance: 500 });
    const reward = await seedReward({ points: 100, stock: 10 });
    const redemption = await seedRedemption(customer.id, reward, account.id);
    await prisma.reward.update({ where: { id: reward.id }, data: { status: 'DELETED', deletedAt: new Date() } });

    const response = await request(app.getHttpServer())
      .patch(`/api/canjes/${redemption.code}/usar`)
      .set(staffHeaders('CASHIER', account.id, employee.id))
      .send();

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('REWARD_NOT_AVAILABLE');
    const stored = await prisma.redemption.findUniqueOrThrow({ where: { id: redemption.id } });
    expect(stored.status).toBe('CONFIRMED');
  });

  it('código que no existe: 404 "Código no encontrado."', async () => {
    const { account, employee } = await seedEmployee('CASHIER', 'cajero6@vitto.club');

    const response = await request(app.getHttpServer())
      .patch('/api/canjes/ZZZZZZ/usar')
      .set(staffHeaders('CASHIER', account.id, employee.id))
      .send();

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Código no encontrado.');
  });

  it('ya usado: 409 REDEMPTION_NOT_CONFIRMED', async () => {
    const { account, employee } = await seedEmployee('CASHIER', 'cajero7@vitto.club');
    const customer = await seedCustomer({ documentNumber: '30111227', email: 'sofia7@mail.com', balance: 500 });
    const reward = await seedReward({ points: 100, stock: 10 });
    const redemption = await seedRedemption(customer.id, reward, account.id, {
      status: 'USED',
      resolvedAt: new Date(),
      resolvedByAccountId: account.id,
      resolvedByName: 'Diego Sosa',
      balanceBefore: 500,
      balanceAfter: 400,
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/canjes/${redemption.code}/usar`)
      .set(staffHeaders('CASHIER', account.id, employee.id))
      .send();

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('REDEMPTION_NOT_CONFIRMED');
    expect(response.body.message).toBe('El canje ya está en estado "Utilizado".');
  });

  it('CA-42.8: descuenta los puntos del canje (snapshot), no el precio actual de la recompensa', async () => {
    const { account, employee } = await seedEmployee('CASHIER', 'cajero8@vitto.club');
    const customer = await seedCustomer({ documentNumber: '30111228', email: 'sofia8@mail.com', balance: 500 });
    const reward = await seedReward({ points: 100, stock: 10 });
    const redemption = await seedRedemption(customer.id, reward, account.id, { points: 150 }); // snapshot viejo
    await prisma.reward.update({ where: { id: reward.id }, data: { points: 999 } }); // cambió el precio

    const response = await request(app.getHttpServer())
      .patch(`/api/canjes/${redemption.code}/usar`)
      .set(staffHeaders('CASHIER', account.id, employee.id))
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ balanceBefore: 500, balanceAfter: 350 }); // 500 - 150, no 999
  });

  it('CA-42.11: el Cliente recibe 403 y no se audita', async () => {
    const { account } = await seedEmployee('CASHIER', 'cajero9@vitto.club');
    const customer = await seedCustomer({ documentNumber: '30111229', email: 'sofia9@mail.com', balance: 500 });
    const reward = await seedReward({ points: 100, stock: 10 });
    const redemption = await seedRedemption(customer.id, reward, account.id);

    const response = await request(app.getHttpServer())
      .patch(`/api/canjes/${redemption.code}/usar`)
      .set(customerHeaders(customer.id))
      .send();

    expect(response.status).toBe(403);
    expect(await newAuditRows()).toHaveLength(0);
  });
});
