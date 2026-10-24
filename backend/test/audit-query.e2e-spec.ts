import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';

// US-58: consulta del historial (GET /auditoria y GET /auditoria/actores), contra Postgres
// real. audit_logs es inalterable (no se puede borrar entre tests ni entre corridas), así que
// las filas de prueba van a un día lejano elegido al azar en cada corrida: todas las consultas
// de este archivo se acotan a ese día y nunca ven filas de otras corridas ni de otros tests.
describe('Auditoría — consulta (US-58, e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Día de prueba (hora de Argentina) elegido al azar entre los años 3000 y 8999
  const year = 3000 + Math.floor(Math.random() * 6000);
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 27);
  const pad = (n: number) => String(n).padStart(2, '0');
  const TEST_DAY = `${year}-${pad(month)}-${pad(day)}`;
  const at = (time: string, dayOffset = 0) =>
    new Date(new Date(`${TEST_DAY}T${time}Z`).getTime() + dayOffset * 24 * 60 * 60 * 1000);

  let admin: Record<string, string>;
  let cashier: Record<string, string>;
  let customer: Record<string, string>;
  let adminAccountId: number;
  let cashierAccountId: number;

  function authHeaders(role: AuthRole, accountId: number, employeeId?: number) {
    const headers: Record<string, string> = {
      'x-test-auth-role': role,
      'x-test-account-id': String(accountId),
    };
    if (employeeId !== undefined) headers['x-test-employee-id'] = String(employeeId);
    return headers;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    const issuer = moduleFixture.get(AccessTokenIssuer, { strict: false });
    app.use(async (req: Request, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-auth-role') as AuthRole | undefined;
      if (role) {
        const employeeId = req.header('x-test-employee-id');
        const token = await issuer.issue({
          accountId: Number(req.header('x-test-account-id') ?? 1),
          role,
          ...(employeeId ? { employeeId: Number(employeeId) } : {}),
        });
        req.headers.authorization = `Bearer ${token}`;
      }
      next();
    });
    await app.init();
    prisma = app.get(PrismaService);

    // Cuentas: un Administrador y un Cajero activos, un Cajero dado de baja y una cuenta de cliente
    await prisma.pointsMovement.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customerStatusChange.deleteMany();
    await prisma.customer.deleteMany();

    const seedEmployee = async (
      firstName: string,
      lastName: string,
      role: 'ADMIN' | 'CASHIER',
      active: boolean,
    ) => {
      const employee = await prisma.employee.create({
        data: {
          firstName,
          lastName,
          phone: '3510000000',
          email: `${firstName}.${lastName}@vitto.club`.toLowerCase(),
          role,
          isActive: active,
        },
      });
      const account = await prisma.account.create({
        data: {
          email: employee.email,
          passwordHash: 'hashed:secreta123',
          role,
          isActive: active,
          employeeId: employee.id,
        },
      });
      return { employee, account };
    };
    const adminSeed = await seedEmployee('Denise', 'Nagel', 'ADMIN', true);
    const cashierSeed = await seedEmployee('Ana', 'Pérez', 'CASHIER', true);
    const inactiveSeed = await seedEmployee('Diego', 'Sosa', 'CASHIER', false);
    adminAccountId = adminSeed.account.id;
    cashierAccountId = cashierSeed.account.id;

    const customerRecord = await prisma.customer.create({
      data: {
        firstName: 'Lucía',
        lastName: 'Paz',
        documentType: 'DNI',
        documentNumber: '28999888',
        email: 'lucia@mail.com',
        isActive: true,
      },
    });
    const customerAccount = await prisma.account.create({
      data: {
        email: 'lucia@mail.com',
        passwordHash: 'hashed:secreta123',
        role: 'CUSTOMER',
        isActive: true,
        customerId: customerRecord.id,
      },
    });

    admin = authHeaders('ADMIN', adminSeed.account.id, adminSeed.employee.id);
    cashier = authHeaders('CASHIER', cashierSeed.account.id, cashierSeed.employee.id);
    customer = authHeaders('CUSTOMER', customerAccount.id);

    // Filas del día de prueba. Orden de createdAt: r1 < r2 < (r3 = r4) < r5 < boundaryInside
    const base = { actorType: 'EMPLOYEE' as const, details: [] };
    await prisma.auditLog.createMany({
      data: [
        {
          ...base,
          createdAt: at('12:00:00.000'),
          actorAccountId: adminSeed.account.id,
          performedBy: 'Denise Nagel',
          module: 'EMPLOYEES',
          actionCode: 'EMPLOYEE_CREATED',
          description: 'Registró al empleado Jorge Molina',
          details: [{ label: 'Mail', value: 'jorge@vitto.club' }],
        },
        {
          ...base,
          createdAt: at('13:00:00.000'),
          actorAccountId: cashierSeed.account.id,
          performedBy: 'Ana Pérez',
          module: 'CUSTOMERS',
          actionCode: 'CUSTOMER_CREATED',
          description: 'Registró al cliente Sofía Ríos',
          affectedCustomerId: 101,
          affectedCustomerName: 'Sofía Ríos',
          documentType: 'DNI',
          documentNumber: '30111222',
        },
        {
          ...base,
          createdAt: at('14:00:00.000'),
          actorAccountId: cashierSeed.account.id,
          performedBy: 'Ana Pérez',
          module: 'CONSUMPTIONS',
          actionCode: 'CONSUMPTION_VOIDED',
          description: 'Anuló el consumo C-000131 de Martín Gómez',
          affectedCustomerId: 102,
          affectedCustomerName: 'Martín Gómez',
          documentType: 'PASSPORT',
          documentNumber: 'AB123',
          operationCode: 'C-000131',
          details: [{ label: 'Código de operación', value: 'C-000131' }],
        },
        {
          // Misma fecha que la anterior: el desempate es por id descendente
          actorType: 'SYSTEM',
          details: [],
          createdAt: at('14:00:00.000'),
          actorAccountId: null,
          performedBy: 'Sistema',
          module: 'POINTS',
          actionCode: 'POINTS_EXPIRED',
          description: 'Venció 200 pts de Carolina Fernández',
        },
        {
          // Fila vieja (sesión, autorregistro): sin módulo, el listado nunca la muestra
          ...base,
          createdAt: at('15:00:00.000'),
          actorAccountId: adminSeed.account.id,
          performedBy: 'Denise Nagel',
          module: null,
          actionCode: null,
          description: null,
        },
        {
          // 23:59:59 del día de prueba en Argentina: entra
          ...base,
          createdAt: at('02:59:59.000', 1),
          actorAccountId: adminSeed.account.id,
          performedBy: 'Denise Nagel',
          module: 'CONFIGURATION',
          actionCode: 'LEVELS_UPDATED',
          description: 'Modificó niveles',
        },
        {
          // 23:59:59 del día anterior: no entra
          ...base,
          createdAt: at('02:59:59.000'),
          actorAccountId: adminSeed.account.id,
          performedBy: 'Denise Nagel',
          module: 'CONFIGURATION',
          actionCode: 'LEVELS_UPDATED',
          description: 'Modificó niveles (día anterior)',
        },
        {
          // 00:00:00 del día siguiente: no entra
          ...base,
          createdAt: at('03:00:00.000', 1),
          actorAccountId: adminSeed.account.id,
          performedBy: 'Denise Nagel',
          module: 'CONFIGURATION',
          actionCode: 'LEVELS_UPDATED',
          description: 'Modificó niveles (día siguiente)',
        },
      ],
    });
    void inactiveSeed;
  });

  afterAll(async () => {
    await app.close();
  });

  const list = (query: Record<string, string | number> = {}, headers = admin) =>
    request(app.getHttpServer())
      .get('/api/auditoria')
      .set(headers)
      .query({ fromDate: TEST_DAY, toDate: TEST_DAY, ...query });

  describe('permisos (CA-58.1)', () => {
    it.each([
      ['GET /auditoria', '/api/auditoria'],
      ['GET /auditoria/actores', '/api/auditoria/actores'],
    ])('%s: el Cajero recibe 403', async (_name, url) => {
      await request(app.getHttpServer()).get(url).set(cashier).expect(403);
    });

    it.each([
      ['GET /auditoria', '/api/auditoria'],
      ['GET /auditoria/actores', '/api/auditoria/actores'],
    ])('%s: el Cliente recibe 403', async (_name, url) => {
      await request(app.getHttpServer()).get(url).set(customer).expect(403);
    });

    it.each(['/api/auditoria', '/api/auditoria/actores'])('%s: sin token recibe 401', async (url) => {
      await request(app.getHttpServer()).get(url).expect(401);
    });
  });

  describe('listado y forma de la respuesta (CA-58.2)', () => {
    it('devuelve { items, total, page, limit } con los campos exactos del contrato', async () => {
      const response = await list({ module: 'CONSUMPTIONS', limit: 10 }).expect(200);

      expect(response.body).toEqual({
        items: [
          {
            id: expect.any(Number),
            createdAt: at('14:00:00.000').toISOString(),
            actorType: 'EMPLOYEE',
            actorAccountId: cashierAccountId,
            performedBy: 'Ana Pérez',
            module: 'CONSUMPTIONS',
            action: 'CONSUMPTION_VOIDED',
            description: 'Anuló el consumo C-000131 de Martín Gómez',
            affectedCustomer: {
              customerId: 102,
              name: 'Martín Gómez',
              documentType: 'PASSPORT',
              documentNumber: 'AB123',
            },
            operationCode: 'C-000131',
            details: [{ label: 'Código de operación', value: 'C-000131' }],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('una fila del Sistema trae actorAccountId null y sin cliente afectado', async () => {
      const response = await list({ actor: 'SYSTEM' }).expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        actorType: 'SYSTEM',
        actorAccountId: null,
        performedBy: 'Sistema',
        module: 'POINTS',
        action: 'POINTS_EXPIRED',
        affectedCustomer: null,
        operationCode: null,
        details: [],
      });
    });

    it('ordena por fecha descendente y, a igual fecha, por id descendente', async () => {
      const response = await list().expect(200);

      const actions = response.body.items.map((item: { action: string }) => item.action);
      // 23:59 (LEVELS_UPDATED), 14:00 id mayor (POINTS_EXPIRED), 14:00 id menor, 13:00, 12:00
      expect(actions).toEqual([
        'LEVELS_UPDATED',
        'POINTS_EXPIRED',
        'CONSUMPTION_VOIDED',
        'CUSTOMER_CREATED',
        'EMPLOYEE_CREATED',
      ]);
    });

    it('pagina con page y limit y devuelve el total', async () => {
      const first = await list({ page: 1, limit: 2 }).expect(200);
      const last = await list({ page: 3, limit: 2 }).expect(200);

      expect(first.body).toMatchObject({ total: 5, page: 1, limit: 2 });
      expect(first.body.items).toHaveLength(2);
      expect(last.body).toMatchObject({ total: 5, page: 3, limit: 2 });
      expect(last.body.items).toHaveLength(1);
    });

    it('usa page=1 y limit=20 por defecto', async () => {
      const response = await list().expect(200);

      expect(response.body).toMatchObject({ page: 1, limit: 20 });
    });
  });

  describe('filas sin módulo (CA-58.9)', () => {
    it('el listado nunca incluye las filas con module NULL', async () => {
      const response = await list().expect(200);

      expect(response.body.total).toBe(5);
      expect(response.body.items.every((item: { module: string | null }) => item.module !== null)).toBe(true);
      expect(response.body.items.map((item: { description: string }) => item.description)).not.toContain(null);
    });
  });

  describe('filtro "Realizado por" (CA-58.4)', () => {
    it('por accountId es exacto', async () => {
      const response = await list({ actor: cashierAccountId }).expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.items.every((item: { actorAccountId: number }) => item.actorAccountId === cashierAccountId)).toBe(
        true,
      );
    });

    it('SYSTEM trae solo las filas del Sistema', async () => {
      const response = await list({ actor: 'SYSTEM' }).expect(200);

      expect(response.body.total).toBe(1);
    });

    it('un accountId inexistente devuelve la lista vacía, no un error', async () => {
      const response = await list({ actor: 999999999 }).expect(200);

      expect(response.body).toMatchObject({ items: [], total: 0 });
    });

    it.each(['abc', '-3', '1.5'])('un actor inválido (%s) responde 400', async (actor) => {
      await list({ actor }).expect(400);
    });
  });

  describe('filtros "Módulo" y "Acción" (CA-58.5)', () => {
    it('module filtra por módulo', async () => {
      const response = await list({ module: 'CUSTOMERS' }).expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.items[0].action).toBe('CUSTOMER_CREATED');
    });

    it('module y action juntos filtran por ambos', async () => {
      const response = await list({ module: 'EMPLOYEES', action: 'EMPLOYEE_CREATED' }).expect(200);

      expect(response.body.total).toBe(1);
    });

    it('action de un módulo sin filas del día devuelve vacío', async () => {
      const response = await list({ module: 'EMPLOYEES', action: 'USER_ACCOUNT_REACTIVATED' }).expect(200);

      expect(response.body.total).toBe(0);
    });

    it('action sin module responde 400', async () => {
      const response = await list({ action: 'CUSTOMER_CREATED' }).expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(typeof response.body.message).toBe('string');
    });

    it('action de otro módulo responde 400', async () => {
      await list({ module: 'EMPLOYEES', action: 'CUSTOMER_CREATED' }).expect(400);
    });

    it('un module o un action que no existen responden 400', async () => {
      await list({ module: 'INVENTADO' }).expect(400);
      await list({ module: 'CUSTOMERS', action: 'INVENTADA' }).expect(400);
    });
  });

  describe('filtros por documento (CA-58.6)', () => {
    it('coincidencia parcial: 3011 encuentra 30111222', async () => {
      const response = await list({ documentNumber: '3011' }).expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.items[0].affectedCustomer.documentNumber).toBe('30111222');
    });

    it('normaliza el número (puntos, espacios y guiones)', async () => {
      const response = await list({ documentNumber: '30.111-222' }).expect(200);

      expect(response.body.total).toBe(1);
    });

    it('con número y sin tipo asume DNI: no encuentra un pasaporte', async () => {
      const response = await list({ documentNumber: 'AB123' }).expect(200);

      expect(response.body.total).toBe(0);
    });

    it('con documentType PASSPORT encuentra el pasaporte, sin distinguir mayúsculas', async () => {
      const response = await list({ documentType: 'PASSPORT', documentNumber: 'ab12' }).expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.items[0].affectedCustomer.documentNumber).toBe('AB123');
    });

    it('documentType sin número filtra solo por tipo', async () => {
      const response = await list({ documentType: 'PASSPORT' }).expect(200);

      expect(response.body.total).toBe(1);
    });

    it('un documentNumber de más de 20 caracteres responde 400', async () => {
      await list({ documentNumber: '1'.repeat(21) }).expect(400);
    });
  });

  describe('operationCode', () => {
    it('es exacto y no distingue mayúsculas', async () => {
      const exact = await list({ operationCode: 'c-000131' }).expect(200);
      const partial = await list({ operationCode: 'c-0001' }).expect(200);

      expect(exact.body.total).toBe(1);
      expect(partial.body.total).toBe(0);
    });
  });

  describe('fechas en hora de Argentina (CA-58.8)', () => {
    it('toDate es inclusivo: entra 23:59:59 del último día y no entra 00:00:00 del siguiente', async () => {
      const response = await list().expect(200);

      const descriptions = response.body.items.map((item: { description: string }) => item.description);
      expect(descriptions).toContain('Modificó niveles');
      expect(descriptions).not.toContain('Modificó niveles (día anterior)');
      expect(descriptions).not.toContain('Modificó niveles (día siguiente)');
    });

    it('date es un día exacto', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auditoria')
        .set(admin)
        .query({ date: TEST_DAY })
        .expect(200);

      expect(response.body.total).toBe(5);
    });

    it('solo fromDate deja el otro extremo abierto: nada anterior a ese día', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auditoria')
        .set(admin)
        .query({ fromDate: TEST_DAY, module: 'CONFIGURATION', limit: 100 })
        .expect(200);

      // Sin toDate pueden aparecer filas posteriores (de otras corridas), pero ninguna anterior
      const start = at('03:00:00.000').getTime();
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(
        response.body.items.every((item: { createdAt: string }) => new Date(item.createdAt).getTime() >= start),
      ).toBe(true);
    });

    it('fromDate posterior a toDate responde 400', async () => {
      await list({ fromDate: '2026-10-14', toDate: '2026-10-13' }).expect(400);
    });

    it('date junto con un rango responde 400', async () => {
      await request(app.getHttpServer())
        .get('/api/auditoria')
        .set(admin)
        .query({ date: TEST_DAY, fromDate: TEST_DAY })
        .expect(400);
    });

    it.each(['2026-13-45', '2026-02-30', '13/10/2026', 'hoy'])('la fecha inválida %s responde 400', async (value) => {
      await list({ fromDate: value }).expect(400);
    });
  });

  describe('paginación inválida', () => {
    it.each([
      { page: 0 },
      { page: 'x' },
      { limit: 0 },
      { limit: 101 },
    ])('%j responde 400', async (query) => {
      await list(query as Record<string, string | number>).expect(400);
    });

    it('un parámetro desconocido responde 400', async () => {
      await list({ inventado: 'x' }).expect(400);
    });
  });

  describe('GET /auditoria/actores (CA-58.4)', () => {
    it('devuelve las cuentas de empleados, activas e inactivas, por apellido', async () => {
      const response = await request(app.getHttpServer()).get('/api/auditoria/actores').set(admin).expect(200);

      expect(response.body).toEqual([
        { accountId: adminAccountId, name: 'Denise Nagel', role: 'ADMIN', active: true },
        { accountId: cashierAccountId, name: 'Ana Pérez', role: 'CASHIER', active: true },
        { accountId: expect.any(Number), name: 'Diego Sosa', role: 'CASHIER', active: false },
      ]);
    });

    it('no incluye las cuentas de clientes', async () => {
      const response = await request(app.getHttpServer()).get('/api/auditoria/actores').set(admin).expect(200);

      expect(response.body.map((actor: { name: string }) => actor.name)).not.toContain('Lucía Paz');
    });
  });
});
