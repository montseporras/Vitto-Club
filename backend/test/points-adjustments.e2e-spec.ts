import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// Cubre US-24 (§3.5.1 y la auditoría POINTS_ADJUSTED de §3.9.3) contra Postgres real.
describe('Ajustar puntos (e2e)', () => {
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

    // Mismo mecanismo que points-movements.e2e-spec.ts: el token se arma con los headers de test
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

  // Limpia al terminar: los movimientos referencian cuentas y clientes (onDelete Restrict), y las
  // suites que corren después borran esas tablas sin saber de puntos.
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
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
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

  const customerHeaders = (customerId: number) => ({
    'x-test-auth-role': 'CUSTOMER',
    'x-test-account-id': '999',
    'x-test-customer-id': String(customerId),
  });

  // Escenario:
  // - Martín, con deuda: saldo -350 (deuda 350) y 1000 acumulados.
  // - Carolina, con dos lotes: 200 que vencen antes y 300 después (saldo 500).
  // - Lucas, dado de baja.
  async function seedScenario() {
    const admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Valeria', 'Vitto');
    const cashier = await seedEmployee('cajero@vitto.club', 'CASHIER', 'Bruno', 'Pérez');

    const martin = await prisma.customer.create({
      data: { firstName: 'Martín', lastName: 'Gómez', documentType: 'DNI', documentNumber: '41987654', email: 'martin@example.com' },
    });
    await prisma.customerPoints.create({
      data: { customerId: martin.id, balance: -350, debt: 350, lifetimePoints: 1000 },
    });

    const carolina = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
    });
    await prisma.customerPoints.create({
      data: { customerId: carolina.id, balance: 500, debt: 0, lifetimePoints: 500 },
    });
    const soonerLot = await prisma.pointsLot.create({
      data: {
        customerId: carolina.id,
        initialPoints: 200,
        remainingPoints: 200,
        accreditedAt: new Date('2026-01-01T15:00:00.000Z'),
        expiresAt: new Date('2027-01-01T15:00:00.000Z'),
      },
    });
    const laterLot = await prisma.pointsLot.create({
      data: {
        customerId: carolina.id,
        initialPoints: 300,
        remainingPoints: 300,
        accreditedAt: new Date('2026-02-01T15:00:00.000Z'),
        expiresAt: new Date('2027-02-01T15:00:00.000Z'),
      },
    });

    const lucas = await prisma.customer.create({
      data: {
        firstName: 'Lucas',
        lastName: 'Ríos',
        documentType: 'DNI',
        documentNumber: '30111222',
        email: 'lucas@example.com',
        isActive: false,
        deactivatedAt: new Date('2026-09-01T15:00:00.000Z'),
      },
    });

    return { admin, cashier, martin, carolina, soonerLot, laterLot, lucas };
  }

  type Scenario = Awaited<ReturnType<typeof seedScenario>>;

  const adjust = (s: Scenario, customerId: number, body: object) =>
    request(app.getHttpServer())
      .post(`/api/customers/${customerId}/ajustes-de-puntos`)
      .set(staffHeaders('ADMIN', s.admin))
      .send(body);

  const REGULARIZATION = 'Regularización por anulación de consumo';

  describe('ADD (CA-24.2)', () => {
    it('con deuda: regulariza a 0, no crea lote y responde la forma de §3.5.1', async () => {
      const s = await seedScenario();

      const res = await adjust(s, s.martin.id, { direction: 'ADD', points: 350, reason: REGULARIZATION });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        movement: {
          id: expect.any(Number),
          createdAt: expect.stringMatching(ISO_INSTANT),
          type: 'MANUAL_ADJUSTMENT',
          points: 350,
          balanceAfter: 0,
          description: `Ajuste: ${REGULARIZATION}`,
          reason: REGULARIZATION,
          performedBy: { actorType: 'EMPLOYEE', accountId: s.admin.account.id, name: 'Valeria Vitto' },
        },
        balanceBefore: -350,
        balanceAfter: 0,
      });

      const balance = await prisma.customerPoints.findUnique({ where: { customerId: s.martin.id } });
      expect(balance).toMatchObject({ balance: 0, debt: 0, lifetimePoints: 1000 });
      expect(await prisma.pointsLot.count({ where: { customerId: s.martin.id } })).toBe(0);

      const movement = await prisma.pointsMovement.findUnique({ where: { id: res.body.movement.id } });
      expect(movement).toMatchObject({
        customerId: s.martin.id,
        type: 'MANUAL_ADJUSTMENT',
        points: 350,
        balanceAfter: 0,
        reason: REGULARIZATION,
        lotId: null,
        performedByAccountId: s.admin.account.id,
        performedByName: 'Valeria Vitto',
      });
    });

    it('con deuda y de más: cancela la deuda y crea un lote con lo que sobra, con la vigencia vigente', async () => {
      const s = await seedScenario();

      const res = await adjust(s, s.martin.id, { direction: 'ADD', points: 500, reason: 'Compensación' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ balanceBefore: -350, balanceAfter: 150 });
      const lots = await prisma.pointsLot.findMany({ where: { customerId: s.martin.id } });
      expect(lots).toHaveLength(1);
      expect(lots[0]).toMatchObject({ initialPoints: 150, remainingPoints: 150, status: 'ACTIVE', consumptionId: null });
      // 12 meses de vigencia desde la acreditación
      const expected = new Date(lots[0].accreditedAt);
      expected.setUTCMonth(expected.getUTCMonth() + 12);
      expect(lots[0].expiresAt.toISOString()).toBe(expected.toISOString());
    });

    it('sin deuda: crea un lote con todo y no toca los acumulados', async () => {
      const s = await seedScenario();

      const res = await adjust(s, s.carolina.id, { direction: 'ADD', points: 100, reason: 'Bienvenida' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ balanceBefore: 500, balanceAfter: 600, movement: { points: 100 } });
      expect(await prisma.pointsLot.count({ where: { customerId: s.carolina.id, status: 'ACTIVE' } })).toBe(3);
      const balance = await prisma.customerPoints.findUnique({ where: { customerId: s.carolina.id } });
      expect(balance).toMatchObject({ balance: 600, lifetimePoints: 500 });
    });

    it('un cliente sin movimientos (sin fila de saldo) también se puede ajustar', async () => {
      const s = await seedScenario();
      const nuevo = await prisma.customer.create({
        data: { firstName: 'Sofía', lastName: 'Luna', documentType: 'DNI', documentNumber: '40111222', email: 'sofia@example.com' },
      });

      const res = await adjust(s, nuevo.id, { direction: 'ADD', points: 50, reason: 'Bienvenida' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ balanceBefore: 0, balanceAfter: 50 });
    });
  });

  describe('SUBTRACT (CA-24.3)', () => {
    it('descuenta en orden de vencimiento (FIFO) y el movimiento va con signo menos', async () => {
      const s = await seedScenario();

      const res = await adjust(s, s.carolina.id, { direction: 'SUBTRACT', points: 250, reason: 'Corrección' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        balanceBefore: 500,
        balanceAfter: 250,
        movement: { points: -250, balanceAfter: 250, description: 'Ajuste: Corrección' },
      });
      const sooner = await prisma.pointsLot.findUnique({ where: { id: s.soonerLot.id } });
      const later = await prisma.pointsLot.findUnique({ where: { id: s.laterLot.id } });
      expect(sooner).toMatchObject({ remainingPoints: 0, status: 'CONSUMED' });
      expect(later).toMatchObject({ remainingPoints: 250, status: 'ACTIVE' });
      const movement = await prisma.pointsMovement.findUnique({ where: { id: res.body.movement.id } });
      expect(movement).toMatchObject({ points: -250, lotId: null });
    });

    it('puede dejar el saldo en 0 justo', async () => {
      const s = await seedScenario();

      const res = await adjust(s, s.carolina.id, { direction: 'SUBTRACT', points: 500, reason: 'Corrección' });

      expect(res.status).toBe(201);
      expect(res.body.balanceAfter).toBe(0);
    });

    it.each([
      ['mayor que el saldo', 'carolina', 501],
      ['con saldo negativo', 'martin', 1],
    ] as const)('%s → 409 INSUFFICIENT_BALANCE y no queda nada escrito', async (_case, who, points) => {
      const s = await seedScenario();
      const customer = s[who];
      const before = await prisma.customerPoints.findUnique({ where: { customerId: customer.id } });

      const res = await adjust(s, customer.id, { direction: 'SUBTRACT', points, reason: 'Corrección' });

      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        code: 'INSUFFICIENT_BALANCE',
        message: 'No se puede restar más que el saldo disponible.',
      });
      expect(await prisma.customerPoints.findUnique({ where: { customerId: customer.id } })).toEqual(before);
      expect(await prisma.pointsMovement.count()).toBe(0);
      expect(await prisma.pointsLot.count({ where: { customerId: customer.id, status: 'ACTIVE' } })).toBe(
        who === 'carolina' ? 2 : 0,
      );
      expect(await newAuditRows()).toHaveLength(0);
    });
  });

  it('el nivel no cambia: lifetimePoints queda igual al sumar y al restar (CA-24.4)', async () => {
    const s = await seedScenario();

    await adjust(s, s.carolina.id, { direction: 'ADD', points: 1000, reason: 'Compensación' }).expect(201);
    await adjust(s, s.carolina.id, { direction: 'SUBTRACT', points: 300, reason: 'Corrección' }).expect(201);

    const balance = await prisma.customerPoints.findUnique({ where: { customerId: s.carolina.id } });
    expect(balance).toMatchObject({ balance: 1200, lifetimePoints: 500 });
    const summary = await request(app.getHttpServer())
      .get(`/api/customers/${s.carolina.id}/movimientos`)
      .set(staffHeaders('ADMIN', s.admin));
    expect(summary.status).toBe(200);
    expect(summary.body.items.map((item: { points: number }) => item.points)).toEqual([-300, 1000]);
  });

  describe('validaciones (CA-24.5)', () => {
    it.each([
      [{ direction: 'ADD', reason: 'Motivo' }, 'Ingresá la cantidad de puntos.'],
      [{ direction: 'ADD', points: 10.5, reason: 'Motivo' }, 'Tiene que ser un número entero mayor a 0.'],
      [{ direction: 'ADD', points: 0, reason: 'Motivo' }, 'Tiene que ser un número entero mayor a 0.'],
      [{ direction: 'ADD', points: -5, reason: 'Motivo' }, 'Tiene que ser un número entero mayor a 0.'],
      [{ direction: 'ADD', points: '10', reason: 'Motivo' }, 'Tiene que ser un número entero mayor a 0.'],
      [{ direction: 'ADD', points: 1_000_001, reason: 'Motivo' }, 'Ingresá un número menor o igual a 1.000.000.'],
      [{ direction: 'ADD', points: 10 }, 'El motivo es obligatorio.'],
      [{ direction: 'ADD', points: 10, reason: '   ' }, 'El motivo es obligatorio.'],
      [{ direction: 'ADD', points: 10, reason: 'a'.repeat(501) }, 'El motivo no puede superar los 500 caracteres.'],
      [{ direction: 'MULTIPLY', points: 10, reason: 'Motivo' }, 'Elegí si querés sumar o restar puntos.'],
      [{ points: 10, reason: 'Motivo' }, 'Elegí si querés sumar o restar puntos.'],
    ])('%j → 400 "%s" y no se escribe nada', async (body, message) => {
      const s = await seedScenario();

      const res = await adjust(s, s.carolina.id, body);

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual([message]);
      expect(await prisma.pointsMovement.count()).toBe(0);
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('rechaza campos que el servidor decide (quién ajusta)', async () => {
      const s = await seedScenario();

      const res = await adjust(s, s.carolina.id, {
        direction: 'ADD',
        points: 10,
        reason: 'Motivo',
        performedByAccountId: 1,
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(['property performedByAccountId should not exist']);
    });

    it('recorta el motivo antes de guardarlo', async () => {
      const s = await seedScenario();

      const res = await adjust(s, s.carolina.id, { direction: 'ADD', points: 10, reason: '  Bienvenida  ' });

      expect(res.status).toBe(201);
      expect(res.body.movement).toMatchObject({ reason: 'Bienvenida', description: 'Ajuste: Bienvenida' });
    });
  });

  describe('cliente (CA-24.6)', () => {
    it('dado de baja → 409 CUSTOMER_INACTIVE', async () => {
      const s = await seedScenario();

      const res = await adjust(s, s.lucas.id, { direction: 'ADD', points: 10, reason: 'Motivo' });

      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ code: 'CUSTOMER_INACTIVE', message: 'El cliente está dado de baja.' });
      expect(await prisma.pointsMovement.count()).toBe(0);
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('inexistente → 404', async () => {
      const s = await seedScenario();

      const res = await adjust(s, 999999, { direction: 'ADD', points: 10, reason: 'Motivo' });

      expect(res.status).toBe(404);
      expect(await newAuditRows()).toHaveLength(0);
    });
  });

  describe('permisos (CA-24.1)', () => {
    it('Cajero → 403 FORBIDDEN', async () => {
      const s = await seedScenario();

      const res = await request(app.getHttpServer())
        .post(`/api/customers/${s.carolina.id}/ajustes-de-puntos`)
        .set(staffHeaders('CASHIER', s.cashier))
        .send({ direction: 'ADD', points: 10, reason: 'Motivo' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('Cliente → 403 FORBIDDEN', async () => {
      const s = await seedScenario();

      const res = await request(app.getHttpServer())
        .post(`/api/customers/${s.carolina.id}/ajustes-de-puntos`)
        .set(customerHeaders(s.carolina.id))
        .send({ direction: 'ADD', points: 10, reason: 'Motivo' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('sin token → 401', async () => {
      const s = await seedScenario();

      const res = await request(app.getHttpServer())
        .post(`/api/customers/${s.carolina.id}/ajustes-de-puntos`)
        .send({ direction: 'ADD', points: 10, reason: 'Motivo' });

      expect(res.status).toBe(401);
      expect(await prisma.pointsMovement.count()).toBe(0);
    });
  });

  describe('auditoría (CA-24.10)', () => {
    it('escribe POINTS_ADJUSTED con el cliente afectado y Cantidad · Saldo resultante · Motivo', async () => {
      const s = await seedScenario();

      await adjust(s, s.martin.id, { direction: 'ADD', points: 350, reason: REGULARIZATION }).expect(201);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: s.admin.account.id,
        performedBy: 'Valeria Vitto',
        module: 'POINTS',
        actionCode: 'POINTS_ADJUSTED',
        description: 'Ajustó puntos de Martín Gómez',
        affectedCustomerId: s.martin.id,
        affectedCustomerName: 'Martín Gómez',
        documentType: 'DNI',
        documentNumber: '41987654',
        operationCode: null,
        details: [
          { label: 'Cantidad', value: '+350 pts' },
          { label: 'Saldo resultante', value: '0 pts' },
          { label: 'Motivo', value: REGULARIZATION },
        ],
      });
    });

    it('al restar: Cantidad con el signo menos y puntos de miles', async () => {
      const s = await seedScenario();
      await adjust(s, s.carolina.id, { direction: 'ADD', points: 1500, reason: 'Compensación' }).expect(201);
      lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;

      await adjust(s, s.carolina.id, { direction: 'SUBTRACT', points: 1200, reason: 'Corrección' }).expect(201);

      const rows = await newAuditRows();
      expect(rows[0].details).toEqual([
        { label: 'Cantidad', value: '−1.200 pts' },
        { label: 'Saldo resultante', value: '800 pts' },
        { label: 'Motivo', value: 'Corrección' },
      ]);
    });
  });
});
