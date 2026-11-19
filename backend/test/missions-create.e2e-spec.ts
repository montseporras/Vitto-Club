import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AuditService } from '../src/audit/application/audit.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { toArgentinaDateString } from '../src/shared/time/argentina-date.js';
import { deleteNotifications } from './delete-notifications.js';
import { deletePointsMovements } from './delete-points-movements.js';

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// El mes actual en Argentina y los de alrededor, YYYY-MM
const CURRENT_MONTH = toArgentinaDateString(new Date()).slice(0, 7);
function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}
const monthName = (month: string) => `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
const monthDate = (month: string) => new Date(`${month}-01T00:00:00.000Z`);

// Cubre US-28 (contrato S5 §3.1.1 a §3.1.3, §2.3 y la auditoría MISSION_CREATED de §3.14.2) contra
// Postgres real.
describe('Crear y listar misiones (e2e)', () => {
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

    // Mismo mecanismo que rewards-create.e2e-spec.ts: el token se arma con los headers de test
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

  // Limpia al terminar: las asignaciones referencian clientes y misiones (onDelete Restrict), y las
  // suites que corren después borran clientes y cuentas sin saber de misiones.
  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await cleanDatabase();
    admin = await seedEmployee('admin@vitto.club', 'ADMIN', 'Valeria', 'Vitto');
    cashier = await seedEmployee('cajero@vitto.club', 'CASHIER', 'Bruno', 'Pérez');
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  async function cleanDatabase() {
    await deleteNotifications(prisma);
    await deletePointsMovements(prisma);
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.customerMission.deleteMany();
    await prisma.mission.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customerStatusChange.deleteMany();
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
    request(app.getHttpServer()).post('/api/misiones').set(staffHeaders('ADMIN', admin)).send(body);

  const list = (query: Record<string, string | number> = {}) =>
    request(app.getHttpServer()).get('/api/misiones').query(query).set(staffHeaders('ADMIN', admin));

  // CA-28.2: "Vení 3 veces", cantidad de consumos, objetivo 3, 50 pts, desde el mes actual
  const veni3 = () => ({
    name: 'Vení 3 veces',
    description: 'Tres consumos en el mes.',
    objectiveType: 'CONSUMPTION_COUNT',
    target: 3,
    rewardPoints: 50,
    startMonth: CURRENT_MONTH,
  });

  // Una misión guardada directo en la base, para el listado
  async function seedMission(data: {
    name: string;
    startMonth?: string;
    endMonth?: string | null;
    status?: 'ACTIVE' | 'DELETED';
    createdAt?: Date;
  }) {
    const status = data.status ?? 'ACTIVE';
    return await prisma.mission.create({
      data: {
        name: data.name,
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints: 50,
        startMonth: monthDate(data.startMonth ?? CURRENT_MONTH),
        endMonth: data.endMonth ? monthDate(data.endMonth) : null,
        status,
        deletedAt: status === 'DELETED' ? new Date() : null,
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      },
    });
  }

  describe('POST /api/misiones', () => {
    it('CA-28.2: crea "Vení 3 veces" → 201 con el Mission completo, ACTIVE y RUNNING', async () => {
      const res = await post(veni3()).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        name: 'Vení 3 veces',
        description: 'Tres consumos en el mes.',
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        daysOfWeek: null,
        timeFrom: null,
        timeTo: null,
        rewardPoints: 50,
        startMonth: CURRENT_MONTH,
        endMonth: null,
        status: 'ACTIVE',
        phase: 'RUNNING',
        pendingChanges: null,
        completedCount: 0,
        createdAt: expect.stringMatching(ISO_INSTANT),
        updatedAt: expect.stringMatching(ISO_INSTANT),
      });

      const saved = await prisma.mission.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(saved).toMatchObject({
        name: 'Vení 3 veces',
        objectiveType: 'CONSUMPTION_COUNT',
        rewardPoints: 50,
        daysOfWeek: [],
        timeFrom: null,
        timeTo: null,
        endMonth: null,
        pendingChanges: null,
        status: 'ACTIVE',
        deletedAt: null,
      });
      expect(saved.target.toNumber()).toBe(3);
      expect(saved.startMonth.toISOString().slice(0, 10)).toBe(`${CURRENT_MONTH}-01`);
    });

    it('CA-28.2: audita MISSION_CREATED a nombre del Administrador con Objetivo · Condición · Recompensa · Vigencia', async () => {
      await post(veni3()).expect(201);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: admin.account.id,
        performedBy: 'Valeria Vitto',
        module: 'MISSIONS',
        actionCode: 'MISSION_CREATED',
        description: 'Creó la misión "Vení 3 veces"',
        affectedCustomerId: null,
        operationCode: null,
        details: [
          { label: 'Objetivo', value: '3 consumos' },
          { label: 'Condición', value: 'Todos los días' },
          { label: 'Recompensa', value: '50 pts' },
          { label: 'Vigencia', value: `Desde ${monthName(CURRENT_MONTH)}` },
        ],
      });
    });

    it('CA-28.3: "Sin recompensa" → rewardPoints null y la auditoría dice "Sin recompensa"', async () => {
      const res = await post({ ...veni3(), rewardPoints: null }).expect(201);
      expect(res.body.rewardPoints).toBeNull();

      const { rewardPoints: _omitted, ...withoutReward } = veni3();
      const res2 = await post({ ...withoutReward, name: 'Sin premio' }).expect(201);
      expect(res2.body.rewardPoints).toBeNull();

      const rows = await newAuditRows();
      expect(rows.map((row) => row.details)).toEqual([
        expect.arrayContaining([{ label: 'Recompensa', value: 'Sin recompensa' }]),
        expect.arrayContaining([{ label: 'Recompensa', value: 'Sin recompensa' }]),
      ]);
      const listed = await list().expect(200);
      expect(listed.body.items.map((item: { rewardPoints: number | null }) => item.rewardPoints)).toEqual([null, null]);
    });

    it('CA-28.4: domingo de 09:00 a 13:00 se guarda, vuelve igual y va a la auditoría', async () => {
      const res = await post({ ...veni3(), daysOfWeek: [7], timeFrom: '09:00', timeTo: '13:00' }).expect(201);
      expect(res.body).toMatchObject({ daysOfWeek: [7], timeFrom: '09:00', timeTo: '13:00' });

      const listed = await list().expect(200);
      expect(listed.body.items[0]).toMatchObject({ daysOfWeek: [7], timeFrom: '09:00', timeTo: '13:00' });

      const [row] = await newAuditRows();
      expect(row.details).toEqual(
        expect.arrayContaining([{ label: 'Condición', value: 'los domingos de 09:00 a 13:00' }]),
      );
    });

    it('días desordenados → se guardan y vuelven de lunes a domingo', async () => {
      const res = await post({ ...veni3(), daysOfWeek: [7, 1, 3] }).expect(201);
      expect(res.body.daysOfWeek).toEqual([1, 3, 7]);

      const [row] = await newAuditRows();
      expect(row.details).toEqual(
        expect.arrayContaining([{ label: 'Condición', value: 'los lunes, miércoles y domingos' }]),
      );
    });

    it('monto acumulado con decimales, mes de fin y una misión que empieza más adelante → UPCOMING', async () => {
      const start = shiftMonth(CURRENT_MONTH, 1);
      const end = shiftMonth(CURRENT_MONTH, 2);
      const res = await post({
        ...veni3(),
        name: 'Gastá $ 20.000',
        objectiveType: 'CONSUMPTION_AMOUNT',
        target: 20000.5,
        startMonth: start,
        endMonth: end,
      }).expect(201);

      expect(res.body).toMatchObject({ objectiveType: 'CONSUMPTION_AMOUNT', target: 20000.5, startMonth: start, endMonth: end, phase: 'UPCOMING' });
      const capitalized = (month: string) => monthName(month).charAt(0).toUpperCase() + monthName(month).slice(1);
      const [row] = await newAuditRows();
      expect(row.details).toEqual([
        { label: 'Objetivo', value: '$ 20.000,5 en consumos' },
        { label: 'Condición', value: 'Todos los días' },
        { label: 'Recompensa', value: '50 pts' },
        { label: 'Vigencia', value: `${capitalized(start)} – ${capitalized(end)}` },
      ]);
    });

    it('recorta el nombre y la descripción; descripción vacía o ausente → null', async () => {
      const res = await post({ ...veni3(), name: '  Brunch  ', description: '   ' }).expect(201);
      expect(res.body).toMatchObject({ name: 'Brunch', description: null });

      const { description: _omitted, ...withoutDescription } = veni3();
      const res2 = await post({ ...withoutDescription, name: 'Licuado' }).expect(201);
      expect(res2.body.description).toBeNull();
    });

    describe('CA-28.5: validaciones (400 con el mensaje de §3.1.3, sin guardar ni auditar)', () => {
      it.each([
        ['nombre vacío', { name: '   ' }, 'El nombre es obligatorio.'],
        ['nombre de 81', { name: 'a'.repeat(81) }, 'El nombre no puede superar los 80 caracteres.'],
        ['descripción de 256', { description: 'd'.repeat(256) }, 'La descripción no puede superar los 255 caracteres.'],
        ['objetivo 0', { target: 0 }, 'Ingresá un objetivo mayor a 0.'],
        ['cantidad de más', { target: 101 }, 'El objetivo máximo es 100.'],
        ['cantidad con decimales', { target: 2.5 }, 'Ingresá un número entero.'],
        ['monto de más', { objectiveType: 'CONSUMPTION_AMOUNT', target: 1_000_001 }, 'El objetivo máximo es 1.000.000.'],
        ['puntos 0', { rewardPoints: 0 }, 'Ingresá puntos enteros mayores a 0.'],
        ['puntos de más', { rewardPoints: 100_001 }, 'El máximo es 100.000 puntos.'],
        ['días vacíos', { daysOfWeek: [] }, 'Elegí al menos un día o marcá «Todos los días».'],
        ['una sola hora', { timeFrom: '09:00' }, 'Completá las dos horas o ninguna.'],
        ['horas invertidas', { timeFrom: '13:00', timeTo: '09:00' }, 'La hora de inicio tiene que ser anterior a la de fin.'],
        ['mes de fin anterior al de inicio', { endMonth: shiftMonth(CURRENT_MONTH, -1) }, 'El mes de fin no puede ser anterior al de inicio.'],
      ])('%s', async (_case, override, message) => {
        const res = await post({ ...veni3(), ...override }).expect(400);

        expect(res.body.message).toEqual([message]);
        expect(await prisma.mission.count()).toBe(0);
        expect(await newAuditRows()).toHaveLength(0);
      });

      it.each(['objectiveType', 'target', 'startMonth'] as const)('sin %s → "Completá este campo."', async (field) => {
        const body: Record<string, unknown> = veni3();
        delete body[field];

        const res = await post(body).expect(400);
        expect(res.body.message).toEqual(['Completá este campo.']);
      });

      it('mes de inicio anterior al actual → "El mes de inicio no puede ser anterior al mes actual." en startMonth', async () => {
        const res = await post({ ...veni3(), startMonth: shiftMonth(CURRENT_MONTH, -1) }).expect(400);

        expect(res.body).toMatchObject({
          statusCode: 400,
          message: 'El mes de inicio no puede ser anterior al mes actual.',
          details: [{ field: 'startMonth', message: 'El mes de inicio no puede ser anterior al mes actual.' }],
        });
        expect(await prisma.mission.count()).toBe(0);
        expect(await newAuditRows()).toHaveLength(0);
      });
    });

    describe('CA-28.6: nombre repetido', () => {
      it('" vení 3 VECES " con "Vení 3 veces" activa → 409 MISSION_NAME_IN_USE sin guardar ni auditar', async () => {
        await post(veni3()).expect(201);
        lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;

        const res = await post({ ...veni3(), name: ' vení 3 VECES ' }).expect(409);

        expect(res.body).toMatchObject({
          statusCode: 409,
          error: 'Conflict',
          code: 'MISSION_NAME_IN_USE',
          message: 'Ya existe una misión con ese nombre.',
          path: '/api/misiones',
        });
        expect(await prisma.mission.count()).toBe(1);
        expect(await newAuditRows()).toHaveLength(0);
      });

      it('el nombre de una dada de baja está libre → 201', async () => {
        await seedMission({ name: 'Vení 3 veces', status: 'DELETED' });

        await post(veni3()).expect(201);
      });

      it('dos altas con el mismo nombre a la vez → una 201 y la otra 409 MISSION_NAME_IN_USE', async () => {
        const responses = await Promise.all([post(veni3()), post(veni3())]);

        expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
        expect(responses.find((res) => res.status === 409)?.body.code).toBe('MISSION_NAME_IN_USE');
        expect(await prisma.mission.count()).toBe(1);
        expect(await newAuditRows()).toHaveLength(1);
      });
    });

    it.each([
      ['status', 'DELETED'],
      ['id', 99],
      ['createdAt', '2026-01-01T00:00:00.000Z'],
      ['updatedAt', '2026-01-01T00:00:00.000Z'],
      ['deletedAt', '2026-01-01T00:00:00.000Z'],
      ['phase', 'FINISHED'],
      ['completedCount', 5],
      ['pendingChanges', {}],
    ])('CA-28.7: %s en el body → 400 "property X should not exist"', async (field, value) => {
      const res = await post({ ...veni3(), [field]: value }).expect(400);

      expect(res.body.message).toEqual([`property ${field} should not exist`]);
      expect(await prisma.mission.count()).toBe(0);
    });

    it('rollback: si falla la auditoría no queda la misión', async () => {
      jest.spyOn(app.get(AuditService), 'record').mockRejectedValueOnce(new Error('falla la auditoría'));

      const res = await post(veni3());

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Unexpected error.');
      expect(await prisma.mission.count()).toBe(0);
    });
  });

  describe('GET /api/misiones — CA-28.1', () => {
    async function seedCustomer(documentNumber: string) {
      return await prisma.customer.create({
        data: { firstName: 'Martín', lastName: 'Gómez', documentType: 'DNI', documentNumber, email: `${documentNumber}@mail.com` },
      });
    }

    async function seedAssignment(missionId: number, customerId: number, period: string, status: 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED') {
      const at = new Date(`${period}-02T15:00:00.000Z`);
      await prisma.customerMission.create({
        data: {
          missionId,
          customerId,
          period: monthDate(period),
          objectiveType: 'CONSUMPTION_COUNT',
          target: 3,
          rewardPoints: 50,
          progress: status === 'IN_PROGRESS' ? 1 : 3,
          status,
          completedAt: status === 'COMPLETED' || status === 'CLAIMED' ? at : null,
          claimedAt: status === 'CLAIMED' ? at : null,
          claimedBy: status === 'CLAIMED' ? 'CUSTOMER' : null,
          expiredAt: status === 'EXPIRED' ? at : null,
          expirationReason: status === 'EXPIRED' ? 'Fin de mes' : null,
        },
      });
    }

    it('todas menos las dadas de baja, de la más reciente a la más antigua, con la forma de Mission', async () => {
      await seedMission({ name: 'Vieja', createdAt: new Date('2026-01-01T12:00:00.000Z') });
      await seedMission({ name: 'Nueva', createdAt: new Date('2026-03-01T12:00:00.000Z') });
      await seedMission({ name: 'Borrada', status: 'DELETED', createdAt: new Date('2026-04-01T12:00:00.000Z') });

      const res = await list().expect(200);

      expect(res.body).toMatchObject({ total: 2, page: 1, limit: 10 });
      expect(res.body.items.map((item: { name: string }) => item.name)).toEqual(['Nueva', 'Vieja']);
      expect(Object.keys(res.body.items[0])).toEqual([
        'id',
        'name',
        'description',
        'objectiveType',
        'target',
        'daysOfWeek',
        'timeFrom',
        'timeTo',
        'rewardPoints',
        'startMonth',
        'endMonth',
        'status',
        'phase',
        'pendingChanges',
        'completedCount',
        'createdAt',
        'updatedAt',
      ]);
    });

    it('order=OLDEST: de la más antigua a la más reciente; otro valor → 400', async () => {
      await seedMission({ name: 'Vieja', createdAt: new Date('2026-01-01T12:00:00.000Z') });
      await seedMission({ name: 'Nueva', createdAt: new Date('2026-03-01T12:00:00.000Z') });

      const res = await list({ order: 'OLDEST' }).expect(200);
      expect(res.body.items.map((item: { name: string }) => item.name)).toEqual(['Vieja', 'Nueva']);

      await list({ order: 'NAME' }).expect(400);
    });

    it('phase: En curso, Próximas y Finalizadas, calculada con el mes actual; otro valor → 400', async () => {
      await seedMission({ name: 'Sin fin', startMonth: shiftMonth(CURRENT_MONTH, -2) });
      await seedMission({ name: 'Termina este mes', startMonth: shiftMonth(CURRENT_MONTH, -1), endMonth: CURRENT_MONTH });
      await seedMission({ name: 'Próxima', startMonth: shiftMonth(CURRENT_MONTH, 1) });
      await seedMission({ name: 'Terminada', startMonth: shiftMonth(CURRENT_MONTH, -3), endMonth: shiftMonth(CURRENT_MONTH, -1) });

      const names = async (phase: string) =>
        ((await list({ phase, order: 'OLDEST' }).expect(200)).body.items as { name: string; phase: string }[]).map(
          (item) => `${item.name}:${item.phase}`,
        );

      expect(await names('RUNNING')).toEqual(['Sin fin:RUNNING', 'Termina este mes:RUNNING']);
      expect(await names('UPCOMING')).toEqual(['Próxima:UPCOMING']);
      expect(await names('FINISHED')).toEqual(['Terminada:FINISHED']);
      expect((await list().expect(200)).body.total).toBe(4);

      await list({ phase: 'DELETED' }).expect(400);
    });

    it('q: parte del nombre, sin mayúsculas ni tildes, y nunca trae una dada de baja', async () => {
      await seedMission({ name: 'Vení 3 veces' });
      await seedMission({ name: 'Gastá $ 20.000' });
      await seedMission({ name: 'Veni los domingos', status: 'DELETED' });

      const res = await list({ q: 'VENI' }).expect(200);
      expect(res.body.items.map((item: { name: string }) => item.name)).toEqual(['Vení 3 veces']);

      await list({ q: 'x'.repeat(81) }).expect(400);
    });

    it('paginado: limit por defecto 10, el que manda la pantalla y máximo 100', async () => {
      for (let i = 1; i <= 12; i++) {
        await seedMission({ name: `Misión ${i}`, createdAt: new Date(Date.UTC(2026, 0, i, 12)) });
      }

      const first = await list().expect(200);
      expect(first.body).toMatchObject({ total: 12, page: 1, limit: 10 });
      expect(first.body.items).toHaveLength(10);

      const second = await list({ page: 2 }).expect(200);
      expect(second.body.items.map((item: { name: string }) => item.name)).toEqual(['Misión 2', 'Misión 1']);

      const fit = await list({ limit: 7 }).expect(200);
      expect(fit.body).toMatchObject({ limit: 7 });
      expect(fit.body.items).toHaveLength(7);

      await list({ limit: 101 }).expect(400);
      await list({ page: 0 }).expect(400);
    });

    it('vacío → items [] y total 0', async () => {
      const res = await list({ q: 'nada' }).expect(200);
      expect(res.body).toEqual({ items: [], total: 0, page: 1, limit: 10 });
    });

    it('completedCount: Completadas y Reclamadas de este mes, sin las En progreso, Vencidas ni las de otro mes', async () => {
      const mission = await seedMission({ name: 'Vení 3 veces', startMonth: shiftMonth(CURRENT_MONTH, -1) });
      const other = await seedMission({ name: 'Otra' });
      const customers = await Promise.all(['30000001', '30000002', '30000003', '30000004', '30000005'].map(seedCustomer));
      await seedAssignment(mission.id, customers[0].id, CURRENT_MONTH, 'COMPLETED');
      await seedAssignment(mission.id, customers[1].id, CURRENT_MONTH, 'CLAIMED');
      await seedAssignment(mission.id, customers[2].id, CURRENT_MONTH, 'IN_PROGRESS');
      await seedAssignment(mission.id, customers[3].id, CURRENT_MONTH, 'EXPIRED');
      await seedAssignment(mission.id, customers[4].id, shiftMonth(CURRENT_MONTH, -1), 'CLAIMED');

      const res = await list().expect(200);
      const counts = Object.fromEntries(
        (res.body.items as { id: number; completedCount: number }[]).map((item) => [item.id, item.completedCount]),
      );
      expect(counts).toEqual({ [mission.id]: 2, [other.id]: 0 });
    });

    it('no audita las consultas', async () => {
      await seedMission({ name: 'Vení 3 veces' });
      await list().expect(200);
      expect(await newAuditRows()).toHaveLength(0);
    });
  });

  describe('CA-28.8: permisos', () => {
    it.each(['GET', 'POST'] as const)('%s: Cajero → 403, Cliente → 403, sin token → 401', async (method) => {
      const call = () =>
        method === 'GET'
          ? request(app.getHttpServer()).get('/api/misiones')
          : request(app.getHttpServer()).post('/api/misiones').send(veni3());

      const asCashier = await call().set(staffHeaders('CASHIER', cashier)).expect(403);
      expect(asCashier.body.code).toBe('FORBIDDEN');
      await call().set(customerHeaders).expect(403);
      await call().expect(401);

      expect(await prisma.mission.count()).toBe(0);
      // Los intentos sin permiso no se auditan (decisión D-04)
      expect(await newAuditRows()).toHaveLength(0);
    });
  });
});
