import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';

const codeOf = (id: number) => `C-${String(id).padStart(6, '0')}`;

// Cubre US-23 (§3.3.1, §3.3.2 y §3.10.2) contra Postgres real. Los consumos se siembran directo
// en la base para controlar la fecha, el estado y quién los registró.
describe('Consultar consumos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    // Mismo mecanismo que points-movements.e2e-spec.ts
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

  // Limpia al terminar: los consumos referencian cuentas y clientes (onDelete Restrict), y las
  // suites que corren después borran esas tablas sin saber de consumos.
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

  // Escenario:
  // - c1: Carolina, $50.000 (500 + 50 de bonificación), Bruno, 01/10 12:00 AR, REGISTERED
  // - c2: Carolina, $20.000 (200), Bruno, 04/10 23:00 AR (05/10 02:00 UTC), anulado por Ana
  // - c3: José Pérez (pasaporte), $10.000 (100), Ana, 10/10, REGISTERED, con observaciones
  // - c4: Lucía, dada de baja, $30.000 (300), Bruno, 12/10, REGISTERED
  async function seedScenario() {
    const admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Ana');
    const cashier = await seedEmployee('cajero@vitto.club', 'CASHIER', 'Bruno');
    const carolina = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
    });
    const jose = await prisma.customer.create({
      data: { firstName: 'José', lastName: 'Pérez', documentType: 'PASSPORT', documentNumber: 'AA30111222', email: 'jose@example.com' },
    });
    const lucia = await prisma.customer.create({
      data: {
        firstName: 'Lucía',
        lastName: 'Martínez',
        documentType: 'DNI',
        documentNumber: '40111333',
        email: 'lucia@example.com',
        isActive: false,
        deactivatedAt: new Date('2026-10-20T15:00:00.000Z'),
      },
    });

    const base = { configurationVersion: 1, baseAmount: 1000, pointsAwarded: 10 };
    const c1 = await prisma.consumption.create({
      data: {
        ...base,
        customerId: carolina.id,
        amount: 50000,
        points: 500,
        bonusPoints: 50,
        registeredByAccountId: cashier.account.id,
        registeredByName: 'Bruno Gómez',
        createdAt: new Date('2026-10-01T15:00:00.000Z'),
      },
    });
    const c2 = await prisma.consumption.create({
      data: {
        ...base,
        customerId: carolina.id,
        amount: 20000,
        points: 200,
        registeredByAccountId: cashier.account.id,
        registeredByName: 'Bruno Gómez',
        createdAt: new Date('2026-10-05T02:00:00.000Z'),
        status: 'VOIDED',
        voidedAt: new Date('2026-10-05T13:00:00.000Z'),
        voidedByAccountId: admin.account.id,
        voidedByName: 'Ana Gómez',
        voidedReason: 'Monto cargado incorrectamente',
      },
    });
    const c3 = await prisma.consumption.create({
      data: {
        ...base,
        customerId: jose.id,
        amount: 10000,
        points: 100,
        notes: 'Mesa 4',
        registeredByAccountId: admin.account.id,
        registeredByName: 'Ana Gómez',
        createdAt: new Date('2026-10-10T15:00:00.000Z'),
      },
    });
    const c4 = await prisma.consumption.create({
      data: {
        ...base,
        customerId: lucia.id,
        amount: 30000,
        points: 300,
        registeredByAccountId: cashier.account.id,
        registeredByName: 'Bruno Gómez',
        createdAt: new Date('2026-10-12T15:00:00.000Z'),
      },
    });

    return { admin, cashier, carolina, jose, lucia, c1, c2, c3, c4 };
  }

  type Scenario = Awaited<ReturnType<typeof seedScenario>>;

  const listAs = (s: Scenario, query = '') =>
    request(app.getHttpServer()).get(`/api/consumos${query}`).set(staffHeaders('ADMIN', s.admin));

  const codesOf = (body: { items: { code: string }[] }) => body.items.map((item) => item.code);

  describe('GET /api/consumos (§3.3.1)', () => {
    it('200: todos, por createdAt descendente, con totales que no suman los anulados (CA-23.2)', async () => {
      const s = await seedScenario();

      const response = await listAs(s);

      expect(response.status).toBe(200);
      expect(codesOf(response.body)).toEqual([s.c4, s.c3, s.c2, s.c1].map((c) => codeOf(c.id)));
      expect(response.body.total).toBe(4);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      // count incluye el anulado; monto y puntos, no: 50.000 + 10.000 + 30.000 y 550 + 100 + 300
      expect(response.body.totals).toEqual({ count: 4, amountTotal: 90000, pointsTotal: 950 });
    });

    it('forma completa de un ítem anulado, campo por campo (§3.3.3)', async () => {
      const s = await seedScenario();

      const response = await listAs(s, `?customerId=${s.carolina.id}&status=VOIDED`);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toEqual({
        id: s.c2.id,
        code: codeOf(s.c2.id),
        createdAt: '2026-10-05T02:00:00.000Z',
        customer: {
          id: s.carolina.id,
          firstName: 'Carolina',
          lastName: 'Fernández',
          documentType: 'DNI',
          documentNumber: '38456001',
        },
        amount: 20000,
        points: 200,
        bonusPoints: 0,
        totalPoints: 200,
        equivalence: { baseAmount: 1000, pointsAwarded: 10, configurationVersion: 1 },
        notes: null,
        status: 'VOIDED',
        registeredBy: { accountId: s.cashier.account.id, name: 'Bruno Gómez' },
        voidedAt: '2026-10-05T13:00:00.000Z',
        voidedBy: { accountId: s.admin.account.id, name: 'Ana Gómez' },
        voidReason: 'Monto cargado incorrectamente',
        voidableUntil: null,
        canVoid: false,
      });
    });

    it('un REGISTERED trae canVoid true para el Administrador, sin voidableUntil', async () => {
      const s = await seedScenario();

      const response = await listAs(s, `?status=REGISTERED&customerId=${s.jose.id}`);

      expect(response.body.items[0]).toMatchObject({ code: codeOf(s.c3.id), canVoid: true, voidableUntil: null, notes: 'Mesa 4' });
    });

    it('pagina con page y limit', async () => {
      const s = await seedScenario();

      const response = await listAs(s, '?page=2&limit=2');

      expect(codesOf(response.body)).toEqual([s.c2, s.c1].map((c) => codeOf(c.id)));
      expect(response.body).toMatchObject({ total: 4, page: 2, limit: 2 });
      expect(response.body.totals.count).toBe(4);
    });

    it('fromDate y toDate son días completos en hora de Argentina', async () => {
      const s = await seedScenario();

      // c2 es del 04/10 a las 23:00 en Argentina, aunque en UTC ya es 05/10
      const onlyOct4 = await listAs(s, '?fromDate=2026-10-04&toDate=2026-10-04');
      const fromOct5 = await listAs(s, '?fromDate=2026-10-05');
      const untilOct10 = await listAs(s, '?toDate=2026-10-10');

      expect(codesOf(onlyOct4.body)).toEqual([codeOf(s.c2.id)]);
      expect(codesOf(fromOct5.body)).toEqual([s.c4, s.c3].map((c) => codeOf(c.id)));
      expect(codesOf(untilOct10.body)).toEqual([s.c3, s.c2, s.c1].map((c) => codeOf(c.id)));
    });

    it('status=VOIDED: los totales cuentan el consumo pero no suman monto ni puntos', async () => {
      const s = await seedScenario();

      const response = await listAs(s, '?status=VOIDED');

      expect(codesOf(response.body)).toEqual([codeOf(s.c2.id)]);
      expect(response.body.totals).toEqual({ count: 1, amountTotal: 0, pointsTotal: 0 });
    });

    it('registeredByAccountId filtra por quién registró (filtro "Cajero")', async () => {
      const s = await seedScenario();

      const response = await listAs(s, `?registeredByAccountId=${s.admin.account.id}`);

      expect(codesOf(response.body)).toEqual([codeOf(s.c3.id)]);
    });

    it('customerId filtra por cliente ("Ver todos" de la ficha)', async () => {
      const s = await seedScenario();

      const response = await listAs(s, `?customerId=${s.carolina.id}`);

      expect(codesOf(response.body)).toEqual([s.c2, s.c1].map((c) => codeOf(c.id)));
      expect(response.body.totals).toEqual({ count: 2, amountTotal: 50000, pointsTotal: 550 });
    });

    it('q con 3 dígitos o más busca en el documento, con coincidencia parcial', async () => {
      const s = await seedScenario();

      const byDni = await listAs(s, '?q=3845');
      const byPassport = await listAs(s, '?q=aa301');

      expect(codesOf(byDni.body)).toEqual([s.c2, s.c1].map((c) => codeOf(c.id)));
      expect(codesOf(byPassport.body)).toEqual([codeOf(s.c3.id)]);
    });

    it.each(['perez', 'PÉREZ', 'jose perez', 'Jos'])('q="%s" encuentra a José Pérez sin importar tildes ni mayúsculas', async (q) => {
      const s = await seedScenario();

      const response = await listAs(s, `?q=${encodeURIComponent(q)}`);

      expect(codesOf(response.body)).toEqual([codeOf(s.c3.id)]);
    });

    it('incluye los consumos de clientes dados de baja, y q los encuentra (decisión de Jazmín)', async () => {
      const s = await seedScenario();

      const response = await listAs(s, '?q=lucia');

      expect(codesOf(response.body)).toEqual([codeOf(s.c4.id)]);
      expect(response.body.totals).toEqual({ count: 1, amountTotal: 30000, pointsTotal: 300 });
    });

    it('q sin coincidencias: lista vacía y totales en cero', async () => {
      const s = await seedScenario();

      const response = await listAs(s, '?q=zzz');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [], total: 0, page: 1, limit: 20, totals: { count: 0, amountTotal: 0, pointsTotal: 0 } });
    });

    it('400 si fromDate es posterior a toDate (CA-23.3)', async () => {
      const s = await seedScenario();

      const response = await listAs(s, '?fromDate=2026-10-15&toDate=2026-10-01');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('fromDate no puede ser posterior a toDate');
    });

    it('400 con una fecha inexistente, q de más de 80 caracteres o un status que no existe', async () => {
      const s = await seedScenario();

      const badDate = await listAs(s, '?fromDate=2026-02-30');
      const longQ = await listAs(s, `?q=${'a'.repeat(81)}`);
      const badStatus = await listAs(s, '?status=PENDING');

      expect(badDate.status).toBe(400);
      expect(longQ.status).toBe(400);
      expect(badStatus.status).toBe(400);
    });

    it('Cajero → 403 FORBIDDEN; Cliente → 403; sin token → 401 (CA-23.1)', async () => {
      const s = await seedScenario();

      const asCashier = await request(app.getHttpServer()).get('/api/consumos').set(staffHeaders('CASHIER', s.cashier));
      const asCustomer = await request(app.getHttpServer()).get('/api/consumos').set(customerHeaders(s.carolina.id));
      const anonymous = await request(app.getHttpServer()).get('/api/consumos');

      expect(asCashier.status).toBe(403);
      expect(asCashier.body.code).toBe('FORBIDDEN');
      expect(asCustomer.status).toBe(403);
      expect(anonymous.status).toBe(401);
    });
  });

  describe('GET /api/consumos/:code (§3.3.2)', () => {
    const detailAs = (s: Scenario, code: string) =>
      request(app.getHttpServer()).get(`/api/consumos/${code}`).set(staffHeaders('ADMIN', s.admin));

    it('200: consumo anulado, con la equivalencia del snapshot y el bloque de anulación (CA-23.5)', async () => {
      const s = await seedScenario();
      // La configuración actual cambia después del consumo: el detalle sigue mostrando el snapshot
      await prisma.loyaltyProgramConfiguration.update({ where: { version: 1 }, data: { isActive: false } });
      await prisma.loyaltyProgramConfiguration.create({
        data: { version: 2, baseAmount: 500, pointsAwarded: 20, silverMinPoints: 300, goldMinPoints: 800, pointsExpirationMonths: 12, isActive: true },
      });

      const response = await detailAs(s, codeOf(s.c2.id));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        code: codeOf(s.c2.id),
        status: 'VOIDED',
        equivalence: { baseAmount: 1000, pointsAwarded: 10, configurationVersion: 1 },
        registeredBy: { accountId: s.cashier.account.id, name: 'Bruno Gómez' },
        voidedAt: '2026-10-05T13:00:00.000Z',
        voidedBy: { accountId: s.admin.account.id, name: 'Ana Gómez' },
        voidReason: 'Monto cargado incorrectamente',
        totalPoints: 200,
        canVoid: false,
      });
    });

    it('200: consumo registrado, con canVoid true para el botón "Anular consumo"', async () => {
      const s = await seedScenario();

      const response = await detailAs(s, codeOf(s.c3.id));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        code: codeOf(s.c3.id),
        status: 'REGISTERED',
        notes: 'Mesa 4',
        customer: { id: s.jose.id, documentType: 'PASSPORT', documentNumber: 'AA30111222' },
        voidedAt: null,
        voidedBy: null,
        voidReason: null,
        canVoid: true,
        voidableUntil: null,
      });
    });

    it('400 con el mensaje en castellano si el código no respeta el formato (CA-23.6)', async () => {
      const s = await seedScenario();

      const response = await detailAs(s, 'C-141');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('El código C-141 no tiene un formato válido.');
    });

    it('404 si el código no existe (CA-23.6)', async () => {
      const s = await seedScenario();

      const response = await detailAs(s, 'C-999999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No existe el consumo C-999999.');
    });

    it('Cajero → 403 FORBIDDEN, aunque el consumo sea suyo; Cliente → 403; sin token → 401 (CA-23.1)', async () => {
      const s = await seedScenario();
      const path = `/api/consumos/${codeOf(s.c1.id)}`;

      const asCashier = await request(app.getHttpServer()).get(path).set(staffHeaders('CASHIER', s.cashier));
      const asCustomer = await request(app.getHttpServer()).get(path).set(customerHeaders(s.carolina.id));
      const anonymous = await request(app.getHttpServer()).get(path);

      expect(asCashier.status).toBe(403);
      expect(asCashier.body.code).toBe('FORBIDDEN');
      expect(asCustomer.status).toBe(403);
      expect(anonymous.status).toBe(401);
    });

    it('/consumos/preview sigue respondiendo al Cajero (la ruta :code no la tapa)', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get(`/api/consumos/preview?customerId=${s.carolina.id}&amount=1550`)
        .set(staffHeaders('CASHIER', s.cashier));

      expect(response.status).toBe(200);
      expect(response.body.points).toBe(15);
    });
  });

  describe('GET /api/customers/me/consumos (§3.10.2)', () => {
    it('200: solo los consumos del cliente del token, sin datos de empleados (CA-23.7, CA-23.8)', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get('/api/customers/me/consumos')
        .set(customerHeaders(s.carolina.id));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 2, page: 1, limit: 20 });
      expect(response.body).not.toHaveProperty('totals');
      expect(codesOf(response.body)).toEqual([s.c2, s.c1].map((c) => codeOf(c.id)));
      expect(response.body.items[1]).toEqual({
        id: s.c1.id,
        code: codeOf(s.c1.id),
        createdAt: '2026-10-01T15:00:00.000Z',
        customer: {
          id: s.carolina.id,
          firstName: 'Carolina',
          lastName: 'Fernández',
          documentType: 'DNI',
          documentNumber: '38456001',
        },
        amount: 50000,
        points: 500,
        bonusPoints: 50,
        totalPoints: 550,
        equivalence: { baseAmount: 1000, pointsAwarded: 10, configurationVersion: 1 },
        notes: null,
        status: 'REGISTERED',
        voidedAt: null,
        voidReason: null,
      });
      // El anulado tampoco trae quién lo anuló
      expect(response.body.items[0]).toMatchObject({ status: 'VOIDED', voidReason: 'Monto cargado incorrectamente' });
      expect(response.body.items[0]).not.toHaveProperty('voidedBy');
    });

    it('filtra por status y pagina', async () => {
      const s = await seedScenario();

      const registered = await request(app.getHttpServer())
        .get('/api/customers/me/consumos?status=REGISTERED')
        .set(customerHeaders(s.carolina.id));
      const secondPage = await request(app.getHttpServer())
        .get('/api/customers/me/consumos?page=2&limit=1')
        .set(customerHeaders(s.carolina.id));

      expect(codesOf(registered.body)).toEqual([codeOf(s.c1.id)]);
      expect(codesOf(secondPage.body)).toEqual([codeOf(s.c1.id)]);
      expect(secondPage.body).toMatchObject({ total: 2, page: 2, limit: 1 });
    });

    it('cliente sin consumos: lista vacía', async () => {
      const s = await seedScenario();
      const nuevo = await prisma.customer.create({
        data: { firstName: 'Martín', lastName: 'Sosa', documentType: 'DNI', documentNumber: '41222333', email: 'martin@example.com' },
      });

      const response = await request(app.getHttpServer()).get('/api/customers/me/consumos').set(customerHeaders(nuevo.id));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ items: [], total: 0, page: 1, limit: 20 });
      expect(s.carolina.id).not.toBe(nuevo.id);
    });

    it('400 si manda last24h, que el historial no tiene', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get('/api/customers/me/consumos?last24h=true')
        .set(customerHeaders(s.carolina.id));

      expect(response.status).toBe(400);
    });

    it('Cajero → 403; Administrador → 403; sin token → 401 (CA-23.8)', async () => {
      const s = await seedScenario();

      const asCashier = await request(app.getHttpServer()).get('/api/customers/me/consumos').set(staffHeaders('CASHIER', s.cashier));
      const asAdmin = await request(app.getHttpServer()).get('/api/customers/me/consumos').set(staffHeaders('ADMIN', s.admin));
      const anonymous = await request(app.getHttpServer()).get('/api/customers/me/consumos');

      expect(asCashier.status).toBe(403);
      expect(asCashier.body.code).toBe('FORBIDDEN');
      expect(asAdmin.status).toBe(403);
      expect(anonymous.status).toBe(401);
    });

    it('/customers/:id/consumos sigue funcionando para el Administrador (la ruta "me" no la tapa)', async () => {
      const s = await seedScenario();

      const response = await request(app.getHttpServer())
        .get(`/api/customers/${s.carolina.id}/consumos`)
        .set(staffHeaders('ADMIN', s.admin));

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
    });
  });
});
