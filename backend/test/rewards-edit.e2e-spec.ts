import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { toArgentinaDateString } from '../src/shared/time/argentina-date.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// "Hoy" y otros días en hora de Argentina, YYYY-MM-DD
const argentinaDay = (offsetDays: number) => toArgentinaDateString(new Date(Date.now() + offsetDays * DAY_MS));
const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);
const display = (value: string) => value.split('-').reverse().join('/');

// Cubre US-35 (contrato S4 §3.2.2, §3.2.4, §3.4 y la auditoría REWARD_UPDATED, REWARD_ENABLED y
// REWARD_DISABLED de §3.14.2) contra Postgres real.
describe('Editar recompensas (e2e)', () => {
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
    await prisma.pointsMovement.deleteMany();
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

  const patch = (id: number, body: object) =>
    request(app.getHttpServer()).patch(`/api/recompensas/${id}`).set(staffHeaders('ADMIN', admin)).send(body);

  // Una Activa de 150 pts, stock 20, que vence en 30 días; modificada por última vez el 01/10
  async function seedReward(data: Partial<Prisma.RewardUncheckedCreateInput> = {}) {
    return await prisma.reward.create({
      data: {
        name: 'Café + medialuna',
        points: 150,
        stock: 20,
        expiresAt: dateOnly(argentinaDay(30)),
        updatedAt: new Date('2026-10-01T12:00:00.000Z'),
        ...data,
      },
    });
  }

  // Canjes CONFIRMED vigentes de una recompensa (confirmados hace un minuto)
  async function seedConfirmed(reward: { id: number; name: string; points: number }, codes: string[]) {
    const customer = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
    });
    const createdAt = new Date(Date.now() - 60 * 1000);
    for (const code of codes) {
      await prisma.redemption.create({
        data: {
          code,
          customerId: customer.id,
          rewardId: reward.id,
          rewardName: reward.name,
          points: reward.points,
          origin: 'APP',
          createdAt,
          expiresAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
        },
      });
    }
  }

  describe('GET /api/recompensas/:id', () => {
    it('200 con el Reward y sus canjes confirmados', async () => {
      const reward = await seedReward();
      await seedConfirmed(reward, ['AAAAAA', 'BBBBBB']);

      const res = await request(app.getHttpServer())
        .get(`/api/recompensas/${reward.id}`)
        .set(staffHeaders('ADMIN', admin))
        .expect(200);

      expect(res.body).toMatchObject({ id: reward.id, name: 'Café + medialuna', confirmedCount: 2, photoUrl: null });
    });

    it('CA-35.10: dada de baja o inexistente → 404 "No existe la recompensa."', async () => {
      const deleted = await seedReward({ status: 'DELETED', deletedAt: new Date() });

      for (const id of [deleted.id, 999999]) {
        const res = await request(app.getHttpServer())
          .get(`/api/recompensas/${id}`)
          .set(staffHeaders('ADMIN', admin))
          .expect(404);
        expect(res.body.message).toBe('No existe la recompensa.');
      }
    });
  });

  describe('PATCH /api/recompensas/:id', () => {
    it('CA-35.1: stock 0 → 20: guarda, sube en el listado y audita "Stock: 0 → 20"', async () => {
      const reward = await seedReward({ stock: 0, status: 'INACTIVE' });
      await seedReward({ name: 'Licuado', updatedAt: new Date('2026-10-15T12:00:00.000Z') });

      const res = await patch(reward.id, { stock: 20 }).expect(200);

      expect(res.body).toEqual({
        reward: expect.objectContaining({ id: reward.id, stock: 20, status: 'INACTIVE', confirmedCount: 0 }),
        availabilityChange: null,
      });
      const list = await request(app.getHttpServer()).get('/api/recompensas').set(staffHeaders('ADMIN', admin)).expect(200);
      expect(list.body.items[0].id).toBe(reward.id);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: admin.account.id,
        performedBy: 'Valeria Vitto',
        module: 'REWARDS',
        actionCode: 'REWARD_UPDATED',
        description: 'Editó la recompensa "Café + medialuna"',
        details: [{ label: 'Stock', value: '0 → 20' }],
      });
    });

    it('CA-35.1: varios campos → una fila por cada uno, en orden', async () => {
      const reward = await seedReward({ expiresAt: null });
      const newDate = argentinaDay(45);

      const res = await patch(reward.id, {
        name: 'Café doble',
        description: 'Con manteca',
        points: 200,
        stock: null,
        expiresAt: newDate,
      }).expect(200);

      expect(res.body.reward).toMatchObject({
        name: 'Café doble',
        description: 'Con manteca',
        points: 200,
        stock: null,
        expiresAt: newDate,
        daysToExpire: 45,
      });
      const [row] = await newAuditRows();
      expect(row.description).toBe('Editó la recompensa "Café doble"');
      expect(row.details).toEqual([
        { label: 'Nombre', value: 'Café + medialuna → Café doble' },
        { label: 'Descripción', value: '— → Con manteca' },
        { label: 'Puntos', value: '150 pts → 200 pts' },
        { label: 'Stock', value: '20 → Sin límite' },
        { label: 'Vencimiento', value: `No vence → ${display(newDate)}` },
      ]);
    });

    describe('CA-35.2: sin cambios', () => {
      it('mismos valores (fecha vigente o null) → 200, sin auditar ni tocar updatedAt', async () => {
        const reward = await seedReward();
        const withoutDate = await seedReward({ name: 'Licuado', expiresAt: null });

        await patch(reward.id, { name: 'Café + medialuna', points: 150, stock: 20, expiresAt: argentinaDay(30) }).expect(200);
        const res = await patch(withoutDate.id, { expiresAt: null }).expect(200);

        expect(res.body.availabilityChange).toBeNull();
        expect(await newAuditRows()).toHaveLength(0);
        const saved = await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } });
        expect(saved.updatedAt.toISOString()).toBe('2026-10-01T12:00:00.000Z');
      });

      it('body vacío → 400 "Indicá al menos un campo para modificar."', async () => {
        const reward = await seedReward();

        const res = await patch(reward.id, {}).expect(400);
        expect(res.body.message).toBe('Indicá al menos un campo para modificar.');
      });
    });

    it('CA-35.8: vencida con su fecha vieja → 400 "La fecha no puede ser anterior a hoy.", sin guardar', async () => {
      const oldDate = argentinaDay(-3);
      const reward = await seedReward({ expiresAt: dateOnly(oldDate), status: 'DISABLED', disabledReason: 'EXPIRED' });

      const res = await patch(reward.id, { points: 200, expiresAt: oldDate }).expect(400);

      expect(res.body).toMatchObject({
        message: 'La fecha no puede ser anterior a hoy.',
        details: [{ field: 'expiresAt', message: 'La fecha no puede ser anterior a hoy.' }],
      });
      expect((await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } })).points).toBe(150);
      expect(await newAuditRows()).toHaveLength(0);
    });

    describe('CA-35.3: stock y canjes confirmados', () => {
      it('con 2 confirmados, stock 1 → 409 STOCK_BELOW_CONFIRMED con el número', async () => {
        const reward = await seedReward();
        await seedConfirmed(reward, ['AAAAAA', 'BBBBBB']);

        const res = await patch(reward.id, { stock: 1 }).expect(409);

        expect(res.body).toMatchObject({
          code: 'STOCK_BELOW_CONFIRMED',
          message: 'El stock no puede ser menor a los 2 canjes confirmados.',
        });
        expect((await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } })).stock).toBe(20);
        expect(await newAuditRows()).toHaveLength(0);
      });

      it('con 2 confirmados, stock 2 → 200', async () => {
        const reward = await seedReward();
        await seedConfirmed(reward, ['AAAAAA', 'BBBBBB']);

        const res = await patch(reward.id, { stock: 2 }).expect(200);
        expect(res.body.reward).toMatchObject({ stock: 2, confirmedCount: 2 });
      });

      it('stock negativo → 400 "Ingresá un número entero mayor o igual a 0."', async () => {
        const reward = await seedReward();

        const res = await patch(reward.id, { stock: -1 }).expect(400);
        expect(res.body.message).toEqual(['Ingresá un número entero mayor o igual a 0.']);
      });
    });

    it('CA-35.4: cambiar los puntos no toca los canjes ya confirmados', async () => {
      const reward = await seedReward();
      await seedConfirmed(reward, ['AAAAAA']);

      await patch(reward.id, { points: 200 }).expect(200);

      const redemption = await prisma.redemption.findUniqueOrThrow({ where: { code: 'AAAAAA' } });
      expect(redemption).toMatchObject({ points: 150, rewardName: 'Café + medialuna', status: 'CONFIRMED' });
    });

    describe('CA-35.5: vuelve a estar disponible', () => {
      it('Agotada que repone stock → ACTIVE, ENABLED y REWARD_ENABLED "Motivo: Stock repuesto" (Sistema)', async () => {
        const reward = await seedReward({ stock: 0, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' });

        const res = await patch(reward.id, { stock: 20 }).expect(200);

        expect(res.body).toMatchObject({
          reward: { status: 'ACTIVE', disabledReason: null, stock: 20 },
          availabilityChange: 'ENABLED',
        });
        const rows = await newAuditRows();
        expect(rows.map((row) => [row.actionCode, row.actorType])).toEqual([
          ['REWARD_UPDATED', 'EMPLOYEE'],
          ['REWARD_ENABLED', 'SYSTEM'],
        ]);
        expect(rows[1]).toMatchObject({
          actorAccountId: null,
          performedBy: 'Sistema',
          description: 'Habilitó la recompensa "Café + medialuna"',
          details: [{ label: 'Motivo', value: 'Stock repuesto' }],
        });
      });

      it.each([
        ['fecha nueva', () => argentinaDay(10)],
        ['"No vence"', () => null],
      ])('Vencida con %s → ACTIVE y "Motivo: Fecha de vencimiento actualizada"', async (_case, newDate) => {
        const reward = await seedReward({ expiresAt: dateOnly(argentinaDay(-3)), status: 'DISABLED', disabledReason: 'EXPIRED' });

        const res = await patch(reward.id, { expiresAt: newDate() }).expect(200);

        expect(res.body).toMatchObject({ reward: { status: 'ACTIVE' }, availabilityChange: 'ENABLED' });
        const rows = await newAuditRows();
        expect(rows[1]).toMatchObject({
          actionCode: 'REWARD_ENABLED',
          details: [{ label: 'Motivo', value: 'Fecha de vencimiento actualizada' }],
        });
      });
    });

    it('CA-35.6: Activa sin confirmados con stock 0 → DISABLED / OUT_OF_STOCK y REWARD_DISABLED "Motivo: Sin stock"', async () => {
      const reward = await seedReward();

      const res = await patch(reward.id, { stock: 0 }).expect(200);

      expect(res.body).toMatchObject({
        reward: { status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', stock: 0 },
        availabilityChange: 'DISABLED',
      });
      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual(['REWARD_UPDATED', 'REWARD_DISABLED']);
      expect(rows[1]).toMatchObject({
        actorType: 'SYSTEM',
        description: 'Deshabilitó la recompensa "Café + medialuna"',
        details: [{ label: 'Motivo', value: 'Sin stock' }],
      });
    });

    it('CA-35.7: Inactiva sin stock a la que se repone → sigue INACTIVE, sin REWARD_ENABLED', async () => {
      const reward = await seedReward({ stock: 0, status: 'INACTIVE' });

      const res = await patch(reward.id, { stock: 5 }).expect(200);

      expect(res.body).toMatchObject({ reward: { status: 'INACTIVE' }, availabilityChange: null });
      expect((await newAuditRows()).map((row) => row.actionCode)).toEqual(['REWARD_UPDATED']);
    });

    it('Agotada que repone stock pero ya venció → sigue DISABLED con motivo EXPIRED y audita REWARD_DISABLED "Vencida" (US-37)', async () => {
      const reward = await seedReward({
        stock: 0,
        expiresAt: dateOnly(argentinaDay(-2)),
        status: 'DISABLED',
        disabledReason: 'OUT_OF_STOCK',
      });

      const res = await patch(reward.id, { stock: 10 }).expect(200);

      expect(res.body).toMatchObject({
        reward: { status: 'DISABLED', disabledReason: 'EXPIRED' },
        availabilityChange: null,
      });
      const rows = await newAuditRows();
      expect(rows.map((row) => [row.actionCode, row.actorType])).toEqual([
        ['REWARD_UPDATED', 'EMPLOYEE'],
        ['REWARD_DISABLED', 'SYSTEM'],
      ]);
      expect(rows[1].details).toEqual([{ label: 'Motivo', value: 'Vencida' }]);
    });

    it('Activa vencida que el proceso diario no marcó: al editar otro campo queda DISABLED / EXPIRED (US-37)', async () => {
      const reward = await seedReward({ expiresAt: dateOnly(argentinaDay(-1)) });

      const res = await patch(reward.id, { points: 200 }).expect(200);

      expect(res.body).toMatchObject({
        reward: { points: 200, status: 'DISABLED', disabledReason: 'EXPIRED' },
        availabilityChange: 'DISABLED',
      });
      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual(['REWARD_UPDATED', 'REWARD_DISABLED']);
      expect(rows[1].details).toEqual([{ label: 'Motivo', value: 'Vencida' }]);
    });

    describe('nombre', () => {
      it('el de otra no dada de baja → 409 REWARD_NAME_IN_USE', async () => {
        const reward = await seedReward();
        await seedReward({ name: 'Brunch para dos' });

        const res = await patch(reward.id, { name: ' brunch PARA dos ' }).expect(409);
        expect(res.body).toMatchObject({ code: 'REWARD_NAME_IN_USE', message: 'Ya existe una recompensa con ese nombre.' });
      });

      it('el propio con otras mayúsculas → 200; el de una dada de baja → 200', async () => {
        const reward = await seedReward();
        await seedReward({ name: 'Brunch para dos', status: 'DELETED', deletedAt: new Date() });

        await patch(reward.id, { name: 'CAFÉ + MEDIALUNA' }).expect(200);
        await patch(reward.id, { name: 'Brunch para dos' }).expect(200);
      });
    });

    it('CA-35.10: dada de baja → 404, sin tocar nada', async () => {
      const reward = await seedReward({ status: 'DELETED', deletedAt: new Date() });

      const res = await patch(reward.id, { points: 200 }).expect(404);
      expect(res.body.message).toBe('No existe la recompensa.');
      expect(await newAuditRows()).toHaveLength(0);
    });

    it.each(['status', 'disabledReason', 'usedCount'])('%s en el body → 400 "property X should not exist"', async (field) => {
      const reward = await seedReward();

      const res = await patch(reward.id, { [field]: 'ACTIVE' }).expect(400);
      expect(res.body.message).toEqual([`property ${field} should not exist`]);
    });
  });

  describe('CA-35.11: permisos', () => {
    it.each(['GET', 'PATCH'] as const)('%s /:id: Cajero → 403, Cliente → 403, sin token → 401', async (method) => {
      const reward = await seedReward();
      const call = () =>
        method === 'GET'
          ? request(app.getHttpServer()).get(`/api/recompensas/${reward.id}`)
          : request(app.getHttpServer()).patch(`/api/recompensas/${reward.id}`).send({ points: 200 });

      await call().set(staffHeaders('CASHIER', cashier)).expect(403);
      await call().set(customerHeaders).expect(403);
      await call().expect(401);

      expect((await prisma.reward.findUniqueOrThrow({ where: { id: reward.id } })).points).toBe(150);
      expect(await newAuditRows()).toHaveLength(0);
    });
  });
});
