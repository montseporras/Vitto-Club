import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { deleteNotifications } from './delete-notifications.js';
import { deletePointsMovements } from './delete-points-movements.js';

// US-14 (CA-14.6 y CA-14.9, contrato S5 §3.8.4): GET /notificaciones contra Postgres real.
describe('Historial de notificaciones (e2e, US-14)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: Record<string, string>;
  let carolinaId: number;
  let joseId: number;
  let pasaporteId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    // Mismo mecanismo que los demás e2e: headers de prueba -> token real
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
    await deleteNotifications(prisma);
    await prisma.promotionSend.deleteMany();
    await deletePointsMovements(prisma);
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
  }

  // Escenario (hora de Argentina = UTC-3):
  //   n1  vence puntos   SENT     Carolina   10/11 12:00
  //   n2  cumpleaños     SENT     José       11/11 09:00
  //   n3  misión         FAILED   Carolina   11/11 12:00   (se reenvió: n5)
  //   n4  misión         SKIPPED  José       12/11 09:00
  //   n5  misión         SENT     Carolina   12/11 12:00   (reenvío de n3)
  //   n6  promoción      SENT     José       12/11 13:00
  //   n7  vence puntos   FAILED   Pasaporte  12/11 14:00   (todavía no se reenvió)
  let ids: Record<'n1' | 'n2' | 'n3' | 'n4' | 'n5' | 'n6' | 'n7', number>;

  beforeEach(async () => {
    await cleanDatabase();
    const employee = await prisma.employee.create({
      data: { firstName: 'Diego', lastName: 'Sosa', phone: '3510000000', email: 'admin@vitto.club', role: 'ADMIN' },
    });
    const account = await prisma.account.create({
      data: { email: 'admin@vitto.club', passwordHash: 'hashed:x', role: 'ADMIN', employeeId: employee.id },
    });
    admin = {
      'x-test-auth-role': 'ADMIN',
      'x-test-account-id': String(account.id),
      'x-test-employee-id': String(employee.id),
    };
    const customer = (firstName: string, lastName: string, documentType: 'DNI' | 'PASSPORT', documentNumber: string, email: string) =>
      prisma.customer.create({ data: { firstName, lastName, documentType, documentNumber, email } });
    carolinaId = (await customer('Carolina', 'Fernández', 'DNI', '38456123', 'carolina@vitto.club')).id;
    joseId = (await customer('José', 'Pérez', 'DNI', '30111222', 'jose@vitto.club')).id;
    pasaporteId = (await customer('Ana', 'Gómez', 'PASSPORT', 'AAB123456', 'ana@vitto.club')).id;
    const promotion = await prisma.promotionSend.create({
      data: {
        subject: '¡Este viernes, pizza libre!',
        body: 'Hola {nombre}',
        status: 'SENT',
        sentAt: new Date('2026-11-12T16:00:00.000Z'),
        recipients: 1,
        createdByEmployeeId: employee.id,
      },
    });

    const row = (
      key: keyof typeof ids,
      data: {
        type: 'POINTS_EXPIRING' | 'BIRTHDAY' | 'PROMOTION' | 'MISSION';
        status: 'SENT' | 'FAILED' | 'SKIPPED';
        customerId: number;
        createdAt: string;
        error?: string;
        dedupeKey: string;
        promotionSendId?: number;
        resentFromId?: number;
      },
    ) =>
      prisma.notification
        .create({
          data: {
            type: data.type,
            channel: 'EMAIL',
            recipient: `${key}@mail.com`,
            customerId: data.customerId,
            subject: `Asunto de ${key}`,
            body: 'Cuerpo',
            status: data.status,
            error: data.error ?? null,
            dedupeKey: data.dedupeKey,
            promotionSendId: data.promotionSendId ?? null,
            resentFromId: data.resentFromId ?? null,
            createdAt: new Date(data.createdAt),
          },
        })
        .then((created) => [key, created.id] as const);

    const n1 = await row('n1', { type: 'POINTS_EXPIRING', status: 'SENT', customerId: carolinaId, createdAt: '2026-11-10T15:00:00.000Z', dedupeKey: 'lot:1' });
    const n2 = await row('n2', { type: 'BIRTHDAY', status: 'SENT', customerId: joseId, createdAt: '2026-11-11T12:00:00.000Z', dedupeKey: 'birthday:2026' });
    const n3 = await row('n3', { type: 'MISSION', status: 'FAILED', error: 'Timeout', customerId: carolinaId, createdAt: '2026-11-11T15:00:00.000Z', dedupeKey: 'mission:1' });
    const n4 = await row('n4', { type: 'MISSION', status: 'SKIPPED', customerId: joseId, createdAt: '2026-11-12T12:00:00.000Z', dedupeKey: 'mission:2' });
    const n5 = await row('n5', { type: 'MISSION', status: 'SENT', customerId: carolinaId, createdAt: '2026-11-12T15:00:00.000Z', dedupeKey: `resend:${n3[1]}`, resentFromId: n3[1] });
    const n6 = await row('n6', { type: 'PROMOTION', status: 'SENT', customerId: joseId, createdAt: '2026-11-12T16:00:00.000Z', dedupeKey: `promotion-send:${promotion.id}`, promotionSendId: promotion.id });
    const n7 = await row('n7', { type: 'POINTS_EXPIRING', status: 'FAILED', error: 'Bounce', customerId: pasaporteId, createdAt: '2026-11-12T17:00:00.000Z', dedupeKey: 'lot:2' });
    ids = Object.fromEntries([n1, n2, n3, n4, n5, n6, n7]) as typeof ids;
  });

  const get = (query = '') => request(app.getHttpServer()).get(`/api/notificaciones${query}`).set(admin);
  const idsOf = (body: { items: { id: number }[] }) => body.items.map((item) => item.id);

  describe('forma de la respuesta y orden', () => {
    it('devuelve { items, total, page, limit } con 20 por página por defecto', async () => {
      const response = await get();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 7, page: 1, limit: 20 });
      expect(response.body.items).toHaveLength(7);
    });

    it('cada fila tiene exactamente los campos del contrato §3.8.4', async () => {
      const response = await get('?type=PROMOTION');

      expect(Object.keys(response.body.items[0]).sort()).toEqual(
        ['channel', 'createdAt', 'customer', 'error', 'id', 'recipient', 'resent', 'resentFromId', 'status', 'subject', 'type'].sort(),
      );
      expect(Object.keys(response.body.items[0].customer).sort()).toEqual(
        ['documentNumber', 'documentType', 'firstName', 'id', 'lastName'].sort(),
      );
      expect(response.body.items[0]).toEqual({
        id: ids.n6,
        createdAt: '2026-11-12T16:00:00.000Z',
        type: 'PROMOTION',
        channel: 'EMAIL',
        recipient: 'n6@mail.com',
        customer: { id: joseId, firstName: 'José', lastName: 'Pérez', documentType: 'DNI', documentNumber: '30111222' },
        subject: 'Asunto de n6',
        status: 'SENT',
        error: null,
        resentFromId: null,
        resent: false,
      });
    });

    it('va por fecha descendente', async () => {
      const response = await get();

      expect(idsOf(response.body)).toEqual([ids.n7, ids.n6, ids.n5, ids.n4, ids.n3, ids.n2, ids.n1]);
    });

    it('a igual fecha, por id descendente: el paginado es estable', async () => {
      await prisma.$executeRawUnsafe(`ALTER TABLE notifications DISABLE TRIGGER notifications_immutable`);
      try {
        await prisma.$executeRawUnsafe(`UPDATE notifications SET created_at = '2026-11-12T17:00:00.000Z' WHERE id IN (${ids.n6}, ${ids.n7})`);
      } finally {
        await prisma.$executeRawUnsafe(`ALTER TABLE notifications ENABLE TRIGGER notifications_immutable`);
      }

      const response = await get('?limit=2');

      expect(idsOf(response.body)).toEqual([ids.n7, ids.n6]);
    });

    it('pagina con page y limit, y total no cambia', async () => {
      const first = await get('?limit=3&page=1');
      const second = await get('?limit=3&page=2');
      const third = await get('?limit=3&page=3');

      expect(idsOf(first.body)).toEqual([ids.n7, ids.n6, ids.n5]);
      expect(idsOf(second.body)).toEqual([ids.n4, ids.n3, ids.n2]);
      expect(idsOf(third.body)).toEqual([ids.n1]);
      expect([first.body, second.body, third.body].map((page) => [page.total, page.page, page.limit])).toEqual([
        [7, 1, 3],
        [7, 2, 3],
        [7, 3, 3],
      ]);
    });

    it('una página que no existe devuelve la lista vacía con el total', async () => {
      const response = await get('?page=5&limit=20');

      expect(response.body).toEqual({ items: [], total: 7, page: 5, limit: 20 });
    });
  });

  describe('reenvíos', () => {
    it('el que falló y ya se reenvió tiene resent = true; el reenvío trae resentFromId', async () => {
      const response = await get();
      const byId = Object.fromEntries(response.body.items.map((item: { id: number }) => [item.id, item]));

      expect(byId[ids.n3]).toMatchObject({ status: 'FAILED', error: 'Timeout', resent: true, resentFromId: null });
      expect(byId[ids.n5]).toMatchObject({ status: 'SENT', resent: false, resentFromId: ids.n3 });
    });

    it('un FAILED que todavía no se reenvió tiene resent = false (es el que muestra el botón Reenviar)', async () => {
      const response = await get('?status=FAILED');

      const n7 = response.body.items.find((item: { id: number }) => item.id === ids.n7);
      expect(n7).toMatchObject({ status: 'FAILED', error: 'Bounce', resent: false, resentFromId: null });
    });
  });

  describe('filtros', () => {
    it('type', async () => {
      expect(idsOf((await get('?type=MISSION')).body)).toEqual([ids.n5, ids.n4, ids.n3]);
      expect(idsOf((await get('?type=BIRTHDAY')).body)).toEqual([ids.n2]);
      expect(idsOf((await get('?type=POINTS_EXPIRING')).body)).toEqual([ids.n7, ids.n1]);
    });

    it('status', async () => {
      expect(idsOf((await get('?status=FAILED')).body)).toEqual([ids.n7, ids.n3]);
      expect(idsOf((await get('?status=SKIPPED')).body)).toEqual([ids.n4]);
    });

    it('type y status juntos', async () => {
      expect(idsOf((await get('?type=MISSION&status=FAILED')).body)).toEqual([ids.n3]);
    });

    it('documentNumber parcial, normalizado, con DNI por defecto', async () => {
      expect(idsOf((await get('?documentNumber=3845')).body)).toEqual([ids.n5, ids.n3, ids.n1]);
      expect(idsOf((await get('?documentNumber=38.456.123')).body)).toEqual([ids.n5, ids.n3, ids.n1]);
      expect(idsOf((await get('?documentNumber=301')).body)).toEqual([ids.n6, ids.n4, ids.n2]);
    });

    it('el pasaporte no aparece con DNI por defecto; con documentType=PASSPORT sí', async () => {
      expect(idsOf((await get('?documentNumber=aab')).body)).toEqual([]);
      expect(idsOf((await get('?documentType=PASSPORT&documentNumber=aab-123')).body)).toEqual([ids.n7]);
    });

    it('documentType solo, o un número que queda vacío al normalizar, no filtran', async () => {
      expect((await get('?documentType=PASSPORT')).body.total).toBe(7);
      expect((await get('?documentNumber=...')).body.total).toBe(7);
    });

    it('fromDate y toDate: días completos en hora de Argentina, inclusivos', async () => {
      // 11/11 en Argentina = 11/11 03:00Z a 12/11 03:00Z: n2 y n3
      expect(idsOf((await get('?fromDate=2026-11-11&toDate=2026-11-11')).body)).toEqual([ids.n3, ids.n2]);
      expect(idsOf((await get('?fromDate=2026-11-11')).body)).toEqual([ids.n7, ids.n6, ids.n5, ids.n4, ids.n3, ids.n2]);
      expect(idsOf((await get('?toDate=2026-11-10')).body)).toEqual([ids.n1]);
    });

    it('el borde del día: 02:59Z todavía es el día anterior en Argentina, 03:00Z ya es el siguiente', async () => {
      await prisma.$executeRawUnsafe(`ALTER TABLE notifications DISABLE TRIGGER notifications_immutable`);
      try {
        await prisma.$executeRawUnsafe(`UPDATE notifications SET created_at = '2026-11-11T02:59:00.000Z' WHERE id = ${ids.n1}`);
        await prisma.$executeRawUnsafe(`UPDATE notifications SET created_at = '2026-11-11T03:00:00.000Z' WHERE id = ${ids.n2}`);
      } finally {
        await prisma.$executeRawUnsafe(`ALTER TABLE notifications ENABLE TRIGGER notifications_immutable`);
      }

      expect(idsOf((await get('?fromDate=2026-11-10&toDate=2026-11-10')).body)).toEqual([ids.n1]);
      expect(idsOf((await get('?fromDate=2026-11-11&toDate=2026-11-11')).body)).toEqual([ids.n3, ids.n2]);
    });

    it('todos los filtros juntos', async () => {
      const response = await get('?type=MISSION&status=SENT&documentNumber=3845&fromDate=2026-11-12&toDate=2026-11-12');

      expect(idsOf(response.body)).toEqual([ids.n5]);
      expect(response.body.total).toBe(1);
    });

    it('un filtro sin resultados devuelve la lista vacía', async () => {
      const response = await get('?type=BIRTHDAY&status=FAILED');

      expect(response.body).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('errores del contrato', () => {
    it('fromDate posterior a toDate: 400 con el mensaje de siempre y el campo en details', async () => {
      const response = await get('?fromDate=2026-11-12&toDate=2026-11-11');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('fromDate no puede ser posterior a toDate');
      expect(response.body.details).toEqual([{ field: 'fromDate', message: 'fromDate no puede ser posterior a toDate' }]);
    });

    it('una fecha que no existe: 400', async () => {
      const response = await get('?fromDate=2026-02-30');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('fromDate no es una fecha válida (YYYY-MM-DD)');
    });

    it.each([
      ['un type desconocido', '?type=FOO', 'type no es un tipo de notificación válido'],
      ['un status desconocido', '?status=OK', 'status no es un estado válido'],
      ['un documentType desconocido', '?documentType=CUIT', 'documentType debe ser DNI o PASSPORT'],
      ['un documentNumber de más de 20 caracteres', `?documentNumber=${'1'.repeat(21)}`, 'documentNumber no puede superar los 20 caracteres'],
      ['page = 0', '?page=0', 'page debe ser mayor o igual a 1'],
      ['limit = 0', '?limit=0', 'limit debe ser mayor o igual a 1'],
      ['limit = 101', '?limit=101', 'limit no puede superar 100'],
      ['un page que no es entero', '?page=1.5', 'page debe ser un entero'],
    ])('%s: 400', async (_name, query, message) => {
      const response = await get(query);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(message);
    });

    it('un parámetro de más: 400', async () => {
      const response = await get('?order=asc');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('property order should not exist');
    });
  });

  describe('permisos (CA-14.9, contrato S5 §4)', () => {
    const cashier = { 'x-test-auth-role': 'CASHIER', 'x-test-account-id': '900', 'x-test-employee-id': '900' };
    const customer = { 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '901', 'x-test-customer-id': '901' };

    it.each([
      ['Cajero', cashier],
      ['Cliente', customer],
    ])('%s recibe 403 FORBIDDEN', async (_role, headers) => {
      const response = await request(app.getHttpServer()).get('/api/notificaciones').set(headers);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('sin token: 401', async () => {
      expect((await request(app.getHttpServer()).get('/api/notificaciones')).status).toBe(401);
    });
  });
});
