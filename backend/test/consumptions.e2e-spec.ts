import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';

// Cubre US-21 (Registrar consumo) y US-22 (Anular consumo + listado por cliente), contra
// Postgres real, con los módulos reales (consumptions, points/BASE, loyalty, customers,
// employees, auth), y la auditoría CONSUMPTION_REGISTERED / CONSUMPTION_VOIDED (§3.9.3).
describe('Consumos y puntos (e2e)', () => {
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

    // Mismo mecanismo que loyalty.e2e-spec.ts: headers de prueba -> token real, sin pasar
    // por POST /auth/login (no es lo que se está probando acá).
    const issuer = moduleFixture.get(AccessTokenIssuer, { strict: false });
    app.use(async (req: Request, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-auth-role') as AuthRole | undefined;
      if (role) {
        const accountId = Number(req.header('x-test-account-id') ?? 1);
        const employeeIdHeader = req.header('x-test-employee-id');
        const token = await issuer.issue({
          accountId,
          role,
          ...(employeeIdHeader ? { employeeId: Number(employeeIdHeader) } : {}),
        });
        req.headers.authorization = `Bearer ${token}`;
      }
      next();
    });

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // Orden que respeta las FK: movimientos/lotes/saldo -> consumos -> sesiones -> cuentas ->
  // empleados/clientes -> configuración.
  beforeEach(async () => {
    await prisma.pointsMovement.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.loyaltyProgramConfiguration.deleteMany();
    lastAuditId = await lastAuditIdNow();
  });

  const lastAuditIdNow = async () =>
    (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  async function setConfig(overrides: {
    baseAmount?: number | null;
    pointsAwarded?: number | null;
    bonusType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | null;
    bonusValue?: number | null;
    silverMinPoints?: number;
    goldMinPoints?: number;
    pointsExpirationMonths?: number;
  } = {}) {
    await prisma.loyaltyProgramConfiguration.deleteMany();
    await prisma.loyaltyProgramConfiguration.create({
      data: {
        version: 1,
        // "baseAmount" in overrides (no ??): null explícito tiene que quedar null, no
        // caer al default — es justo el caso "sin equivalencia configurada" que pruebo.
        baseAmount: 'baseAmount' in overrides ? overrides.baseAmount : 1000,
        pointsAwarded: 'pointsAwarded' in overrides ? overrides.pointsAwarded : 10,
        bonusType: overrides.bonusType ?? null,
        bonusValue: overrides.bonusValue ?? null,
        silverMinPoints: overrides.silverMinPoints ?? 300,
        goldMinPoints: overrides.goldMinPoints ?? 800,
        pointsExpirationMonths: overrides.pointsExpirationMonths ?? 12,
        isActive: true,
      },
    });
  }

  async function seedEmployeeWithAccount(params: { email: string; role: 'ADMIN' | 'CASHIER' }) {
    const employee = await prisma.employee.create({
      data: {
        firstName: 'Test',
        lastName: params.role,
        phone: '3510000000',
        email: params.email,
        role: params.role,
        isActive: true,
      },
    });
    const account = await prisma.account.create({
      data: {
        email: params.email,
        passwordHash: 'hashed:secreta123',
        role: params.role,
        isActive: true,
        employeeId: employee.id,
      },
    });
    return { employee, account };
  }

  async function seedCustomer(params: { email: string; documentNumber: string; active?: boolean }) {
    return await prisma.customer.create({
      data: {
        firstName: 'Carolina',
        lastName: 'Fernández',
        documentType: 'DNI',
        documentNumber: params.documentNumber,
        email: params.email,
        isActive: params.active ?? true,
      },
    });
  }

  function authHeaders(role: AuthRole, accountId: number, employeeId?: number) {
    const headers: Record<string, string> = {
      'x-test-auth-role': role,
      'x-test-account-id': String(accountId),
    };
    if (employeeId !== undefined) headers['x-test-employee-id'] = String(employeeId);
    return headers;
  }

  async function registerConsumption(headers: Record<string, string>, customerId: number, amount = 50000) {
    const response = await request(app.getHttpServer())
      .post('/api/consumos')
      .set(headers)
      .send({ customerId, amount });
    return response.body.consumption;
  }

  describe('POST /api/consumos (US-21)', () => {
    it('registra sin bonificación: crea el consumo y acredita los puntos', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.a@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.a@example.com', documentNumber: '38456001' });

      const response = await request(app.getHttpServer())
        .post('/api/consumos')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ customerId: customer.id, amount: 50000 });

      expect(response.status).toBe(201);
      expect(response.body.consumption.totalPoints).toBe(500);
      expect(response.body.consumption.status).toBe('REGISTERED');
      expect(response.body.balanceBefore).toBe(0);
      expect(response.body.balanceAfter).toBe(500);

      const lot = await prisma.pointsLot.findUnique({ where: { consumptionId: response.body.consumption.id } });
      expect(lot?.initialPoints).toBe(500);
      const balance = await prisma.customerPoints.findUnique({ where: { customerId: customer.id } });
      expect(balance?.balance).toBe(500);
      expect(balance?.lifetimePoints).toBe(500);
    });

    it('registra con bonificación PERCENTAGE en el primer consumo', async () => {
      await setConfig({ bonusType: 'PERCENTAGE', bonusValue: 15 });
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.b@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.b@example.com', documentNumber: '38456002' });

      const response = await request(app.getHttpServer())
        .post('/api/consumos')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ customerId: customer.id, amount: 50000 });

      expect(response.status).toBe(201);
      expect(response.body.consumption.points).toBe(500);
      expect(response.body.consumption.bonusPoints).toBe(75); // floor(500*15/100)
      expect(response.body.consumption.totalPoints).toBe(575);
    });

    it('registra con bonificación FIXED_AMOUNT en el primer consumo', async () => {
      await setConfig({ bonusType: 'FIXED_AMOUNT', bonusValue: 50 });
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.c@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.c@example.com', documentNumber: '38456003' });

      const response = await request(app.getHttpServer())
        .post('/api/consumos')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ customerId: customer.id, amount: 50000 });

      expect(response.body.consumption.bonusPoints).toBe(50);
      expect(response.body.consumption.totalPoints).toBe(550);
    });

    it('decisión #2: si se anula el primer consumo, el siguiente vuelve a recibir la bonificación', async () => {
      await setConfig({ bonusType: 'FIXED_AMOUNT', bonusValue: 50 });
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.d@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.d@example.com', documentNumber: '38456004' });
      const headers = authHeaders('CASHIER', account.id, employee.id);

      const first = await request(app.getHttpServer()).post('/api/consumos').set(headers).send({ customerId: customer.id, amount: 50000 });
      expect(first.body.consumption.bonusPoints).toBe(50);

      await request(app.getHttpServer())
        .patch(`/api/consumos/${first.body.consumption.code}/anular`)
        .set(headers)
        .send({ reason: 'cargado por error' })
        .expect(200);

      const second = await request(app.getHttpServer()).post('/api/consumos').set(headers).send({ customerId: customer.id, amount: 50000 });

      expect(second.body.consumption.bonusPoints).toBe(50); // vuelve a recibirla
      expect(second.status).toBe(201);
    });

    it('cliente con deuda: el consumo cancela la deuda primero', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.e@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.e@example.com', documentNumber: '38456005' });
      await prisma.customerPoints.create({
        data: { customerId: customer.id, balance: -200, debt: 200, lifetimePoints: 300 },
      });

      const response = await request(app.getHttpServer())
        .post('/api/consumos')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ customerId: customer.id, amount: 50000 }); // 500 pts

      expect(response.body.balanceBefore).toBe(-200);
      expect(response.body.balanceAfter).toBe(300); // -200 + 500
      const balance = await prisma.customerPoints.findUnique({ where: { customerId: customer.id } });
      expect(balance?.debt).toBe(0);
      const lot = await prisma.pointsLot.findUnique({ where: { consumptionId: response.body.consumption.id } });
      expect(lot?.initialPoints).toBe(300); // 500 - 200 cancelados
    });

    it('subida de nivel: levelUp true cuando cruza el umbral de Plata', async () => {
      await setConfig({ silverMinPoints: 300, goldMinPoints: 800 });
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.f@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.f@example.com', documentNumber: '38456006' });

      const response = await request(app.getHttpServer())
        .post('/api/consumos')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ customerId: customer.id, amount: 50000 }); // 500 pts: Bronce -> Plata

      expect(response.body.levelBefore).toBe('BRONZE');
      expect(response.body.levelAfter).toBe('SILVER');
      expect(response.body.levelUp).toBe(true);
    });

    it('400 si llegan campos que el servidor decide (CA-21.6)', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.g@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.g@example.com', documentNumber: '38456007' });

      const response = await request(app.getHttpServer())
        .post('/api/consumos')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ customerId: customer.id, amount: 50000, points: 999 });

      expect(response.status).toBe(400);
    });

    it('409 CUSTOMER_INACTIVE si el cliente está dado de baja', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.h@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.h@example.com', documentNumber: '38456008', active: false });

      const response = await request(app.getHttpServer())
        .post('/api/consumos')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ customerId: customer.id, amount: 50000 });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('CUSTOMER_INACTIVE');
    });

    it('409 POINTS_EQUIVALENCE_NOT_CONFIGURED si no hay equivalencia configurada', async () => {
      await setConfig({ baseAmount: null, pointsAwarded: null });
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.i@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.i@example.com', documentNumber: '38456009' });

      const response = await request(app.getHttpServer())
        .post('/api/consumos')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ customerId: customer.id, amount: 50000 });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('POINTS_EQUIVALENCE_NOT_CONFIGURED');
    });

    it('403 si lo pide un Cliente', async () => {
      await setConfig();
      const customer = await seedCustomer({ email: 'cliente.j@example.com', documentNumber: '38456010' });

      const response = await request(app.getHttpServer())
        .post('/api/consumos')
        .set(authHeaders('CUSTOMER', 1))
        .send({ customerId: customer.id, amount: 50000 });

      expect(response.status).toBe(403);
    });

    it('el consumo conserva el snapshot de la equivalencia después de que cambie la configuración', async () => {
      await setConfig({ baseAmount: 1000, pointsAwarded: 10 });
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.k@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.k@example.com', documentNumber: '38456011' });

      const response = await request(app.getHttpServer())
        .post('/api/consumos')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ customerId: customer.id, amount: 50000 });
      expect(response.body.consumption.points).toBe(500);

      // Cambia la equivalencia (nueva versión activa)
      await prisma.loyaltyProgramConfiguration.update({ where: { version: 1 }, data: { isActive: false } });
      await prisma.loyaltyProgramConfiguration.create({
        data: { version: 2, baseAmount: 500, pointsAwarded: 10, isActive: true, silverMinPoints: 300, goldMinPoints: 800 },
      });

      const stored = await prisma.consumption.findUnique({ where: { id: response.body.consumption.id } });
      expect(Number(stored?.baseAmount)).toBe(1000);
      expect(stored?.pointsAwarded).toBe(10);
      expect(stored?.configurationVersion).toBe(1);
    });
  });

  describe('PATCH /api/consumos/:code/anular (US-22)', () => {
    it('Cajero anula su propio consumo dentro de las 24 hs -> 200, revierte todo', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.l@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.l@example.com', documentNumber: '38456012' });
      const headers = authHeaders('CASHIER', account.id, employee.id);
      const consumption = await registerConsumption(headers, customer.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/consumos/${consumption.code}/anular`)
        .set(headers)
        .send({ reason: 'cargado por error' });

      expect(response.status).toBe(200);
      expect(response.body.consumption.status).toBe('VOIDED');
      expect(response.body.balanceAfter).toBe(0);
      const balance = await prisma.customerPoints.findUnique({ where: { customerId: customer.id } });
      expect(balance?.balance).toBe(0);
      expect(balance?.debt).toBe(0);
    });

    it('Cajero NO puede anular un consumo ajeno -> 403 VOID_NOT_ALLOWED', async () => {
      await setConfig();
      const { employee: e1, account: a1 } = await seedEmployeeWithAccount({ email: 'cajero.m1@vitto.club', role: 'CASHIER' });
      const { employee: e2, account: a2 } = await seedEmployeeWithAccount({ email: 'cajero.m2@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.m@example.com', documentNumber: '38456013' });
      const consumption = await registerConsumption(authHeaders('CASHIER', a1.id, e1.id), customer.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/consumos/${consumption.code}/anular`)
        .set(authHeaders('CASHIER', a2.id, e2.id))
        .send({ reason: 'motivo válido' });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('VOID_NOT_ALLOWED');
    });

    it('Cajero NO puede anular su propio consumo pasadas las 24 hs -> 403', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.n@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.n@example.com', documentNumber: '38456014' });
      const consumption = await registerConsumption(authHeaders('CASHIER', account.id, employee.id), customer.id);
      // Lo "envejezco" directo en la base: se registró hace 25 hs.
      await prisma.consumption.update({
        where: { id: consumption.id },
        data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/consumos/${consumption.code}/anular`)
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ reason: 'motivo válido' });

      expect(response.status).toBe(403);
    });

    it('Administrador anula cualquier consumo, sin límite de tiempo ni de dueño', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.o@vitto.club', role: 'CASHIER' });
      const { employee: adminEmployee, account: adminAccount } = await seedEmployeeWithAccount({ email: 'admin.o@vitto.club', role: 'ADMIN' });
      const customer = await seedCustomer({ email: 'cliente.o@example.com', documentNumber: '38456015' });
      const consumption = await registerConsumption(authHeaders('CASHIER', account.id, employee.id), customer.id);
      await prisma.consumption.update({
        where: { id: consumption.id },
        data: { createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/consumos/${consumption.code}/anular`)
        .set(authHeaders('ADMIN', adminAccount.id, adminEmployee.id))
        .send({ reason: 'motivo válido' });

      expect(response.status).toBe(200);
    });

    it('409 CONSUMPTION_ALREADY_VOIDED si ya estaba anulado', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.p@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.p@example.com', documentNumber: '38456016' });
      const headers = authHeaders('CASHIER', account.id, employee.id);
      const consumption = await registerConsumption(headers, customer.id);
      await request(app.getHttpServer()).patch(`/api/consumos/${consumption.code}/anular`).set(headers).send({ reason: 'motivo válido' });

      const response = await request(app.getHttpServer())
        .patch(`/api/consumos/${consumption.code}/anular`)
        .set(headers)
        .send({ reason: 'otro motivo' });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('CONSUMPTION_ALREADY_VOIDED');
    });

    it('400 si el motivo tiene menos de 5 caracteres', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.q@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.q@example.com', documentNumber: '38456017' });
      const headers = authHeaders('CASHIER', account.id, employee.id);
      const consumption = await registerConsumption(headers, customer.id);

      const response = await request(app.getHttpServer())
        .patch(`/api/consumos/${consumption.code}/anular`)
        .set(headers)
        .send({ reason: 'ab' });

      expect(response.status).toBe(400);
    });

    it('400 si el código no respeta el formato ^C-\\d{6}$', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.r@vitto.club', role: 'CASHIER' });

      const response = await request(app.getHttpServer())
        .patch('/api/consumos/131/anular')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ reason: 'motivo válido' });

      expect(response.status).toBe(400);
    });

    it('404 si el código no existe', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.s@vitto.club', role: 'CASHIER' });

      const response = await request(app.getHttpServer())
        .patch('/api/consumos/C-999999/anular')
        .set(authHeaders('CASHIER', account.id, employee.id))
        .send({ reason: 'motivo válido' });

      expect(response.status).toBe(404);
    });

    it('lote parcialmente gastado: la anulación deja saldo negativo y deuda', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.t@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.t@example.com', documentNumber: '38456018' });
      const headers = authHeaders('CASHIER', account.id, employee.id);
      const consumption = await registerConsumption(headers, customer.id); // 500 pts

      // Simulo que ya se gastaron 300 de esos 500 (ej. un ajuste, fuera de mi alcance).
      await prisma.pointsLot.update({
        where: { consumptionId: consumption.id },
        data: { remainingPoints: 200 },
      });
      await prisma.customerPoints.update({ where: { customerId: customer.id }, data: { balance: 200 } });

      const response = await request(app.getHttpServer())
        .patch(`/api/consumos/${consumption.code}/anular`)
        .set(headers)
        .send({ reason: 'motivo válido' });

      expect(response.status).toBe(200);
      expect(response.body.balanceAfter).toBe(-300); // 200 - 500
      expect(response.body.negativeBalance).toBe(true);
      const balance = await prisma.customerPoints.findUnique({ where: { customerId: customer.id } });
      expect(balance?.debt).toBe(300);
    });

    it('el nivel puede bajar después de anular (lifetimePoints vuelve atrás)', async () => {
      await setConfig({ silverMinPoints: 300, goldMinPoints: 800 });
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.u@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.u@example.com', documentNumber: '38456019' });
      const headers = authHeaders('CASHIER', account.id, employee.id);
      const consumption = await registerConsumption(headers, customer.id); // 500 pts -> Plata

      let balance = await prisma.customerPoints.findUnique({ where: { customerId: customer.id } });
      expect(balance?.lifetimePoints).toBe(500); // Plata (>= 300)

      await request(app.getHttpServer()).patch(`/api/consumos/${consumption.code}/anular`).set(headers).send({ reason: 'motivo válido' }).expect(200);

      balance = await prisma.customerPoints.findUnique({ where: { customerId: customer.id } });
      expect(balance?.lifetimePoints).toBe(0); // vuelve a Bronce
    });

    it('la bonificación se revierte junto con los puntos', async () => {
      await setConfig({ bonusType: 'FIXED_AMOUNT', bonusValue: 50 });
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.v@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.v@example.com', documentNumber: '38456020' });
      const headers = authHeaders('CASHIER', account.id, employee.id);
      const consumption = await registerConsumption(headers, customer.id); // 500 + 50 bonus = 550
      expect(consumption.totalPoints).toBe(550);

      const response = await request(app.getHttpServer())
        .patch(`/api/consumos/${consumption.code}/anular`)
        .set(headers)
        .send({ reason: 'motivo válido' });

      expect(response.body.balanceAfter).toBe(0); // 550 - 550
    });
  });

  describe('GET /api/customers/:id/consumos (US-22)', () => {
    it('el Cajero solo ve las últimas 24 hs aunque mande last24h=false', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.w@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.w@example.com', documentNumber: '38456021' });
      const headers = authHeaders('CASHIER', account.id, employee.id);
      const recent = await registerConsumption(headers, customer.id);
      const old = await registerConsumption(headers, customer.id, 1000);
      await prisma.consumption.update({ where: { id: old.id }, data: { createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) } });

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}/consumos`)
        .query({ last24h: 'false' }) // el Cajero lo ignora
        .set(headers);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items[0].id).toBe(recent.id);
    });

    it('el Administrador ve todos por defecto', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.x@vitto.club', role: 'CASHIER' });
      const { account: adminAccount } = await seedEmployeeWithAccount({ email: 'admin.x@vitto.club', role: 'ADMIN' });
      const customer = await seedCustomer({ email: 'cliente.x@example.com', documentNumber: '38456022' });
      const headers = authHeaders('CASHIER', account.id, employee.id);
      await registerConsumption(headers, customer.id);
      const old = await registerConsumption(headers, customer.id, 1000);
      await prisma.consumption.update({ where: { id: old.id }, data: { createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) } });

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}/consumos`)
        .set(authHeaders('ADMIN', adminAccount.id));

      expect(response.body.total).toBe(2);
    });

    it('canVoid/voidableUntil vienen calculados para quien consulta', async () => {
      await setConfig();
      const { employee: e1, account: a1 } = await seedEmployeeWithAccount({ email: 'cajero.y1@vitto.club', role: 'CASHIER' });
      const { employee: e2, account: a2 } = await seedEmployeeWithAccount({ email: 'cajero.y2@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.y@example.com', documentNumber: '38456023' });
      await registerConsumption(authHeaders('CASHIER', a1.id, e1.id), customer.id);

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}/consumos`)
        .set(authHeaders('CASHIER', a2.id, e2.id)); // es de otro cajero

      expect(response.body.items[0].canVoid).toBe(false);
      expect(response.body.items[0].voidableUntil).toBeNull();
    });

    it('404 si el cliente no existe', async () => {
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.z@vitto.club', role: 'CASHIER' });

      const response = await request(app.getHttpServer())
        .get('/api/customers/999999/consumos')
        .set(authHeaders('CASHIER', account.id, employee.id));

      expect(response.status).toBe(404);
    });
  });

  describe('Auditoría (CA-21.5 y CA-22.7)', () => {
    it('registrar audita CONSUMPTION_REGISTERED a nombre del cajero, con el cliente afectado', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.au1@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.au1@example.com', documentNumber: '38456101' });

      const consumption = await registerConsumption(authHeaders('CASHIER', account.id, employee.id), customer.id);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: account.id,
        performedBy: 'Test CASHIER',
        module: 'CONSUMPTIONS',
        actionCode: 'CONSUMPTION_REGISTERED',
        description: `Registró el consumo ${consumption.code} de Carolina Fernández`,
        affectedCustomerId: customer.id,
        affectedCustomerName: 'Carolina Fernández',
        documentType: 'DNI',
        documentNumber: '38456101',
        operationCode: consumption.code,
      });
      expect(rows[0].details).toEqual([
        { label: 'Código de operación', value: consumption.code },
        { label: 'Monto', value: '$50.000' },
        { label: 'Equivalencia aplicada', value: '$1.000 = 10 pts' },
        { label: 'Puntos acreditados', value: '+500 pts' },
        { label: 'Saldo resultante', value: '500 pts' },
      ]);
    });

    it('con bonificación agrega la fila "Bonificación primer consumo"', async () => {
      await setConfig({ bonusType: 'PERCENTAGE', bonusValue: 15 });
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.au2@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.au2@example.com', documentNumber: '38456102' });

      await registerConsumption(authHeaders('CASHIER', account.id, employee.id), customer.id);

      const [row] = await newAuditRows();
      expect((row.details as { label: string }[]).map((detail) => detail.label)).toEqual([
        'Código de operación',
        'Monto',
        'Equivalencia aplicada',
        'Puntos acreditados',
        'Bonificación primer consumo',
        'Saldo resultante',
      ]);
      expect(row.details).toEqual(
        expect.arrayContaining([
          { label: 'Puntos acreditados', value: '+575 pts' },
          { label: 'Bonificación primer consumo', value: '+75 pts' },
          { label: 'Saldo resultante', value: '575 pts' },
        ]),
      );
    });

    it('anular audita CONSUMPTION_VOIDED a nombre de quien anula, con el motivo y el saldo negativo', async () => {
      await setConfig();
      const { employee, account } = await seedEmployeeWithAccount({ email: 'cajero.au3@vitto.club', role: 'CASHIER' });
      const { employee: adminEmployee, account: adminAccount } = await seedEmployeeWithAccount({ email: 'admin.au3@vitto.club', role: 'ADMIN' });
      const customer = await seedCustomer({ email: 'cliente.au3@example.com', documentNumber: '38456103' });
      const cashierHeaders = authHeaders('CASHIER', account.id, employee.id);
      const consumption = await registerConsumption(cashierHeaders, customer.id);
      // Gasta 350 de los 500 con un ajuste, para que la anulación deje deuda
      const adjustment = await request(app.getHttpServer())
        .post(`/api/customers/${customer.id}/ajustes-de-puntos`)
        .set(authHeaders('ADMIN', adminAccount.id, adminEmployee.id))
        .send({ direction: 'SUBTRACT', points: 350, reason: 'Gasto de prueba' });
      expect(adjustment.status).toBe(201);
      lastAuditId = await lastAuditIdNow();

      const response = await request(app.getHttpServer())
        .patch(`/api/consumos/${consumption.code}/anular`)
        .set(authHeaders('ADMIN', adminAccount.id, adminEmployee.id))
        .send({ reason: 'Consumo registrado al cliente equivocado.' });
      expect(response.status).toBe(200);
      expect(response.body.balanceAfter).toBe(-350);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: adminAccount.id,
        performedBy: 'Test ADMIN',
        module: 'CONSUMPTIONS',
        actionCode: 'CONSUMPTION_VOIDED',
        description: `Anuló el consumo ${consumption.code} de Carolina Fernández`,
        affectedCustomerId: customer.id,
        operationCode: consumption.code,
      });
      expect(rows[0].details).toEqual([
        { label: 'Código de operación', value: consumption.code },
        { label: 'Monto', value: '$50.000' },
        { label: 'Puntos revertidos', value: '−500 pts' },
        { label: 'Saldo resultante', value: '-350 pts' },
        { label: 'Motivo', value: 'Consumo registrado al cliente equivocado.' },
      ]);
    });

    it('un registro o una anulación rechazados no auditan nada', async () => {
      await setConfig();
      const { employee: e1, account: a1 } = await seedEmployeeWithAccount({ email: 'cajero.au4a@vitto.club', role: 'CASHIER' });
      const { employee: e2, account: a2 } = await seedEmployeeWithAccount({ email: 'cajero.au4b@vitto.club', role: 'CASHIER' });
      const customer = await seedCustomer({ email: 'cliente.au4@example.com', documentNumber: '38456104' });
      const inactive = await seedCustomer({ email: 'cliente.au4i@example.com', documentNumber: '38456105', active: false });
      const own = authHeaders('CASHIER', a1.id, e1.id);
      const other = authHeaders('CASHIER', a2.id, e2.id);
      const consumption = await registerConsumption(own, customer.id);
      const server = app.getHttpServer();
      const voidWith = (headers: Record<string, string>, code: string, reason: string) =>
        request(server).patch(`/api/consumos/${code}/anular`).set(headers).send({ reason });

      lastAuditId = await lastAuditIdNow();
      const statuses = [
        // 409 CUSTOMER_INACTIVE
        (await request(server).post('/api/consumos').set(own).send({ customerId: inactive.id, amount: 50000 })).status,
        // 403 VOID_NOT_ALLOWED: el consumo es de otro cajero
        (await voidWith(other, consumption.code, 'motivo válido')).status,
        // 400: motivo de menos de 5 caracteres
        (await voidWith(own, consumption.code, 'ab')).status,
        // 404: el código no existe
        (await voidWith(own, 'C-999999', 'motivo válido')).status,
      ];
      expect(await newAuditRows()).toHaveLength(0);

      expect((await voidWith(own, consumption.code, 'motivo válido')).status).toBe(200);
      lastAuditId = await lastAuditIdNow();
      // 409 CONSUMPTION_ALREADY_VOIDED
      statuses.push((await voidWith(own, consumption.code, 'otro motivo')).status);

      expect(statuses).toEqual([409, 403, 400, 404, 409]);
      expect(await newAuditRows()).toHaveLength(0);
    });
  });
});
