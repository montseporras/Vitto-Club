import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Día YYYY-MM-DD en hora de Argentina (UTC-3) de un instante
function argentinaDay(date: Date): string {
  return new Date(date.getTime() - 3 * HOUR_MS).toISOString().slice(0, 10);
}

// Cubre US-26 (§3.6.1, §3.6.2 y §3.10.2) contra Postgres real. Los créditos y la reversión se
// generan con los endpoints reales de US-21/US-22; los ajustes (US-24) y los vencimientos (US-25)
// todavía no tienen código, así que esos movimientos se siembran directo en la base.
describe('Movimientos de puntos (e2e)', () => {
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

  async function seedEmployee(email: string, role: 'ADMIN' | 'CASHIER', firstName: string) {
    const employee = await prisma.employee.create({
      data: { firstName, lastName: 'Gómez', phone: '3510000000', email, role, isActive: true },
    });
    const account = await prisma.account.create({
      data: { email, passwordHash: 'hashed:secreta123', role, isActive: true, employeeId: employee.id },
    });
    return { employee, account };
  }

  type Staff = Awaited<ReturnType<typeof seedEmployee>>;

  function staffHeaders(role: 'ADMIN' | 'CASHIER', staff: Staff) {
    return {
      'x-test-auth-role': role,
      'x-test-account-id': String(staff.account.id),
      'x-test-employee-id': String(staff.employee.id),
    };
  }

  function customerHeaders(customerId: number) {
    return { 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '999', 'x-test-customer-id': String(customerId) };
  }

  // Escenario: Carolina con un movimiento de cada tipo, y José Pérez con un ajuste
  async function seedScenario() {
    const admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Ana');
    const cashier = await seedEmployee('cajero@vitto.club', 'CASHIER', 'Bruno');
    const carolina = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
    });
    const jose = await prisma.customer.create({
      data: { firstName: 'José', lastName: 'Pérez', documentType: 'PASSPORT', documentNumber: 'AA30111222', email: 'jose@example.com' },
    });
    const now = Date.now();

    // Vencimiento de hace 2 días (fuera de las 24 h del Cajero), hecho por el Sistema
    const expiredLot = await prisma.pointsLot.create({
      data: {
        customerId: carolina.id,
        initialPoints: 100,
        remainingPoints: 100,
        accreditedAt: new Date('2025-08-16T15:00:00.000Z'),
        expiresAt: new Date('2026-08-16T15:00:00.000Z'),
        status: 'EXPIRED',
        expiredAt: new Date(now - 2 * DAY_MS),
      },
    });
    const expiration = await prisma.pointsMovement.create({
      data: {
        customerId: carolina.id,
        lotId: expiredLot.id,
        type: 'EXPIRATION',
        points: -100,
        balanceAfter: 0,
        performedByAccountId: null,
        performedByName: 'Sistema',
        createdAt: new Date(now - 2 * DAY_MS),
      },
    });

    // Ajuste ADD que creó lote, hace 1 hora
    const adjustmentLot = await prisma.pointsLot.create({
      data: {
        customerId: carolina.id,
        initialPoints: 50,
        remainingPoints: 50,
        accreditedAt: new Date(now - HOUR_MS),
        expiresAt: new Date('2027-10-01T15:00:00.000Z'),
      },
    });
    const adjustment = await prisma.pointsMovement.create({
      data: {
        customerId: carolina.id,
        lotId: adjustmentLot.id,
        type: 'MANUAL_ADJUSTMENT',
        points: 50,
        balanceAfter: 50,
        reason: 'Compensación por demora',
        performedByAccountId: admin.account.id,
        performedByName: 'Ana Gómez',
        createdAt: new Date(now - HOUR_MS),
      },
    });

    // Ajuste de José, hace 30 minutos
    await prisma.pointsMovement.create({
      data: {
        customerId: jose.id,
        type: 'MANUAL_ADJUSTMENT',
        points: 30,
        balanceAfter: 30,
        reason: 'Bienvenida',
        performedByAccountId: admin.account.id,
        performedByName: 'Ana Gómez',
        createdAt: new Date(now - HOUR_MS / 2),
      },
    });

    // Dos consumos reales (US-21) y la anulación del segundo (US-22)
    const headers = staffHeaders('CASHIER', cashier);
    const first = await request(app.getHttpServer())
      .post('/api/consumos')
      .set(headers)
      .send({ customerId: carolina.id, amount: 50000 });
    const second = await request(app.getHttpServer())
      .post('/api/consumos')
      .set(headers)
      .send({ customerId: carolina.id, amount: 20000 });
    await request(app.getHttpServer())
      .patch(`/api/consumos/${second.body.consumption.code}/anular`)
      .set(headers)
      .send({ reason: 'Error de carga' });

    return {
      admin,
      cashier,
      carolina,
      jose,
      expiration,
      adjustment,
      expiredLot,
      adjustmentLot,
      firstConsumption: first.body.consumption as { id: number; code: string },
      secondConsumption: second.body.consumption as { id: number; code: string },
    };
  }

  describe('GET /api/customers/:id/movimientos (§3.6.1)', () => {
    it('Administrador: un movimiento de cada tipo, con description, orden y forma completa', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${s.carolina.id}/movimientos`)
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 5, page: 1, limit: 20 });
      const items = response.body.items;
      expect(items.map((item: { type: string }) => item.type)).toEqual([
        'VOID_REVERSAL',
        'CONSUMPTION_CREDIT',
        'CONSUMPTION_CREDIT',
        'MANUAL_ADJUSTMENT',
        'EXPIRATION',
      ]);
      expect(items.map((item: { description: string }) => item.description)).toEqual([
        `Anulación de ${s.secondConsumption.code}`,
        `Consumo ${s.secondConsumption.code}`,
        `Consumo ${s.firstConsumption.code}`,
        'Ajuste: Compensación por demora',
        'Vencimiento de lote del 16/08/2025',
      ]);

      const customer = {
        id: s.carolina.id,
        firstName: 'Carolina',
        lastName: 'Fernández',
        documentType: 'DNI',
        documentNumber: '38456001',
      };
      const cashierActor = { actorType: 'EMPLOYEE', accountId: s.cashier.account.id, name: 'Bruno Gómez' };

      // Reversión: sin lote (decisión: lot null), con consumptionCode
      expect(items[0]).toEqual({
        id: expect.any(Number),
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        customer,
        type: 'VOID_REVERSAL',
        points: -200,
        balanceAfter: 500,
        description: `Anulación de ${s.secondConsumption.code}`,
        consumptionCode: s.secondConsumption.code,
        reason: null,
        lot: null,
        performedBy: cashierActor,
      });

      // Crédito anulado: el lote quedó VOIDED, Anulado (decisión #11, revisada el 20/10/2026)
      expect(items[1]).toMatchObject({
        points: 200,
        consumptionCode: s.secondConsumption.code,
        reason: null,
        lot: { status: 'VOIDED', expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
        performedBy: cashierActor,
      });

      // Crédito vigente: lote ACTIVE con accreditedAt ISO y expiresAt YYYY-MM-DD
      expect(items[2]).toMatchObject({ points: 500, consumptionCode: s.firstConsumption.code });
      expect(items[2].lot).toEqual({
        id: expect.any(Number),
        accreditedAt: expect.stringMatching(/Z$/),
        expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        status: 'ACTIVE',
      });

      // Ajuste ADD con lote
      expect(items[3]).toMatchObject({
        id: s.adjustment.id,
        points: 50,
        consumptionCode: null,
        reason: 'Compensación por demora',
        lot: {
          id: s.adjustmentLot.id,
          accreditedAt: s.adjustmentLot.accreditedAt.toISOString(),
          expiresAt: '2027-10-01',
          status: 'ACTIVE',
        },
        performedBy: { actorType: 'EMPLOYEE', accountId: s.admin.account.id, name: 'Ana Gómez' },
      });

      // Vencimiento del Sistema
      expect(items[4]).toEqual({
        id: s.expiration.id,
        createdAt: s.expiration.createdAt.toISOString(),
        customer,
        type: 'EXPIRATION',
        points: -100,
        balanceAfter: 0,
        description: 'Vencimiento de lote del 16/08/2025',
        consumptionCode: null,
        reason: null,
        lot: { id: s.expiredLot.id, accreditedAt: '2025-08-16T15:00:00.000Z', expiresAt: '2026-08-16', status: 'EXPIRED' },
        performedBy: { actorType: 'SYSTEM', accountId: null, name: 'Sistema' },
      });
    });

    it('a igual fecha, ordena por id descendente', async () => {
      const s = await seedScenario();
      const sameDate = new Date(Date.now() - 3 * DAY_MS);
      const older = await prisma.pointsMovement.create({
        data: {
          customerId: s.jose.id, type: 'MANUAL_ADJUSTMENT', points: 1, balanceAfter: 31, reason: 'a',
          performedByAccountId: s.admin.account.id, performedByName: 'Ana Gómez', createdAt: sameDate,
        },
      });
      const newer = await prisma.pointsMovement.create({
        data: {
          customerId: s.jose.id, type: 'MANUAL_ADJUSTMENT', points: 2, balanceAfter: 33, reason: 'b',
          performedByAccountId: s.admin.account.id, performedByName: 'Ana Gómez', createdAt: sameDate,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${s.jose.id}/movimientos`)
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.body.items.map((item: { id: number }) => item.id).slice(1)).toEqual([newer.id, older.id]);
    });

    it('Cajero: solo las últimas 24 h, aunque mande last24h=false', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${s.carolina.id}/movimientos?last24h=false`)
        .set(staffHeaders('CASHIER', s.cashier));

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(4);
      expect(response.body.items.map((item: { type: string }) => item.type)).not.toContain('EXPIRATION');
    });

    it('Administrador con last24h=true: también filtra', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${s.carolina.id}/movimientos?last24h=true`)
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.body.total).toBe(4);
    });

    it('filtro type y paginación', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${s.carolina.id}/movimientos?type=CONSUMPTION_CREDIT&page=2&limit=1`)
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 2, page: 2, limit: 1 });
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].consumptionCode).toBe(s.firstConsumption.code);
    });

    it('cliente sin movimientos: página vacía', async () => {
      const admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Ana');
      const customer = await prisma.customer.create({
        data: { firstName: 'Lucía', lastName: 'Sosa', documentType: 'DNI', documentNumber: '40111222', email: 'lucia@example.com' },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}/movimientos`)
        .set(staffHeaders('ADMIN', admin));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });

    it('cliente inexistente → 404', async () => {
      const admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Ana');

      const response = await request(app.getHttpServer())
        .get('/api/customers/999999/movimientos')
        .set(staffHeaders('ADMIN', admin));

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No existe el cliente 999999.');
    });

    it('id no numérico → 400; type inválido → 400', async () => {
      const admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Ana');

      const badId = await request(app.getHttpServer()).get('/api/customers/abc/movimientos').set(staffHeaders('ADMIN', admin));
      const badType = await request(app.getHttpServer()).get('/api/customers/1/movimientos?type=OTRO').set(staffHeaders('ADMIN', admin));

      expect(badId.status).toBe(400);
      expect(badType.status).toBe(400);
    });

    it('Cliente → 403 FORBIDDEN; sin token → 401', async () => {
      const s = await seedScenario();

      const asCustomer = await request(app.getHttpServer())
        .get(`/api/customers/${s.carolina.id}/movimientos`)
        .set(customerHeaders(s.carolina.id));
      const anonymous = await request(app.getHttpServer()).get(`/api/customers/${s.carolina.id}/movimientos`);

      expect(asCustomer.status).toBe(403);
      expect(asCustomer.body.code).toBe('FORBIDDEN');
      expect(anonymous.status).toBe(401);
    });
  });

  describe('GET /api/movimientos-de-puntos (§3.6.2)', () => {
    it('Administrador: movimientos de todos los clientes', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get('/api/movimientos-de-puntos?limit=10')
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 6, page: 1, limit: 10 });
      expect(response.body.items[0]).toHaveProperty('customer');
      expect(response.body.items[0]).toHaveProperty('performedBy');
    });

    it('Cajero → 403 FORBIDDEN; Cliente → 403; sin token → 401', async () => {
      const s = await seedScenario();

      const asCashier = await request(app.getHttpServer()).get('/api/movimientos-de-puntos').set(staffHeaders('CASHIER', s.cashier));
      const asCustomer = await request(app.getHttpServer()).get('/api/movimientos-de-puntos').set(customerHeaders(s.carolina.id));
      const anonymous = await request(app.getHttpServer()).get('/api/movimientos-de-puntos');

      expect(asCashier.status).toBe(403);
      expect(asCashier.body.code).toBe('FORBIDDEN');
      expect(asCustomer.status).toBe(403);
      expect(anonymous.status).toBe(401);
    });

    it.each(['perez', 'PÉREZ', 'jose perez', 'Jos'])('q="%s" encuentra a José Pérez sin importar tildes ni mayúsculas', async (q) => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get(`/api/movimientos-de-puntos?q=${encodeURIComponent(q)}`)
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items[0].customer.id).toBe(s.jose.id);
    });

    it('q con 3 dígitos o más busca en el documento (parcial)', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get('/api/movimientos-de-puntos?q=38.456')
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.body.total).toBe(5);
      expect(response.body.items.every((item: { customer: { id: number } }) => item.customer.id === s.carolina.id)).toBe(true);
    });

    it('q sin coincidencias → página vacía', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get('/api/movimientos-de-puntos?q=zzz')
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.body).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });

    it('customerId y type', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get(`/api/movimientos-de-puntos?customerId=${s.carolina.id}&type=MANUAL_ADJUSTMENT`)
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.body.total).toBe(1);
      expect(response.body.items[0].id).toBe(s.adjustment.id);
    });

    it('fromDate y toDate: días completos en hora de Argentina', async () => {
      const s = await seedScenario();
      const day = argentinaDay(s.expiration.createdAt);

      const response = await request(app.getHttpServer())
        .get(`/api/movimientos-de-puntos?fromDate=${day}&toDate=${day}`)
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items[0].id).toBe(s.expiration.id);
    });

    it('rango invertido → 400 con details en fromDate', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get('/api/movimientos-de-puntos?fromDate=2026-10-17&toDate=2026-10-16')
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('fromDate no puede ser posterior a toDate');
      expect(response.body.details).toEqual([{ field: 'fromDate', message: 'fromDate no puede ser posterior a toDate' }]);
    });

    it('fecha inválida → 400; q de más de 80 → 400', async () => {
      const s = await seedScenario();

      const badDate = await request(app.getHttpServer())
        .get('/api/movimientos-de-puntos?fromDate=2026-02-30')
        .set(staffHeaders('ADMIN', s.admin));
      const longQ = await request(app.getHttpServer())
        .get(`/api/movimientos-de-puntos?q=${'a'.repeat(81)}`)
        .set(staffHeaders('ADMIN', s.admin));

      expect(badDate.status).toBe(400);
      expect(badDate.body.message).toBe('fromDate no es una fecha válida (YYYY-MM-DD)');
      expect(longQ.status).toBe(400);
    });
  });

  describe('GET /api/customers/me/movimientos (§3.10.2)', () => {
    it('Cliente: solo los suyos, sin performedBy ni customer', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get('/api/customers/me/movimientos')
        .set(customerHeaders(s.carolina.id));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 5, page: 1, limit: 20 });
      for (const item of response.body.items) {
        expect(item).not.toHaveProperty('performedBy');
        expect(item).not.toHaveProperty('customer');
      }
      expect(response.body.items[4]).toEqual({
        id: s.expiration.id,
        createdAt: s.expiration.createdAt.toISOString(),
        type: 'EXPIRATION',
        points: -100,
        balanceAfter: 0,
        description: 'Vencimiento de lote del 16/08/2025',
        consumptionCode: null,
        reason: null,
        lot: { id: s.expiredLot.id, accreditedAt: '2025-08-16T15:00:00.000Z', expiresAt: '2026-08-16', status: 'EXPIRED' },
      });
    });

    it('filtro type', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get('/api/customers/me/movimientos?type=VOID_REVERSAL')
        .set(customerHeaders(s.carolina.id));

      expect(response.body.total).toBe(1);
      expect(response.body.items[0].type).toBe('VOID_REVERSAL');
    });

    it('last24h no existe en esta ruta → 400', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get('/api/customers/me/movimientos?last24h=true')
        .set(customerHeaders(s.carolina.id));

      expect(response.status).toBe(400);
    });

    it('Cajero → 403; Administrador → 403; sin token → 401 (CA-26.7)', async () => {
      const s = await seedScenario();

      const asCashier = await request(app.getHttpServer()).get('/api/customers/me/movimientos').set(staffHeaders('CASHIER', s.cashier));
      const asAdmin = await request(app.getHttpServer()).get('/api/customers/me/movimientos').set(staffHeaders('ADMIN', s.admin));
      const anonymous = await request(app.getHttpServer()).get('/api/customers/me/movimientos');

      expect(asCashier.status).toBe(403);
      expect(asCashier.body.code).toBe('FORBIDDEN');
      expect(asAdmin.status).toBe(403);
      expect(anonymous.status).toBe(401);
    });
  });
});
