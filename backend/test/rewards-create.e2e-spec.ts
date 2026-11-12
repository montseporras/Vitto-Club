import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { deletePointsMovements } from './delete-points-movements.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { toArgentinaDateString } from '../src/shared/time/argentina-date.js';

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// "Hoy" y otros días en hora de Argentina, YYYY-MM-DD
const argentinaDay = (offsetDays: number) => toArgentinaDateString(new Date(Date.now() + offsetDays * DAY_MS));

// Cubre US-34 (contrato S4 §3.2.1, §3.2.3, §3.3 y la auditoría REWARD_CREATED de §3.14.2) contra
// Postgres real.
describe('Crear y listar recompensas (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // La auditoría es solo inserción: no se borra, se mira desde el último id
  let lastAuditId = 0;
  let admin: Staff;
  let cashier: Staff;

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

  // Limpia al terminar: los canjes referencian clientes y recompensas (onDelete Restrict), y las
  // suites que corren después borran clientes y cuentas sin saber de canjes.
  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
    admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Valeria', 'Vitto');
    cashier = await seedEmployee('cajero@vitto.club', 'CASHIER', 'Bruno', 'Pérez');
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  async function cleanDatabase() {
    await deletePointsMovements(prisma);
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
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

  const customerHeaders = { 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '999', 'x-test-customer-id': '1' };

  const post = (body: object) =>
    request(app.getHttpServer()).post('/api/recompensas').set(staffHeaders('ADMIN', admin)).send(body);

  const list = (query: Record<string, string | number> = {}) =>
    request(app.getHttpServer()).get('/api/recompensas').query(query).set(staffHeaders('ADMIN', admin));

  const complete = () => ({
    name: 'Café + medialuna',
    description: 'Café chico con una medialuna de manteca.',
    points: 150,
    stock: 20,
    expiresAt: argentinaDay(30),
  });

  describe('POST /api/recompensas', () => {
    it('CA-34.2: crea con todos los datos → 201 con el Reward completo, ACTIVE y photoUrl null', async () => {
      const body = complete();
      const res = await post(body).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        name: 'Café + medialuna',
        description: 'Café chico con una medialuna de manteca.',
        points: 150,
        stock: 20,
        expiresAt: body.expiresAt,
        daysToExpire: 30,
        status: 'ACTIVE',
        disabledReason: null,
        photoUrl: null,
        usedCount: 0,
        confirmedCount: 0,
        updatedAt: expect.stringMatching(ISO_INSTANT),
      });

      const saved = await prisma.reward.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(saved).toMatchObject({ name: 'Café + medialuna', points: 150, stock: 20, status: 'ACTIVE', deletedAt: null });
      expect(saved.expiresAt?.toISOString().slice(0, 10)).toBe(body.expiresAt);
    });

    it('CA-34.2: audita REWARD_CREATED a nombre del Administrador con Puntos · Stock · Vencimiento', async () => {
      const body = complete();
      await post(body).expect(201);

      const [day, month, year] = body.expiresAt.split('-').reverse();
      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: admin.account.id,
        performedBy: 'Valeria Vitto',
        module: 'REWARDS',
        actionCode: 'REWARD_CREATED',
        description: 'Creó la recompensa "Café + medialuna"',
        affectedCustomerId: null,
        operationCode: null,
        details: [
          { label: 'Puntos', value: '150 pts' },
          { label: 'Stock', value: '20' },
          { label: 'Vencimiento', value: `${day}/${month}/${year}` },
        ],
      });
    });

    it('CA-34.3: sin límite y sin vencimiento → stock y expiresAt null; auditoría "Sin límite" y "No vence"', async () => {
      const res = await post({ ...complete(), stock: null, expiresAt: null }).expect(201);

      expect(res.body).toMatchObject({ stock: null, expiresAt: null, daysToExpire: null });
      const [row] = await newAuditRows();
      expect(row.details).toEqual([
        { label: 'Puntos', value: '150 pts' },
        { label: 'Stock', value: 'Sin límite' },
        { label: 'Vencimiento', value: 'No vence' },
      ]);
    });

    it('recorta el nombre y la descripción; descripción vacía o ausente → null', async () => {
      const res = await post({ ...complete(), name: '  Brunch  ', description: '   ' }).expect(201);
      expect(res.body).toMatchObject({ name: 'Brunch', description: null });

      const { description: _omitted, ...withoutDescription } = complete();
      const res2 = await post({ ...withoutDescription, name: 'Licuado' }).expect(201);
      expect(res2.body.description).toBeNull();
    });

    it('vence hoy → 201 con daysToExpire 0', async () => {
      const res = await post({ ...complete(), expiresAt: argentinaDay(0) }).expect(201);
      expect(res.body.daysToExpire).toBe(0);
    });

    describe('CA-34.4: validaciones (400 con el mensaje de §3.2.3, sin guardar ni auditar)', () => {
      it.each([
        ['nombre vacío', { name: '   ' }, 'Completá este campo.'],
        ['nombre de 81', { name: 'a'.repeat(81) }, 'Máximo 80 caracteres.'],
        ['descripción de 256', { description: 'd'.repeat(256) }, 'Máximo 255 caracteres.'],
        ['puntos 0', { points: 0 }, 'Ingresá un número entero mayor a 0.'],
        ['puntos con decimales', { points: 10.5 }, 'Ingresá un número entero mayor a 0.'],
        ['puntos de más', { points: 1_000_001 }, 'El máximo es 1.000.000 puntos.'],
        ['stock 0 al crear', { stock: 0 }, 'Ingresá un número entero mayor a 0.'],
        ['stock con decimales', { stock: 2.5 }, 'Ingresá un número entero, sin decimales.'],
        ['stock de más', { stock: 100_001 }, 'El máximo es 100.000.'],
        ['fecha mal escrita', { expiresAt: '2026-02-30' }, 'expiresAt no es una fecha válida (YYYY-MM-DD)'],
      ])('%s', async (_case, override, message) => {
        const res = await post({ ...complete(), ...override }).expect(400);

        expect(res.body.message).toEqual([message]);
        expect(await prisma.reward.count()).toBe(0);
        expect(await newAuditRows()).toHaveLength(0);
      });

      it.each(['name', 'points', 'stock', 'expiresAt'] as const)('sin %s → "Completá este campo."', async (field) => {
        const body: Record<string, unknown> = complete();
        delete body[field];

        const res = await post(body).expect(400);
        expect(res.body.message).toEqual(['Completá este campo.']);
      });

      it('fecha anterior a hoy → "La fecha no puede ser anterior a hoy." en expiresAt', async () => {
        const res = await post({ ...complete(), expiresAt: argentinaDay(-1) }).expect(400);

        expect(res.body).toMatchObject({
          statusCode: 400,
          message: 'La fecha no puede ser anterior a hoy.',
          details: [{ field: 'expiresAt', message: 'La fecha no puede ser anterior a hoy.' }],
        });
        expect(await prisma.reward.count()).toBe(0);
        expect(await newAuditRows()).toHaveLength(0);
      });
    });

    describe('CA-34.5: nombre repetido', () => {
      it('" café + MEDIALUNA " con "Café + medialuna" no dada de baja → 409 REWARD_NAME_IN_USE', async () => {
        await post(complete()).expect(201);
        lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;

        const res = await post({ ...complete(), name: ' café + MEDIALUNA ' }).expect(409);

        expect(res.body).toMatchObject({
          statusCode: 409,
          code: 'REWARD_NAME_IN_USE',
          message: 'Ya existe una recompensa con ese nombre.',
        });
        expect(await prisma.reward.count()).toBe(1);
        expect(await newAuditRows()).toHaveLength(0);
      });

      it('también choca con una Inactiva', async () => {
        await prisma.reward.create({ data: { name: 'Café + medialuna', points: 100, status: 'INACTIVE' } });

        const res = await post(complete()).expect(409);
        expect(res.body.code).toBe('REWARD_NAME_IN_USE');
      });

      it('el nombre de una dada de baja está libre → 201', async () => {
        await prisma.reward.create({
          data: { name: 'Café + medialuna', points: 100, status: 'DELETED', deletedAt: new Date() },
        });

        await post(complete()).expect(201);
      });
    });

    it.each([
      ['status', 'INACTIVE'],
      ['usedCount', 5],
      ['id', 99],
      ['createdAt', '2026-01-01T00:00:00.000Z'],
      ['photoUrl', 'https://example.com/foto.png'],
    ])('CA-34.7: %s en el body → 400 "property X should not exist"', async (field, value) => {
      const res = await post({ ...complete(), [field]: value }).expect(400);

      expect(res.body.message).toEqual([`property ${field} should not exist`]);
      expect(await prisma.reward.count()).toBe(0);
    });
  });

  describe('GET /api/recompensas — CA-34.1', () => {
    const at = (iso: string) => new Date(iso);

    async function seedRewards() {
      const cafe = await prisma.reward.create({
        data: { name: 'Café + medialuna', points: 150, stock: 20, updatedAt: at('2026-11-01T12:00:00.000Z') },
      });
      const licuado = await prisma.reward.create({
        data: { name: 'Licuado de estación', points: 200, status: 'INACTIVE', updatedAt: at('2026-11-03T12:00:00.000Z') },
      });
      const pizza = await prisma.reward.create({
        data: {
          name: 'Pizza libre viernes',
          points: 900,
          stock: 0,
          status: 'DISABLED',
          disabledReason: 'OUT_OF_STOCK',
          updatedAt: at('2026-11-02T12:00:00.000Z'),
        },
      });
      const cafeConLeche = await prisma.reward.create({
        data: { name: 'CAFÉ CON LECHE', points: 120, updatedAt: at('2026-10-30T12:00:00.000Z') },
      });
      await prisma.reward.create({
        data: { name: 'Brunch para dos', points: 1200, status: 'DELETED', deletedAt: new Date(), updatedAt: at('2026-11-05T12:00:00.000Z') },
      });
      return { cafe, licuado, pizza, cafeConLeche };
    }

    it('todas menos las dadas de baja, por última modificación, con la forma del Reward', async () => {
      const { cafe, licuado, pizza, cafeConLeche } = await seedRewards();

      const res = await list().expect(200);

      expect(res.body).toMatchObject({ total: 4, page: 1, limit: 20 });
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([
        licuado.id,
        pizza.id,
        cafe.id,
        cafeConLeche.id,
      ]);
      expect(res.body.items[1]).toEqual({
        id: pizza.id,
        name: 'Pizza libre viernes',
        description: null,
        points: 900,
        stock: 0,
        expiresAt: null,
        daysToExpire: null,
        status: 'DISABLED',
        disabledReason: 'OUT_OF_STOCK',
        photoUrl: null,
        usedCount: 0,
        confirmedCount: 0,
        updatedAt: '2026-11-02T12:00:00.000Z',
      });
    });

    it('q: parte del nombre, sin mayúsculas ni tildes', async () => {
      const { cafe, cafeConLeche } = await seedRewards();

      const res = await list({ q: 'cafe' }).expect(200);

      expect(res.body.total).toBe(2);
      expect(res.body.items.map((item: { id: number }) => item.id)).toEqual([cafe.id, cafeConLeche.id]);
      expect((await list({ q: 'LECHÉ' }).expect(200)).body.items.map((item: { id: number }) => item.id)).toEqual([
        cafeConLeche.id,
      ]);
    });

    it('q nunca trae una dada de baja', async () => {
      await seedRewards();
      expect((await list({ q: 'brunch' }).expect(200)).body).toMatchObject({ items: [], total: 0 });
    });

    it.each([
      ['ACTIVE', ['Café + medialuna', 'CAFÉ CON LECHE']],
      ['DISABLED', ['Pizza libre viernes']],
      ['INACTIVE', ['Licuado de estación']],
    ])('status=%s', async (status, names) => {
      await seedRewards();

      const res = await list({ status }).expect(200);
      expect(res.body.items.map((item: { name: string }) => item.name)).toEqual(names);
    });

    it('status=DELETED → 400', async () => {
      await list({ status: 'DELETED' }).expect(400);
    });

    it('paginado de a 10: "Mostrando 1–10 de N"', async () => {
      for (let i = 1; i <= 12; i++) {
        await prisma.reward.create({
          data: { name: `Recompensa ${i}`, points: 100, updatedAt: new Date(Date.UTC(2026, 9, i, 12)) },
        });
      }

      const first = await list({ page: 1, limit: 10 }).expect(200);
      expect(first.body).toMatchObject({ total: 12, page: 1, limit: 10 });
      expect(first.body.items).toHaveLength(10);
      expect(first.body.items[0].name).toBe('Recompensa 12');

      const second = await list({ page: 2, limit: 10 }).expect(200);
      expect(second.body.items.map((item: { name: string }) => item.name)).toEqual(['Recompensa 2', 'Recompensa 1']);
    });

    it('vacío → items [] y total 0', async () => {
      expect((await list({ q: 'nada' }).expect(200)).body).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });

    it('confirmedCount: solo los CONFIRMED que todavía no vencieron', async () => {
      const { cafe } = await seedRewards();
      const customer = await prisma.customer.create({
        data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
      });
      const redemption = (code: string, createdAt: Date, extra: object = {}) =>
        prisma.redemption.create({
          data: {
            code,
            customerId: customer.id,
            rewardId: cafe.id,
            rewardName: cafe.name,
            points: cafe.points,
            origin: 'APP',
            createdAt,
            expiresAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
            ...extra,
          },
        });
      const now = Date.now();
      // Dos vigentes
      await redemption('AAAAAA', new Date(now - 5 * 60 * 1000));
      await redemption('BBBBBB', new Date(now - 60 * 1000));
      // Vencido pero todavía CONFIRMED (el barrido no pasó) y uno ya usado: no cuentan
      await redemption('CCCCCC', new Date(now - 20 * 60 * 1000));
      await redemption('DDDDDD', new Date(now - 10 * 60 * 1000), {
        status: 'USED',
        resolvedAt: new Date(now - 9 * 60 * 1000),
        resolvedByName: 'Bruno Pérez',
        balanceBefore: 300,
        balanceAfter: 150,
      });

      const res = await list({ status: 'ACTIVE' }).expect(200);
      const item = res.body.items.find((reward: { id: number }) => reward.id === cafe.id);
      expect(item.confirmedCount).toBe(2);
    });

    it('no audita las consultas', async () => {
      await seedRewards();
      await list().expect(200);
      expect(await newAuditRows()).toHaveLength(0);
    });
  });

  describe('CA-34.8: permisos', () => {
    it.each(['GET', 'POST'] as const)('%s: Cajero → 403, Cliente → 403, sin token → 401', async (method) => {
      const call = () =>
        method === 'GET'
          ? request(app.getHttpServer()).get('/api/recompensas')
          : request(app.getHttpServer()).post('/api/recompensas').send(complete());

      await call().set(staffHeaders('CASHIER', cashier)).expect(403);
      await call().set(customerHeaders).expect(403);
      await call().expect(401);

      expect(await prisma.reward.count()).toBe(0);
      // Los intentos sin permiso no se auditan (decisión D-04)
      expect(await newAuditRows()).toHaveLength(0);
    });
  });
});
