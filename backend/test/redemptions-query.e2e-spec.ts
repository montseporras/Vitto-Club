import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { REDEMPTION_DURATION_MS } from '../src/redemptions/domain/redemption.js';
import { toArgentinaDateString } from '../src/shared/time/argentina-date.js';

// US-44: el barrido no corre durante los e2e (ver la nota en test/redemptions-expiration.e2e-spec.ts)
process.env.REDEMPTIONS_EXPIRATION_CRON_ENABLED = 'false';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// Cubre US-45 (contrato S4 §3.12) contra Postgres real. US-40 (confirmar) no está: los canjes se
// insertan directo en la base, respetando los CHECK de BASE-4. Las fechas son relativas a "ahora" y
// los filtros por día se arman con el día de Argentina de cada canje, así no depende de la hora.
describe('Consultar canjes (e2e, US-45)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
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
    await prisma.customerStatusChange.deleteMany();
    await prisma.customer.deleteMany();
  }

  // Escenario (createdAt relativo a ahora):
  // - Carolina (DNI 38456001):
  //   AAAAAA Confirmado hace 2 min · BBBBBB Confirmado hace 5 min (vence antes) · VVVVVV Confirmado
  //   hace 20 min (vencido sin marcar) · UUUUUU Utilizado hace 3 días ("Brunch para dos", dada de
  //   baja) · XXXXXX Cancelado hace 4 días · RRRRRR Rechazado hace 10 días.
  // - Martín (Pasaporte AB123456): MMMMMM Confirmado en caja hace 1 min.
  // - Lucía (DNI 30111222, dada de baja): LLLLLL Rechazado hace 1 día.
  async function seedScenario() {
    const employee = await prisma.employee.create({
      data: { firstName: 'Bruno', lastName: 'Pérez', phone: '3510000000', email: 'cajero@vitto.club', role: 'CASHIER', isActive: true },
    });
    const cashier = await prisma.account.create({
      data: { email: 'cajero@vitto.club', passwordHash: 'hashed:x', role: 'CASHIER', isActive: true, employeeId: employee.id },
    });
    const adminEmployee = await prisma.employee.create({
      data: { firstName: 'Ana', lastName: 'Gómez', phone: '3510000001', email: 'admin@vitto.club', role: 'ADMIN', isActive: true },
    });
    const admin = await prisma.account.create({
      data: { email: 'admin@vitto.club', passwordHash: 'hashed:x', role: 'ADMIN', isActive: true, employeeId: adminEmployee.id },
    });

    const carolina = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
    });
    const martin = await prisma.customer.create({
      data: { firstName: 'Martín', lastName: 'Ríos', documentType: 'PASSPORT', documentNumber: 'AB123456', email: 'martin@example.com' },
    });
    const lucia = await prisma.customer.create({
      data: { firstName: 'Lucía', lastName: 'Sosa', documentType: 'DNI', documentNumber: '30111222', email: 'lucia@example.com', isActive: false },
    });

    const cafe = await prisma.reward.create({ data: { name: 'Café + medialuna', points: 150, stock: 5 } });
    const brunch = await prisma.reward.create({
      data: { name: 'Brunch para dos', points: 400, status: 'DELETED', deletedAt: new Date() },
    });

    const now = Date.now();
    const at: Record<string, Date> = {};
    const row = (
      code: string,
      customerId: number,
      reward: { id: number; name: string; points: number },
      createdAgo: number,
    ) => {
      const createdAt = new Date(now - createdAgo);
      at[code] = createdAt;
      return {
        code,
        customerId,
        rewardId: reward.id,
        rewardName: reward.name,
        points: reward.points,
        origin: 'APP' as const,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + REDEMPTION_DURATION_MS),
      };
    };
    const resolvedLater = (code: string) => new Date(at[code].getTime() + MINUTE);

    await prisma.redemption.createMany({
      data: [
        row('AAAAAA', carolina.id, cafe, 2 * MINUTE),
        row('BBBBBB', carolina.id, cafe, 5 * MINUTE),
        row('VVVVVV', carolina.id, cafe, 20 * MINUTE),
      ],
    });
    const used = row('UUUUUU', carolina.id, brunch, 3 * DAY);
    const cancelled = row('XXXXXX', carolina.id, cafe, 4 * DAY);
    const rejected = row('RRRRRR', carolina.id, cafe, 10 * DAY);
    const counter = row('MMMMMM', martin.id, cafe, 1 * MINUTE);
    const deactivated = row('LLLLLL', lucia.id, cafe, 1 * DAY);
    await prisma.redemption.createMany({
      data: [
        {
          ...used,
          status: 'USED',
          resolvedAt: resolvedLater('UUUUUU'),
          resolvedByAccountId: cashier.id,
          resolvedByName: 'Bruno Pérez',
          balanceBefore: 900,
          balanceAfter: 500,
        },
        { ...cancelled, status: 'CANCELLED', resolvedAt: resolvedLater('XXXXXX') },
        {
          ...rejected,
          status: 'REJECTED',
          resolvedAt: resolvedLater('RRRRRR'),
          resolvedByAccountId: cashier.id,
          resolvedByName: 'Bruno Pérez',
          rejectionReason: 'Sin insumo',
        },
        { ...counter, origin: 'COUNTER', confirmedByAccountId: cashier.id, confirmedByName: 'Bruno Pérez' },
        {
          ...deactivated,
          status: 'REJECTED',
          resolvedAt: resolvedLater('LLLLLL'),
          resolvedByName: 'Sistema',
          rejectionReason: 'Cliente dado de baja',
        },
      ],
    });

    const day = (code: string) => toArgentinaDateString(at[code]);
    return { employee, cashier, adminEmployee, admin, carolina, martin, lucia, cafe, brunch, day, at };
  }

  type Scenario = Awaited<ReturnType<typeof seedScenario>>;

  const adminHeaders = (s: Scenario) => ({
    'x-test-auth-role': 'ADMIN',
    'x-test-account-id': String(s.admin.id),
    'x-test-employee-id': String(s.adminEmployee.id),
  });
  const cashierHeaders = (s: Scenario) => ({
    'x-test-auth-role': 'CASHIER',
    'x-test-account-id': String(s.cashier.id),
    'x-test-employee-id': String(s.employee.id),
  });
  const customerHeaders = (customerId: number) => ({
    'x-test-auth-role': 'CUSTOMER',
    'x-test-account-id': '999',
    'x-test-customer-id': String(customerId),
  });

  const get = (path: string, headers: Record<string, string>, query: Record<string, string | number> = {}) =>
    request(app.getHttpServer()).get(path).set(headers).query(query);

  const codes = (items: { code: string }[]) => items.map((item) => item.code);
  const statusOf = async (code: string) => (await prisma.redemption.findUniqueOrThrow({ where: { code } })).status;

  describe('GET /api/customers/me/canjes — Mis canjes (§3.12.1)', () => {
    it('CA-45.2: solo los propios, más recientes primero, sin datos de empleados ni del cliente', async () => {
      const s = await seedScenario();

      const res = await get('/api/customers/me/canjes', customerHeaders(s.carolina.id)).expect(200);

      expect(res.body).toMatchObject({ total: 6, page: 1, limit: 20 });
      expect(codes(res.body.items)).toEqual(['AAAAAA', 'BBBBBB', 'VVVVVV', 'UUUUUU', 'XXXXXX', 'RRRRRR']);
      const first = res.body.items[0];
      expect(Object.keys(first).sort()).toEqual(
        ['canCancel', 'code', 'createdAt', 'expiresAt', 'id', 'resolvedAt', 'rejectionReason', 'reward', 'status'].sort(),
      );
      expect(first).toMatchObject({
        code: 'AAAAAA',
        status: 'CONFIRMED',
        reward: { id: s.cafe.id, name: 'Café + medialuna', points: 150 },
        resolvedAt: null,
        rejectionReason: null,
        canCancel: true,
      });
      const byCode = Object.fromEntries(res.body.items.map((item: { code: string }) => [item.code, item]));
      expect(byCode.RRRRRR).toMatchObject({ status: 'REJECTED', rejectionReason: 'Sin insumo', canCancel: false });
      // Recompensa dada de baja: conserva el nombre (snapshot)
      expect(byCode.UUUUUU.reward).toEqual({ id: s.brunch.id, name: 'Brunch para dos', points: 400 });
      expect(JSON.stringify(res.body)).not.toContain('Bruno');
    });

    it('vence al leer: el Confirmado vencido aparece Vencido y queda EXPIRED', async () => {
      const s = await seedScenario();

      const res = await get('/api/customers/me/canjes', customerHeaders(s.carolina.id)).expect(200);

      const vencido = res.body.items.find((item: { code: string }) => item.code === 'VVVVVV');
      expect(vencido).toMatchObject({ status: 'EXPIRED', canCancel: false });
      expect(await statusOf('VVVVVV')).toBe('EXPIRED');
    });

    it.each([
      ['CONFIRMED', ['AAAAAA', 'BBBBBB']],
      ['FINISHED', ['VVVVVV', 'UUUUUU', 'XXXXXX', 'RRRRRR']],
    ])('CA-45.1: status=%s', async (status, expected) => {
      const s = await seedScenario();

      const res = await get('/api/customers/me/canjes', customerHeaders(s.carolina.id), { status }).expect(200);

      expect(codes(res.body.items)).toEqual(expected);
      expect(res.body.total).toBe(expected.length);
    });

    it('CA-45.1: un día concreto (fromDate = toDate) y un rango', async () => {
      const s = await seedScenario();
      const headers = customerHeaders(s.carolina.id);

      const oneDay = await get('/api/customers/me/canjes', headers, { fromDate: s.day('UUUUUU'), toDate: s.day('UUUUUU') }).expect(200);
      expect(codes(oneDay.body.items)).toEqual(['UUUUUU']);

      const range = await get('/api/customers/me/canjes', headers, { fromDate: s.day('RRRRRR'), toDate: s.day('UUUUUU') }).expect(200);
      expect(codes(range.body.items)).toEqual(['UUUUUU', 'XXXXXX', 'RRRRRR']);
    });

    it('CA-45.1: orden asc y paginado', async () => {
      const s = await seedScenario();
      const headers = customerHeaders(s.carolina.id);

      const asc = await get('/api/customers/me/canjes', headers, { order: 'asc' }).expect(200);
      expect(codes(asc.body.items)).toEqual(['RRRRRR', 'XXXXXX', 'UUUUUU', 'VVVVVV', 'BBBBBB', 'AAAAAA']);

      const page2 = await get('/api/customers/me/canjes', headers, { page: 2, limit: 2 }).expect(200);
      expect(page2.body).toMatchObject({ total: 6, page: 2, limit: 2 });
      expect(codes(page2.body.items)).toEqual(['VVVVVV', 'UUUUUU']);
    });

    it.each([
      [{ fromDate: '2026-11-08', toDate: '2026-11-07' }, 'fromDate no puede ser posterior a toDate'],
      [{ fromDate: '07/11/2026' }, 'fromDate no es una fecha válida (YYYY-MM-DD)'],
      [{ status: 'USED' }, ['status no es un estado válido']],
      [{ order: 'up' }, ['order debe ser desc o asc']],
      [{ limit: 101 }, ['limit no puede superar 100']],
    ])('query %p → 400', async (query, message) => {
      const s = await seedScenario();

      const res = await get('/api/customers/me/canjes', customerHeaders(s.carolina.id), query).expect(400);

      expect(res.body.message).toEqual(message);
    });

    it('un cliente sin canjes recibe lista vacía', async () => {
      const s = await seedScenario();
      const nuevo = await prisma.customer.create({
        data: { firstName: 'Nora', lastName: 'Paz', documentType: 'DNI', documentNumber: '40111222', email: 'nora@example.com' },
      });

      const res = await get('/api/customers/me/canjes', customerHeaders(nuevo.id)).expect(200);

      expect(res.body).toEqual({ items: [], total: 0, page: 1, limit: 20 });
      expect(s).toBeDefined();
    });
  });

  describe('GET /api/customers/:id/canjes — Canjes para usar ahora (§3.12.2)', () => {
    it('CA-45.6: solo los Confirmados vigentes, el que vence primero arriba, con el canje completo', async () => {
      const s = await seedScenario();

      const res = await get(`/api/customers/${s.carolina.id}/canjes`, cashierHeaders(s)).expect(200);

      expect(codes(res.body)).toEqual(['BBBBBB', 'AAAAAA']);
      expect(res.body[0]).toEqual({
        id: expect.any(Number),
        code: 'BBBBBB',
        createdAt: s.at.BBBBBB.toISOString(),
        expiresAt: new Date(s.at.BBBBBB.getTime() + REDEMPTION_DURATION_MS).toISOString(),
        status: 'CONFIRMED',
        reward: { id: s.cafe.id, name: 'Café + medialuna', points: 150 },
        customer: { id: s.carolina.id, firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001' },
        origin: 'APP',
        confirmedBy: null,
        resolvedAt: null,
        resolvedBy: null,
        rejectionReason: null,
        balanceBefore: null,
        balanceAfter: null,
      });
      // Vencer al leer
      expect(await statusOf('VVVVVV')).toBe('EXPIRED');
    });

    it('el Administrador también: el confirmado en caja trae "Confirmado por"', async () => {
      const s = await seedScenario();

      const res = await get(`/api/customers/${s.martin.id}/canjes`, adminHeaders(s)).expect(200);

      expect(codes(res.body)).toEqual(['MMMMMM']);
      expect(res.body[0]).toMatchObject({ origin: 'COUNTER', confirmedBy: { accountId: s.cashier.id, name: 'Bruno Pérez' } });
    });

    it('cliente dado de baja → lista vacía', async () => {
      const s = await seedScenario();

      const res = await get(`/api/customers/${s.lucia.id}/canjes`, cashierHeaders(s)).expect(200);

      expect(res.body).toEqual([]);
    });

    it('cliente inexistente → 404 "No existe el cliente."', async () => {
      const s = await seedScenario();

      const res = await get('/api/customers/999999/canjes', cashierHeaders(s)).expect(404);

      expect(res.body.message).toBe('No existe el cliente.');
      expect(res.body.code).toBeUndefined();
    });
  });

  describe('GET /api/canjes — Canjes del Administrador (§3.12.3)', () => {
    it('sin filtros: todos, más recientes primero, con el canje completo; vence al leer', async () => {
      const s = await seedScenario();

      const res = await get('/api/canjes', adminHeaders(s)).expect(200);

      expect(res.body).toMatchObject({ total: 8, page: 1, limit: 20 });
      expect(codes(res.body.items)).toEqual(['MMMMMM', 'AAAAAA', 'BBBBBB', 'VVVVVV', 'LLLLLL', 'UUUUUU', 'XXXXXX', 'RRRRRR']);
      const byCode = Object.fromEntries(res.body.items.map((item: { code: string }) => [item.code, item]));
      expect(byCode.VVVVVV).toMatchObject({
        status: 'EXPIRED',
        resolvedBy: { actorType: 'SYSTEM', accountId: null, name: 'Sistema' },
      });
      expect(byCode.UUUUUU).toMatchObject({
        status: 'USED',
        resolvedBy: { actorType: 'EMPLOYEE', accountId: s.cashier.id, name: 'Bruno Pérez' },
        balanceBefore: 900,
        balanceAfter: 500,
        customer: { id: s.carolina.id, documentNumber: '38456001' },
      });
      expect(byCode.XXXXXX.resolvedBy).toBeNull();
      expect(byCode.MMMMMM).not.toHaveProperty('canCancel');
    });

    it.each([
      [{ documentNumber: '38.456' }, ['AAAAAA', 'BBBBBB', 'VVVVVV', 'UUUUUU', 'XXXXXX', 'RRRRRR']],
      [{ documentType: 'DNI', documentNumber: '111' }, ['LLLLLL']],
      [{ documentType: 'PASSPORT', documentNumber: 'ab12' }, ['MMMMMM']],
      [{ documentType: 'DNI', documentNumber: 'ab12' }, []],
      [{ documentNumber: '...' }, ['MMMMMM', 'AAAAAA', 'BBBBBB', 'VVVVVV', 'LLLLLL', 'UUUUUU', 'XXXXXX', 'RRRRRR']],
    ])('CA-45.7: documento %p (parcial, normalizado; DNI por defecto)', async (query, expected) => {
      const s = await seedScenario();

      const res = await get('/api/canjes', adminHeaders(s), query).expect(200);

      expect(codes(res.body.items)).toEqual(expected);
    });

    it('CA-45.7: documentType sin documentNumber no filtra', async () => {
      const s = await seedScenario();

      const res = await get('/api/canjes', adminHeaders(s), { documentType: 'PASSPORT' }).expect(200);

      expect(res.body.total).toBe(8);
    });

    it.each([
      [{ code: 'mm' }, ['MMMMMM']],
      [{ code: ' u-u ' }, ['UUUUUU']],
      [{ code: 'O0' }, []],
    ])('CA-45.7: código %p (parcial, normalizado)', async (query, expected) => {
      const s = await seedScenario();

      const res = await get('/api/canjes', adminHeaders(s), query).expect(200);

      expect(codes(res.body.items)).toEqual(expected);
    });

    it.each([
      [{ rewardName: 'BRUNCH' }, ['UUUUUU']],
      [{ rewardName: 'cafe' }, ['MMMMMM', 'AAAAAA', 'BBBBBB', 'VVVVVV', 'LLLLLL', 'XXXXXX', 'RRRRRR']],
      [{ rewardName: 'Medialuna' }, ['MMMMMM', 'AAAAAA', 'BBBBBB', 'VVVVVV', 'LLLLLL', 'XXXXXX', 'RRRRRR']],
      [{ rewardName: '%' }, []],
    ])('CA-45.7: recompensa %p (parcial, sin mayúsculas ni tildes; incluye dadas de baja)', async (query, expected) => {
      const s = await seedScenario();

      const res = await get('/api/canjes', adminHeaders(s), query).expect(200);

      expect(codes(res.body.items)).toEqual(expected);
    });

    it.each([
      ['CONFIRMED', ['MMMMMM', 'AAAAAA', 'BBBBBB']],
      ['USED', ['UUUUUU']],
      ['CANCELLED', ['XXXXXX']],
      ['REJECTED', ['LLLLLL', 'RRRRRR']],
      ['EXPIRED', ['VVVVVV']],
    ])('CA-45.7: status=%s', async (status, expected) => {
      const s = await seedScenario();

      const res = await get('/api/canjes', adminHeaders(s), { status }).expect(200);

      expect(codes(res.body.items)).toEqual(expected);
    });

    it('CA-45.7: un día concreto y un rango; orden asc; paginado', async () => {
      const s = await seedScenario();
      const headers = adminHeaders(s);

      const oneDay = await get('/api/canjes', headers, { fromDate: s.day('RRRRRR'), toDate: s.day('RRRRRR') }).expect(200);
      expect(codes(oneDay.body.items)).toEqual(['RRRRRR']);

      const range = await get('/api/canjes', headers, { fromDate: s.day('XXXXXX'), toDate: s.day('LLLLLL'), order: 'asc' }).expect(200);
      expect(codes(range.body.items)).toEqual(['XXXXXX', 'UUUUUU', 'LLLLLL']);

      const page = await get('/api/canjes', headers, { page: 2, limit: 3 }).expect(200);
      expect(page.body).toMatchObject({ total: 8, page: 2, limit: 3 });
      expect(codes(page.body.items)).toEqual(['VVVVVV', 'LLLLLL', 'UUUUUU']);
    });

    it('combina filtros: documento + estado + recompensa', async () => {
      const s = await seedScenario();

      const res = await get('/api/canjes', adminHeaders(s), { documentNumber: '38456001', status: 'CONFIRMED', rewardName: 'café' }).expect(200);

      expect(codes(res.body.items)).toEqual(['AAAAAA', 'BBBBBB']);
    });

    it.each([
      [{ status: 'PENDING' }, ['status no es un estado válido']],
      [{ documentType: 'CUIT', documentNumber: '1' }, ['documentType debe ser DNI o PASSPORT']],
      [{ documentNumber: '1'.repeat(21) }, ['documentNumber no puede superar los 20 caracteres']],
      [{ code: 'K'.repeat(11) }, ['code no puede superar los 10 caracteres']],
      [{ rewardName: 'x'.repeat(81) }, ['rewardName no puede superar los 80 caracteres']],
      [{ fromDate: '2026-11-08', toDate: '2026-11-07' }, 'fromDate no puede ser posterior a toDate'],
    ])('query %p → 400', async (query, message) => {
      const s = await seedScenario();

      const res = await get('/api/canjes', adminHeaders(s), query).expect(400);

      expect(res.body.message).toEqual(message);
    });
  });

  describe('CA-45.10: permisos', () => {
    it('GET /canjes: Cajero y Cliente → 403', async () => {
      const s = await seedScenario();

      await get('/api/canjes', cashierHeaders(s)).expect(403);
      await get('/api/canjes', customerHeaders(s.carolina.id)).expect(403);
    });

    it('GET /customers/:id/canjes: Cliente → 403', async () => {
      const s = await seedScenario();

      await get(`/api/customers/${s.carolina.id}/canjes`, customerHeaders(s.carolina.id)).expect(403);
    });

    it('GET /customers/me/canjes: Administrador y Cajero → 403', async () => {
      const s = await seedScenario();

      await get('/api/customers/me/canjes', adminHeaders(s)).expect(403);
      await get('/api/customers/me/canjes', cashierHeaders(s)).expect(403);
    });

    it('sin token → 401 en los tres', async () => {
      const s = await seedScenario();

      await request(app.getHttpServer()).get('/api/canjes').expect(401);
      await request(app.getHttpServer()).get('/api/customers/me/canjes').expect(401);
      await request(app.getHttpServer()).get(`/api/customers/${s.carolina.id}/canjes`).expect(401);
    });
  });
});
