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
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}
const NEXT_MONTH = shiftMonth(CURRENT_MONTH, 1);
const capitalizedMonth = (month: string) => {
  const name = `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
  return name.charAt(0).toUpperCase() + name.slice(1);
};
const monthDate = (month: string) => new Date(`${month}-01T00:00:00.000Z`);
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

type AssignmentStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED';

// Cubre US-29 (contrato S5 §3.1.4 a §3.1.7 y la auditoría de §3.14.2) contra Postgres real. Las
// asignaciones se crean a mano: la asignación y el avance son de US-30 (decisión de Jazmín).
describe('Detalle, editar y dar de baja misiones (e2e)', () => {
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

  const customerHeaders = { 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '999', 'x-test-customer-id': '1' };

  const asAdmin = {
    get: (path: string, query: Record<string, string> = {}) =>
      request(app.getHttpServer()).get(`/api/misiones${path}`).query(query).set(staffHeaders('ADMIN', admin)),
    patch: (path: string, body?: object) => {
      const req = request(app.getHttpServer()).patch(`/api/misiones${path}`).set(staffHeaders('ADMIN', admin));
      return body ? req.send(body) : req;
    },
  };

  async function seedMission(
    data: {
      name?: string;
      startMonth?: string;
      endMonth?: string | null;
      status?: 'ACTIVE' | 'DELETED';
      rewardPoints?: number | null;
      timeFrom?: string;
      timeTo?: string;
    } = {},
  ) {
    const status = data.status ?? 'ACTIVE';
    return await prisma.mission.create({
      data: {
        name: data.name ?? 'Vení 3 veces',
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints: data.rewardPoints === undefined ? 50 : data.rewardPoints,
        timeFrom: data.timeFrom ? new Date(`1970-01-01T${data.timeFrom}:00.000Z`) : null,
        timeTo: data.timeTo ? new Date(`1970-01-01T${data.timeTo}:00.000Z`) : null,
        startMonth: monthDate(data.startMonth ?? shiftMonth(CURRENT_MONTH, -1)),
        endMonth: data.endMonth ? monthDate(data.endMonth) : null,
        status,
        deletedAt: status === 'DELETED' ? new Date() : null,
      },
    });
  }

  let documentSeq = 30000000;
  async function seedCustomer(firstName = 'Martín', lastName = 'Gómez') {
    documentSeq += 1;
    return await prisma.customer.create({
      data: { firstName, lastName, documentType: 'DNI', documentNumber: String(documentSeq), email: `${documentSeq}@mail.com` },
    });
  }

  // Una asignación hecha a mano en el estado pedido, con el snapshot de la misión de 3 consumos
  async function seedAssignment(options: {
    missionId: number;
    customerId: number;
    period?: string;
    status: AssignmentStatus;
    rewardPoints?: number | null;
    completedAt?: Date;
    claimedBy?: 'CUSTOMER' | 'SYSTEM';
  }) {
    const { status } = options;
    const at = options.completedAt ?? minutesAgo(30);
    return await prisma.customerMission.create({
      data: {
        missionId: options.missionId,
        customerId: options.customerId,
        period: monthDate(options.period ?? CURRENT_MONTH),
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints: options.rewardPoints === undefined ? 50 : options.rewardPoints,
        progress: status === 'IN_PROGRESS' ? 1 : 3,
        status,
        completedAt: status === 'COMPLETED' || status === 'CLAIMED' ? at : null,
        claimedAt: status === 'CLAIMED' ? at : null,
        claimedBy: status === 'CLAIMED' ? (options.claimedBy ?? 'CUSTOMER') : null,
        expiredAt: status === 'EXPIRED' ? at : null,
        expirationReason: status === 'EXPIRED' ? 'Fin de mes' : null,
      },
    });
  }

  describe('GET /api/misiones/:id — CA-29.0', () => {
    it('devuelve el Mission completo con las completadas de este mes', async () => {
      const mission = await seedMission({ timeFrom: '09:00', timeTo: '13:00' });
      const [a, b] = [await seedCustomer(), await seedCustomer()];
      await seedAssignment({ missionId: mission.id, customerId: a.id, status: 'COMPLETED' });
      await seedAssignment({ missionId: mission.id, customerId: b.id, status: 'IN_PROGRESS' });

      const res = await asAdmin.get(`/${mission.id}`).expect(200);

      expect(res.body).toEqual({
        id: mission.id,
        name: 'Vení 3 veces',
        description: null,
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        daysOfWeek: null,
        timeFrom: '09:00',
        timeTo: '13:00',
        rewardPoints: 50,
        startMonth: shiftMonth(CURRENT_MONTH, -1),
        endMonth: null,
        status: 'ACTIVE',
        phase: 'RUNNING',
        pendingChanges: null,
        completedCount: 1,
        createdAt: expect.stringMatching(ISO_INSTANT),
        updatedAt: expect.stringMatching(ISO_INSTANT),
      });
    });

    it('CA-29.6: dada de baja o inexistente → 404 "No existe la misión." sin code', async () => {
      const deleted = await seedMission({ status: 'DELETED' });

      for (const id of [deleted.id, 999999]) {
        const res = await asAdmin.get(`/${id}`).expect(404);
        expect(res.body).toMatchObject({ statusCode: 404, message: 'No existe la misión.' });
        expect(res.body.code).toBeUndefined();
      }
    });

    it('id que no es número → 400', async () => {
      await asAdmin.get('/abc').expect(400);
    });
  });

  describe('GET /api/misiones/:id/completadas — CA-29.0', () => {
    it('Completadas y Reclamadas del mes actual, por completedAt descendente, con la forma de §3.1.7', async () => {
      const mission = await seedMission();
      const first = await seedCustomer('Ana', 'López');
      const second = await seedCustomer('Bruno', 'Díaz');
      const third = await seedCustomer('Carla', 'Ruiz');
      const other = await seedCustomer('Dario', 'Paz');
      const older = await seedAssignment({ missionId: mission.id, customerId: first.id, status: 'COMPLETED', completedAt: minutesAgo(90) });
      const claimed = await seedAssignment({
        missionId: mission.id,
        customerId: second.id,
        status: 'CLAIMED',
        claimedBy: 'SYSTEM',
        completedAt: minutesAgo(10),
      });
      // No aparecen: En progreso, Vencida y la de otro mes
      await seedAssignment({ missionId: mission.id, customerId: third.id, status: 'IN_PROGRESS' });
      await seedAssignment({ missionId: mission.id, customerId: other.id, status: 'EXPIRED' });
      await seedAssignment({ missionId: mission.id, customerId: first.id, status: 'CLAIMED', period: shiftMonth(CURRENT_MONTH, -1) });

      const res = await asAdmin.get(`/${mission.id}/completadas`).expect(200);

      expect(res.body).toEqual([
        {
          customerMissionId: claimed.id,
          customer: { id: second.id, firstName: 'Bruno', lastName: 'Díaz', documentType: 'DNI', documentNumber: second.documentNumber },
          status: 'CLAIMED',
          completedAt: claimed.completedAt?.toISOString(),
          claimedAt: claimed.claimedAt?.toISOString(),
          claimedBy: 'SYSTEM',
          rewardPoints: 50,
        },
        {
          customerMissionId: older.id,
          customer: { id: first.id, firstName: 'Ana', lastName: 'López', documentType: 'DNI', documentNumber: first.documentNumber },
          status: 'COMPLETED',
          completedAt: older.completedAt?.toISOString(),
          claimedAt: null,
          claimedBy: null,
          rewardPoints: 50,
        },
      ]);
    });

    it('rewardPoints es el snapshot de la asignación: null si era sin recompensa', async () => {
      const mission = await seedMission();
      const customer = await seedCustomer();
      await seedAssignment({ missionId: mission.id, customerId: customer.id, status: 'COMPLETED', rewardPoints: null });

      const res = await asAdmin.get(`/${mission.id}/completadas`).expect(200);
      expect(res.body[0].rewardPoints).toBeNull();
    });

    it('period: el del mes anterior trae ese mes; los 11 anteriores valen', async () => {
      const mission = await seedMission();
      const customer = await seedCustomer();
      const previous = shiftMonth(CURRENT_MONTH, -1);
      await seedAssignment({ missionId: mission.id, customerId: customer.id, status: 'CLAIMED', period: previous, completedAt: monthDate(previous) });

      expect((await asAdmin.get(`/${mission.id}/completadas`, { period: previous }).expect(200)).body).toHaveLength(1);
      expect((await asAdmin.get(`/${mission.id}/completadas`).expect(200)).body).toEqual([]);
      await asAdmin.get(`/${mission.id}/completadas`, { period: shiftMonth(CURRENT_MONTH, -11) }).expect(200);
    });

    it.each([
      ['futuro', shiftMonth(CURRENT_MONTH, 1)],
      ['de hace 12 meses', shiftMonth(CURRENT_MONTH, -12)],
      ['mal escrito', '2026-1'],
    ])('mes %s → 400 "Elegí un mes de los últimos 12."', async (_case, period) => {
      const mission = await seedMission();

      const res = await asAdmin.get(`/${mission.id}/completadas`, { period }).expect(400);
      expect(res.body).toMatchObject({
        message: 'Elegí un mes de los últimos 12.',
        details: [{ field: 'period', message: 'Elegí un mes de los últimos 12.' }],
      });
    });

    it('CA-29.6: misión dada de baja → 404; otro query param → 400', async () => {
      const deleted = await seedMission({ status: 'DELETED' });
      const res = await asAdmin.get(`/${deleted.id}/completadas`).expect(404);
      expect(res.body.message).toBe('No existe la misión.');

      const mission = await seedMission({ name: 'Otra' });
      await asAdmin.get(`/${mission.id}/completadas`, { month: CURRENT_MONTH }).expect(400);
    });

    it('no asigna nada ni audita', async () => {
      const mission = await seedMission();
      await asAdmin.get(`/${mission.id}/completadas`).expect(200);
      await asAdmin.get(`/${mission.id}`).expect(200);

      expect(await prisma.customerMission.count()).toBe(0);
      expect(await newAuditRows()).toHaveLength(0);
    });
  });

  describe('PATCH /api/misiones/:id', () => {
    it('sin ningún campo → 400 "Modificá al menos un dato."', async () => {
      const mission = await seedMission();
      const res = await asAdmin.patch(`/${mission.id}`, {}).expect(400);
      expect(res.body.message).toBe('Modificá al menos un dato.');
    });

    it('CA-29.1: sin clientes este mes, todo rige ya → appliesFrom null y MISSION_UPDATED con una fila por campo', async () => {
      const mission = await seedMission();
      // Una asignación del mes pasado no cuenta: rige ya
      const customer = await seedCustomer();
      await seedAssignment({ missionId: mission.id, customerId: customer.id, status: 'CLAIMED', period: shiftMonth(CURRENT_MONTH, -1) });

      const res = await asAdmin
        .patch(`/${mission.id}`, { name: 'Vení 5 veces', target: 5, daysOfWeek: [7], rewardPoints: null })
        .expect(200);

      expect(res.body.appliesFrom).toBeNull();
      expect(res.body.mission).toMatchObject({
        id: mission.id,
        name: 'Vení 5 veces',
        target: 5,
        daysOfWeek: [7],
        rewardPoints: null,
        pendingChanges: null,
        completedCount: 0,
      });
      const saved = await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } });
      expect(saved.target.toNumber()).toBe(5);
      expect(saved.pendingChanges).toBeNull();

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: admin.account.id,
        performedBy: 'Valeria Vitto',
        module: 'MISSIONS',
        actionCode: 'MISSION_UPDATED',
        description: 'Editó la misión "Vení 5 veces"',
        affectedCustomerId: null,
        operationCode: null,
        details: [
          { label: 'Nombre', value: 'Vení 3 veces → Vení 5 veces' },
          { label: 'Objetivo', value: '3 consumos → 5 consumos' },
          { label: 'Condición', value: 'Todos los días → los domingos' },
          { label: 'Recompensa', value: '50 pts → Sin recompensa' },
        ],
      });
    });

    it('CA-29.2: con clientes este mes, el objetivo rige desde el mes siguiente y el snapshot del mes no cambia', async () => {
      const mission = await seedMission();
      const customer = await seedCustomer();
      const assignment = await seedAssignment({ missionId: mission.id, customerId: customer.id, status: 'IN_PROGRESS' });

      const res = await asAdmin.patch(`/${mission.id}`, { target: 5, rewardPoints: 80, description: 'Ahora son 5.' }).expect(200);

      expect(res.body.appliesFrom).toBe(NEXT_MONTH);
      expect(res.body.mission).toMatchObject({
        target: 3,
        rewardPoints: 50,
        description: 'Ahora son 5.',
        pendingChanges: {
          appliesFrom: NEXT_MONTH,
          objectiveType: 'CONSUMPTION_COUNT',
          target: 5,
          daysOfWeek: null,
          timeFrom: null,
          timeTo: null,
          rewardPoints: 80,
        },
      });
      const snapshot = await prisma.customerMission.findUniqueOrThrow({ where: { id: assignment.id } });
      expect([snapshot.target.toNumber(), snapshot.rewardPoints, snapshot.status]).toEqual([3, 50, 'IN_PROGRESS']);

      // El detalle muestra los pendientes
      const detail = await asAdmin.get(`/${mission.id}`).expect(200);
      expect(detail.body.pendingChanges).toMatchObject({ target: 5, rewardPoints: 80 });

      const [row] = await newAuditRows();
      expect(row.details).toEqual([
        { label: 'Descripción', value: '— → Ahora son 5.' },
        { label: 'Objetivo', value: '3 consumos → 5 consumos' },
        { label: 'Recompensa', value: '50 pts → 80 pts' },
        { label: 'Rige desde', value: capitalizedMonth(NEXT_MONTH) },
      ]);
    });

    it('una segunda edición se combina con la pendiente', async () => {
      const mission = await seedMission();
      const customer = await seedCustomer();
      await seedAssignment({ missionId: mission.id, customerId: customer.id, status: 'COMPLETED' });
      await asAdmin.patch(`/${mission.id}`, { target: 5 }).expect(200);

      const res = await asAdmin.patch(`/${mission.id}`, { rewardPoints: 80 }).expect(200);

      expect(res.body.mission.pendingChanges).toMatchObject({ target: 5, rewardPoints: 80 });
      const rows = await newAuditRows();
      expect(rows[1].details).toEqual([
        { label: 'Recompensa', value: '50 pts → 80 pts' },
        { label: 'Rige desde', value: capitalizedMonth(NEXT_MONTH) },
      ]);
    });

    it('sin cambios → 200, no guarda ni audita', async () => {
      const mission = await seedMission();

      const res = await asAdmin.patch(`/${mission.id}`, { name: 'Vení 3 veces', target: 3 }).expect(200);

      expect(res.body.appliesFrom).toBeNull();
      const saved = await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } });
      expect(saved.updatedAt).toEqual(mission.updatedAt);
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('CA-29.3: mes de inicio de una que ya empezó → 400 en startMonth; de una próxima, se cambia', async () => {
      const started = await seedMission();
      const res = await asAdmin.patch(`/${started.id}`, { startMonth: NEXT_MONTH }).expect(400);
      expect(res.body).toMatchObject({
        message: 'La misión ya empezó: no se puede cambiar el mes de inicio.',
        details: [{ field: 'startMonth', message: 'La misión ya empezó: no se puede cambiar el mes de inicio.' }],
      });

      const upcoming = await seedMission({ name: 'Próxima', startMonth: shiftMonth(CURRENT_MONTH, 2) });
      const ok = await asAdmin.patch(`/${upcoming.id}`, { startMonth: NEXT_MONTH }).expect(200);
      expect(ok.body.mission).toMatchObject({ startMonth: NEXT_MONTH, phase: 'UPCOMING' });
      const [row] = await newAuditRows();
      expect(row.details).toEqual([
        {
          label: 'Vigencia',
          value: `Desde ${capitalizedMonth(shiftMonth(CURRENT_MONTH, 2)).toLowerCase()} → Desde ${capitalizedMonth(NEXT_MONTH).toLowerCase()}`,
        },
      ]);
    });

    it.each([
      ['mes de fin anterior al actual', { endMonth: shiftMonth(CURRENT_MONTH, -1) }, 'El mes de fin no puede ser anterior al mes actual.'],
      ['una sola hora', { timeFrom: '09:00' }, 'Completá las dos horas o ninguna.'],
      ['objetivo mayor al máximo del tipo guardado', { target: 150 }, 'El objetivo máximo es 100.'],
    ])('%s → 400 con el mensaje, sin guardar ni auditar', async (_case, body, message) => {
      const mission = await seedMission();

      const res = await asAdmin.patch(`/${mission.id}`, body).expect(400);

      expect(res.body.message).toBe(message);
      const saved = await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } });
      expect(saved.updatedAt).toEqual(mission.updatedAt);
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('cambiar solo la hora de fin de un horario guardado vale; quitarlo con las dos en null', async () => {
      const mission = await seedMission({ timeFrom: '09:00', timeTo: '13:00' });

      const res = await asAdmin.patch(`/${mission.id}`, { timeTo: '14:00' }).expect(200);
      expect(res.body.mission).toMatchObject({ timeFrom: '09:00', timeTo: '14:00' });

      const cleared = await asAdmin.patch(`/${mission.id}`, { timeFrom: null, timeTo: null }).expect(200);
      expect(cleared.body.mission).toMatchObject({ timeFrom: null, timeTo: null });
    });

    it('validaciones del DTO: mismos mensajes que crear', async () => {
      const mission = await seedMission();
      const res = await asAdmin.patch(`/${mission.id}`, { name: '  ' }).expect(400);
      expect(res.body.message).toEqual(['El nombre es obligatorio.']);
    });

    it('nombre de otra misión activa → 409 MISSION_NAME_IN_USE; cambiar mayúsculas del propio vale', async () => {
      const mission = await seedMission();
      await seedMission({ name: 'Gastá $ 20.000' });

      const res = await asAdmin.patch(`/${mission.id}`, { name: ' gastá $ 20.000 ' }).expect(409);
      expect(res.body).toMatchObject({ code: 'MISSION_NAME_IN_USE', message: 'Ya existe una misión con ese nombre.' });

      const ok = await asAdmin.patch(`/${mission.id}`, { name: 'VENÍ 3 VECES' }).expect(200);
      expect(ok.body.mission.name).toBe('VENÍ 3 VECES');
    });

    it.each([
      ['status', 'DELETED'],
      ['id', 99],
      ['pendingChanges', {}],
    ])('%s en el body → 400 "property X should not exist"', async (field, value) => {
      const mission = await seedMission();
      const res = await asAdmin.patch(`/${mission.id}`, { [field]: value }).expect(400);
      expect(res.body.message).toEqual([`property ${field} should not exist`]);
    });

    it('CA-29.6: dada de baja o inexistente → 404', async () => {
      const deleted = await seedMission({ status: 'DELETED' });
      for (const id of [deleted.id, 999999]) {
        const res = await asAdmin.patch(`/${id}`, { name: 'Otra' }).expect(404);
        expect(res.body.message).toBe('No existe la misión.');
      }
    });

    it('rollback: si falla la auditoría, la misión queda como estaba', async () => {
      const mission = await seedMission();
      jest.spyOn(app.get(AuditService), 'record').mockRejectedValueOnce(new Error('falla la auditoría'));

      const res = await asAdmin.patch(`/${mission.id}`, { target: 5 });

      expect(res.status).toBe(500);
      const saved = await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } });
      expect(saved.target.toNumber()).toBe(3);
    });
  });

  describe('PATCH /api/misiones/:id/eliminar — CA-29.4', () => {
    it('En progreso del mes → Vencida; Completada con recompensa → Reclamada (Sistema); { expired, claimed }', async () => {
      // El reclamo automático acredita puntos: hace falta la configuración vigente
      await prisma.loyaltyProgramConfiguration.create({
        data: { version: 1, baseAmount: 1000, pointsAwarded: 10, silverMinPoints: 300, goldMinPoints: 800, isActive: true },
      });
      const mission = await seedMission();
      const customers = await Promise.all([1, 2, 3, 4, 5, 6].map(() => seedCustomer()));
      const inProgress = await Promise.all(
        customers.slice(0, 2).map((customer) => seedAssignment({ missionId: mission.id, customerId: customer.id, status: 'IN_PROGRESS' })),
      );
      const completedWithReward = await seedAssignment({ missionId: mission.id, customerId: customers[2].id, status: 'COMPLETED' });
      const completedWithoutReward = await seedAssignment({
        missionId: mission.id,
        customerId: customers[3].id,
        status: 'COMPLETED',
        rewardPoints: null,
      });
      const claimed = await seedAssignment({ missionId: mission.id, customerId: customers[4].id, status: 'CLAIMED' });
      // Del mes pasado: no se toca
      const previous = await seedAssignment({
        missionId: mission.id,
        customerId: customers[5].id,
        status: 'IN_PROGRESS',
        period: shiftMonth(CURRENT_MONTH, -1),
      });

      const res = await asAdmin.patch(`/${mission.id}/eliminar`).expect(200);

      expect(res.body).toEqual({ expired: 2, claimed: 1 });
      for (const { id } of inProgress) {
        const expired = await prisma.customerMission.findUniqueOrThrow({ where: { id } });
        expect(expired).toMatchObject({ status: 'EXPIRED', expirationReason: 'Misión dada de baja' });
        expect(expired.expiredAt).toBeInstanceOf(Date);
      }
      const statuses = await prisma.customerMission.findMany({
        where: { id: { in: [completedWithReward.id, completedWithoutReward.id, claimed.id, previous.id] } },
        orderBy: { id: 'asc' },
      });
      // S5-5: la Completada con recompensa se reclama sola (Sistema); la sin recompensa queda Completada
      expect(statuses.map((item) => item.status)).toEqual(['CLAIMED', 'COMPLETED', 'CLAIMED', 'IN_PROGRESS']);
      expect(statuses[0].claimedBy).toBe('SYSTEM');
      const movements = await prisma.pointsMovement.findMany({ where: { type: 'MISSION_REWARD' } });
      expect(movements.map((movement) => [movement.customerId, movement.points, movement.customerMissionId])).toEqual([
        [customers[2].id, 50, completedWithReward.id],
      ]);

      const saved = await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } });
      expect(saved.status).toBe('DELETED');
      expect(saved.deletedAt).toBeInstanceOf(Date);

      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual(['MISSION_REWARD_CLAIMED', 'MISSION_DELETED']);
      expect(rows[0]).toMatchObject({
        actorType: 'SYSTEM',
        affectedCustomerId: customers[2].id,
        details: expect.arrayContaining([{ label: 'Reclamada por', value: 'Automático' }]),
      });
      expect(rows[1]).toMatchObject({
        actorType: 'EMPLOYEE',
        actorAccountId: admin.account.id,
        module: 'MISSIONS',
        actionCode: 'MISSION_DELETED',
        description: 'Dio de baja la misión "Vení 3 veces"',
        affectedCustomerId: null,
        details: [
          { label: 'Vencidas', value: '2' },
          { label: 'Reclamadas automáticamente', value: '1' },
        ],
      });
    });

    it('sin asignaciones → { expired: 0, claimed: 0 } y MISSION_DELETED sin filas', async () => {
      const mission = await seedMission();

      const res = await asAdmin.patch(`/${mission.id}/eliminar`).expect(200);

      expect(res.body).toEqual({ expired: 0, claimed: 0 });
      const [row] = await newAuditRows();
      expect(row.details).toEqual([]);
    });

    it('CA-29.6: después, 404 en GET, PATCH y eliminar otra vez; y el nombre queda libre', async () => {
      const mission = await seedMission();
      await asAdmin.patch(`/${mission.id}/eliminar`).expect(200);

      await asAdmin.get(`/${mission.id}`).expect(404);
      await asAdmin.patch(`/${mission.id}`, { name: 'Otra' }).expect(404);
      const again = await asAdmin.patch(`/${mission.id}/eliminar`).expect(404);
      expect(again.body.message).toBe('No existe la misión.');

      await request(app.getHttpServer())
        .post('/api/misiones')
        .set(staffHeaders('ADMIN', admin))
        .send({ name: 'Vení 3 veces', objectiveType: 'CONSUMPTION_COUNT', target: 3, startMonth: CURRENT_MONTH })
        .expect(201);
    });

    it('rollback: si falla la auditoría, ni la misión ni las asignaciones cambian', async () => {
      const mission = await seedMission();
      const customer = await seedCustomer();
      const assignment = await seedAssignment({ missionId: mission.id, customerId: customer.id, status: 'IN_PROGRESS' });
      jest.spyOn(app.get(AuditService), 'record').mockRejectedValueOnce(new Error('falla la auditoría'));

      const res = await asAdmin.patch(`/${mission.id}/eliminar`);

      expect(res.status).toBe(500);
      expect((await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).status).toBe('ACTIVE');
      expect((await prisma.customerMission.findUniqueOrThrow({ where: { id: assignment.id } })).status).toBe('IN_PROGRESS');
    });
  });

  describe('CA-29.7: permisos', () => {
    it.each([
      ['GET', '/:id'],
      ['GET', '/:id/completadas'],
      ['PATCH', '/:id'],
      ['PATCH', '/:id/eliminar'],
    ] as const)('%s %s: Cajero → 403, Cliente → 403, sin token → 401', async (method, template) => {
      const mission = await seedMission();
      const path = `/api/misiones${template.replace(':id', String(mission.id))}`;
      const call = () =>
        method === 'GET'
          ? request(app.getHttpServer()).get(path)
          : request(app.getHttpServer()).patch(path).send(template === '/:id' ? { name: 'Otra' } : {});

      const asCashier = await call().set(staffHeaders('CASHIER', cashier)).expect(403);
      expect(asCashier.body.code).toBe('FORBIDDEN');
      await call().set(customerHeaders).expect(403);
      await call().expect(401);

      const saved = await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } });
      expect([saved.name, saved.status]).toEqual(['Vení 3 veces', 'ACTIVE']);
      expect(await newAuditRows()).toHaveLength(0);
    });
  });
});
