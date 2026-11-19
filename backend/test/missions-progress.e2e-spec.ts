import { INestApplication, ValidationPipe } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AuditService } from '../src/audit/application/audit.service.js';
import type { AuditEntryInput } from '../src/audit/domain/audit-entry.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { MISSION_COMPLETED } from '../src/shared/events/domain-events.js';
import { toArgentinaDateString, toArgentinaWeekdayAndTime } from '../src/shared/time/argentina-date.js';
import { deleteNotifications } from './delete-notifications.js';
import { deletePointsMovements } from './delete-points-movements.js';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

// El mes actual en Argentina y los de alrededor, YYYY-MM
const CURRENT_MONTH = toArgentinaDateString(new Date()).slice(0, 7);
function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}
const monthDate = (month: string) => new Date(`${month}-01T00:00:00.000Z`);
const CURRENT_MONTH_TEXT = `${MONTH_NAMES[Number(CURRENT_MONTH.slice(5, 7)) - 1]} ${CURRENT_MONTH.slice(0, 4)}`;

// La condición se arma con el momento en que corre el test (hora de Argentina): el consumo se registra
// "ahora". Las franjas evitan los bordes: [00:00, 23:59) contiene casi todo el día y la otra mitad del día
// no contiene la hora actual.
const NOW_IN_ARGENTINA = toArgentinaWeekdayAndTime(new Date());
const TODAY = NOW_IN_ARGENTINA.weekday;
const ANOTHER_DAY = (TODAY % 7) + 1;
const MATCHING_RANGE = { timeFrom: '00:00', timeTo: '23:59' };
const OTHER_RANGE = NOW_IN_ARGENTINA.time < '12:00' ? { timeFrom: '12:00', timeTo: '23:59' } : { timeFrom: '00:00', timeTo: '11:59' };

const toTimeDate = (time: string) => new Date(`1970-01-01T${time}:00.000Z`);

type AssignmentStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED';

// Cubre US-30 (contrato S5 §3.2, S5-19 a S5-21 y MISSION_COMPLETED de §3.14.2) contra Postgres real, a
// través de POST /consumos y PATCH /consumos/:code/anular.
describe('Progreso y cumplimiento de misiones (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lastAuditId = 0;
  let admin: { employee: { id: number }; account: { id: number } };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    const issuer = moduleFixture.get(AccessTokenIssuer, { strict: false });
    app.use(async (req: Request, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-auth-role') as AuthRole | undefined;
      if (role) {
        const token = await issuer.issue({
          accountId: Number(req.header('x-test-account-id') ?? 1),
          role,
          ...(req.header('x-test-employee-id') ? { employeeId: Number(req.header('x-test-employee-id')) } : {}),
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
    const employee = await prisma.employee.create({
      data: { firstName: 'Valeria', lastName: 'Vitto', phone: '3510000000', email: 'admin@vitto.club', role: 'ADMIN', isActive: true },
    });
    const account = await prisma.account.create({
      data: { email: 'admin@vitto.club', passwordHash: 'hashed:secreta123', role: 'ADMIN', isActive: true, employeeId: employee.id },
    });
    admin = { employee, account };
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

  const headers = () => ({
    'x-test-auth-role': 'ADMIN',
    'x-test-account-id': String(admin.account.id),
    'x-test-employee-id': String(admin.employee.id),
  });

  const registerConsumption = (customerId: number, amount: number) =>
    request(app.getHttpServer()).post('/api/consumos').set(headers()).send({ customerId, amount });

  const voidConsumption = (code: string) =>
    request(app.getHttpServer()).patch(`/api/consumos/${code}/anular`).set(headers()).send({ reason: 'Error de carga' });

  let documentSeq = 40000000;
  async function seedCustomer(active = true) {
    documentSeq += 1;
    return await prisma.customer.create({
      data: {
        firstName: 'Carolina',
        lastName: 'Fernández',
        documentType: 'DNI',
        documentNumber: String(documentSeq),
        email: `${documentSeq}@mail.com`,
        isActive: active,
      },
    });
  }

  async function seedMission(
    data: {
      name?: string;
      objectiveType?: 'CONSUMPTION_COUNT' | 'CONSUMPTION_AMOUNT';
      target?: number;
      rewardPoints?: number | null;
      daysOfWeek?: number[];
      timeFrom?: string;
      timeTo?: string;
      startMonth?: string;
      endMonth?: string | null;
      status?: 'ACTIVE' | 'DELETED';
      pendingChanges?: object;
    } = {},
  ) {
    const status = data.status ?? 'ACTIVE';
    return await prisma.mission.create({
      data: {
        name: data.name ?? 'Vení 2 veces',
        objectiveType: data.objectiveType ?? 'CONSUMPTION_COUNT',
        target: data.target ?? 2,
        rewardPoints: data.rewardPoints === undefined ? 50 : data.rewardPoints,
        daysOfWeek: data.daysOfWeek ?? [],
        timeFrom: data.timeFrom ? toTimeDate(data.timeFrom) : null,
        timeTo: data.timeTo ? toTimeDate(data.timeTo) : null,
        startMonth: monthDate(data.startMonth ?? CURRENT_MONTH),
        endMonth: data.endMonth ? monthDate(data.endMonth) : null,
        status,
        deletedAt: status === 'DELETED' ? new Date() : null,
        ...(data.pendingChanges ? { pendingChanges: data.pendingChanges } : {}),
      },
    });
  }

  async function seedAssignment(missionId: number, customerId: number, status: AssignmentStatus, progress = 1) {
    const at = new Date();
    return await prisma.customerMission.create({
      data: {
        missionId,
        customerId,
        period: monthDate(CURRENT_MONTH),
        objectiveType: 'CONSUMPTION_COUNT',
        target: 2,
        rewardPoints: 50,
        progress: status === 'IN_PROGRESS' ? progress : 2,
        status,
        completedAt: status === 'COMPLETED' || status === 'CLAIMED' ? at : null,
        claimedAt: status === 'CLAIMED' ? at : null,
        claimedBy: status === 'CLAIMED' ? 'CUSTOMER' : null,
        expiredAt: status === 'EXPIRED' ? at : null,
        expirationReason: status === 'EXPIRED' ? 'Fin de mes' : null,
      },
    });
  }

  const assignmentOf = (missionId: number, customerId: number) =>
    prisma.customerMission.findFirstOrThrow({ where: { missionId, customerId, period: monthDate(CURRENT_MONTH) } });

  describe('CA-30.1: asignar', () => {
    it('el primer consumo del mes asigna En progreso las misiones en curso, con el snapshot', async () => {
      const customer = await seedCustomer();
      const running = await seedMission({ name: 'En curso', daysOfWeek: [TODAY], ...MATCHING_RANGE, rewardPoints: null, target: 5 });
      await seedMission({ name: 'Próxima', startMonth: shiftMonth(CURRENT_MONTH, 1) });
      await seedMission({ name: 'Terminada', startMonth: shiftMonth(CURRENT_MONTH, -3), endMonth: shiftMonth(CURRENT_MONTH, -1) });
      await seedMission({ name: 'Borrada', status: 'DELETED' });

      await registerConsumption(customer.id, 1000).expect(201);

      const assignments = await prisma.customerMission.findMany({ where: { customerId: customer.id } });
      expect(assignments).toHaveLength(1);
      const [assignment] = assignments;
      expect(assignment).toMatchObject({
        missionId: running.id,
        objectiveType: 'CONSUMPTION_COUNT',
        daysOfWeek: [TODAY],
        rewardPoints: null,
        status: 'IN_PROGRESS',
        completedAt: null,
      });
      expect(assignment.period.toISOString().slice(0, 10)).toBe(`${CURRENT_MONTH}-01`);
      expect(assignment.target.toNumber()).toBe(5);
      expect(assignment.progress.toNumber()).toBe(1);
      expect([assignment.timeFrom?.toISOString().slice(11, 16), assignment.timeTo?.toISOString().slice(11, 16)]).toEqual([
        MATCHING_RANGE.timeFrom,
        MATCHING_RANGE.timeTo,
      ]);
    });

    it('una misión creada a mitad de mes se asigna en el consumo siguiente, sin duplicar las que ya tiene', async () => {
      const customer = await seedCustomer();
      const first = await seedMission({ name: 'Primera', target: 10 });
      await registerConsumption(customer.id, 1000).expect(201);
      const second = await seedMission({ name: 'Segunda', target: 10 });

      await registerConsumption(customer.id, 1000).expect(201);

      expect((await assignmentOf(first.id, customer.id)).progress.toNumber()).toBe(2);
      expect((await assignmentOf(second.id, customer.id)).progress.toNumber()).toBe(1);
      expect(await prisma.customerMission.count()).toBe(2);
    });

    it('con una edición pendiente que ya rige este mes, el snapshot toma la pendiente', async () => {
      const customer = await seedCustomer();
      const mission = await seedMission({
        target: 2,
        rewardPoints: 50,
        startMonth: shiftMonth(CURRENT_MONTH, -1),
        pendingChanges: {
          appliesFrom: CURRENT_MONTH,
          objectiveType: 'CONSUMPTION_COUNT',
          target: 4,
          daysOfWeek: null,
          timeFrom: null,
          timeTo: null,
          rewardPoints: 80,
        },
      });

      await registerConsumption(customer.id, 1000).expect(201);

      const assignment = await assignmentOf(mission.id, customer.id);
      expect([assignment.target.toNumber(), assignment.rewardPoints]).toEqual([4, 80]);
    });

    it('sin misiones en curso → completedMissions [] y no asigna nada', async () => {
      const customer = await seedCustomer();
      const res = await registerConsumption(customer.id, 1000).expect(201);

      expect(res.body.completedMissions).toEqual([]);
      expect(await prisma.customerMission.count()).toBe(0);
    });
  });

  describe('CA-30.2: sumar', () => {
    it('cantidad suma 1 y monto suma el monto', async () => {
      const customer = await seedCustomer();
      const count = await seedMission({ name: 'Cantidad', target: 5 });
      const amount = await seedMission({ name: 'Monto', objectiveType: 'CONSUMPTION_AMOUNT', target: 20000 });

      await registerConsumption(customer.id, 1550.5).expect(201);

      expect((await assignmentOf(count.id, customer.id)).progress.toNumber()).toBe(1);
      expect((await assignmentOf(amount.id, customer.id)).progress.toNumber()).toBe(1550.5);
    });

    it('fuera del día o de la franja (hora de Argentina) se asigna pero no suma', async () => {
      const customer = await seedCustomer();
      const otherDay = await seedMission({ name: 'Otro día', daysOfWeek: [ANOTHER_DAY] });
      const otherRange = await seedMission({ name: 'Otra franja', ...OTHER_RANGE });
      const matching = await seedMission({ name: 'Hoy', daysOfWeek: [TODAY], ...MATCHING_RANGE, target: 5 });

      await registerConsumption(customer.id, 1000).expect(201);

      expect((await assignmentOf(otherDay.id, customer.id)).progress.toNumber()).toBe(0);
      expect((await assignmentOf(otherRange.id, customer.id)).progress.toNumber()).toBe(0);
      expect((await assignmentOf(matching.id, customer.id)).progress.toNumber()).toBe(1);
    });
  });

  describe('CA-30.3 y CA-30.7: completar', () => {
    it('al llegar al objetivo: Completada, completedAt, MISSION_COMPLETED (Sistema) y completedMissions', async () => {
      const customer = await seedCustomer();
      const mission = await seedMission({ name: 'Vení 2 veces', target: 2, rewardPoints: 50 });

      const first = await registerConsumption(customer.id, 1000).expect(201);
      expect(first.body.completedMissions).toEqual([]);
      const second = await registerConsumption(customer.id, 1000).expect(201);

      const assignment = await assignmentOf(mission.id, customer.id);
      expect(assignment.status).toBe('COMPLETED');
      expect(assignment.progress.toNumber()).toBe(2);
      expect(assignment.completedAt?.toISOString()).toBe(second.body.consumption.createdAt);
      expect(second.body.completedMissions).toEqual([{ id: assignment.id, name: 'Vení 2 veces', rewardPoints: 50 }]);

      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual([
        'CONSUMPTION_REGISTERED',
        'CONSUMPTION_REGISTERED',
        'MISSION_COMPLETED',
      ]);
      expect(rows[2]).toMatchObject({
        actorType: 'SYSTEM',
        actorAccountId: null,
        module: 'MISSIONS',
        description: `Completó la misión "Vení 2 veces" de Carolina Fernández`,
        affectedCustomerId: customer.id,
        details: [
          { label: 'Misión', value: 'Vení 2 veces' },
          { label: 'Objetivo', value: '2 consumos' },
          { label: 'Período', value: CURRENT_MONTH_TEXT },
        ],
      });
    });

    it('el progreso no pasa el objetivo', async () => {
      const customer = await seedCustomer();
      const mission = await seedMission({ name: 'Gastá $ 1.000', objectiveType: 'CONSUMPTION_AMOUNT', target: 1000 });

      const res = await registerConsumption(customer.id, 1500).expect(201);

      const assignment = await assignmentOf(mission.id, customer.id);
      expect([assignment.status, assignment.progress.toNumber()]).toEqual(['COMPLETED', 1000]);
      expect(res.body.completedMissions).toHaveLength(1);
      const [, row] = await newAuditRows();
      expect(row.details).toEqual(expect.arrayContaining([{ label: 'Objetivo', value: '$ 1.000 en consumos' }]));
    });

    it('mission.completed se publica después del commit, con la asignación ya guardada', async () => {
      const customer = await seedCustomer();
      const mission = await seedMission({ name: 'Una vez', target: 1 });
      const emitter = app.get(EventEmitter2);
      const original = emitter.emitAsync.bind(emitter);
      const seen: { status: string | undefined; payload: unknown }[] = [];
      jest.spyOn(emitter, 'emitAsync').mockImplementation(async (event, ...args) => {
        if (event === MISSION_COMPLETED) {
          // Fuera de la transacción: si se publicara antes del commit, no se vería Completada
          const stored = await prisma.customerMission.findFirst({ where: { missionId: mission.id, customerId: customer.id } });
          seen.push({ status: stored?.status, payload: args[0] });
          return [];
        }
        return await original(event, ...args);
      });

      await registerConsumption(customer.id, 1000).expect(201);

      const assignment = await assignmentOf(mission.id, customer.id);
      expect(seen).toEqual([
        {
          status: 'COMPLETED',
          payload: {
            customerMissionId: assignment.id,
            missionId: mission.id,
            customerId: customer.id,
            missionName: 'Una vez',
            rewardPoints: 50,
            period: CURRENT_MONTH,
          },
        },
      ]);
    });

    it('si el listener de mission.completed falla, el consumo queda igual (201)', async () => {
      const customer = await seedCustomer();
      await seedMission({ target: 1 });
      const emitter = app.get(EventEmitter2);
      const original = emitter.emitAsync.bind(emitter);
      jest.spyOn(emitter, 'emitAsync').mockImplementation(async (event, ...args) => {
        if (event === MISSION_COMPLETED) throw new Error('falla el correo');
        return await original(event, ...args);
      });

      await registerConsumption(customer.id, 1000).expect(201);
      expect(await prisma.consumption.count()).toBe(1);
    });
  });

  it('CA-30.4: sin recompensa queda Completada y completedMissions trae rewardPoints null', async () => {
    const customer = await seedCustomer();
    const mission = await seedMission({ name: 'Sin premio', target: 1, rewardPoints: null });

    const res = await registerConsumption(customer.id, 1000).expect(201);

    expect((await assignmentOf(mission.id, customer.id)).status).toBe('COMPLETED');
    expect(res.body.completedMissions).toEqual([expect.objectContaining({ name: 'Sin premio', rewardPoints: null })]);
  });

  it('CA-30.5: una Completada, Reclamada o Vencida no suma más', async () => {
    const customer = await seedCustomer();
    // En serie: los ids de las asignaciones quedan en este orden
    for (const [name, status] of [
      ['A', 'COMPLETED'],
      ['B', 'CLAIMED'],
      ['C', 'EXPIRED'],
    ] as const) {
      const mission = await seedMission({ name });
      await seedAssignment(mission.id, customer.id, status);
    }

    const res = await registerConsumption(customer.id, 1000).expect(201);

    expect(res.body.completedMissions).toEqual([]);
    const after = await prisma.customerMission.findMany({ where: { customerId: customer.id }, orderBy: { id: 'asc' } });
    expect(after.map((item) => [item.status, item.progress.toNumber()])).toEqual([
      ['COMPLETED', 2],
      ['CLAIMED', 2],
      ['EXPIRED', 2],
    ]);
    expect((await newAuditRows()).map((row) => row.actionCode)).toEqual(['CONSUMPTION_REGISTERED']);
  });

  it('CA-30.6: si falla el avance (la auditoría de la misión), no queda el consumo ni la asignación', async () => {
    const customer = await seedCustomer();
    await seedMission({ target: 1 });
    const audit = app.get(AuditService);
    const original = audit.record.bind(audit);
    jest.spyOn(audit, 'record').mockImplementation(async (entry: AuditEntryInput) => {
      if (entry.action === 'MISSION_COMPLETED') throw new Error('falla la auditoría');
      return await original(entry);
    });
    const emit = jest.spyOn(app.get(EventEmitter2), 'emitAsync');

    const res = await registerConsumption(customer.id, 1000);

    expect(res.status).toBe(500);
    expect(await prisma.consumption.count()).toBe(0);
    expect(await prisma.customerMission.count()).toBe(0);
    expect(await prisma.customerPoints.findUnique({ where: { customerId: customer.id } })).toBeNull();
    expect(emit.mock.calls.filter(([event]) => event === MISSION_COMPLETED)).toHaveLength(0);
  });

  describe('CA-30.8: anular', () => {
    it('resta el avance en las En progreso del mes; una Completada no se revierte', async () => {
      const customer = await seedCustomer();
      const inProgress = await seedMission({ name: 'En progreso', target: 5 });
      const amount = await seedMission({ name: 'Monto', objectiveType: 'CONSUMPTION_AMOUNT', target: 50000 });
      const completes = await seedMission({ name: 'Se completa', target: 1 });
      const otherDay = await seedMission({ name: 'Otro día', daysOfWeek: [ANOTHER_DAY], target: 5 });
      await prisma.customerMission.create({
        data: {
          missionId: otherDay.id,
          customerId: customer.id,
          period: monthDate(CURRENT_MONTH),
          objectiveType: 'CONSUMPTION_COUNT',
          target: 5,
          daysOfWeek: [ANOTHER_DAY],
          rewardPoints: 50,
          progress: 3,
        },
      });

      const first = await registerConsumption(customer.id, 1200).expect(201);
      await registerConsumption(customer.id, 800).expect(201);
      lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;

      await voidConsumption(first.body.consumption.code).expect(200);

      expect((await assignmentOf(inProgress.id, customer.id)).progress.toNumber()).toBe(1);
      expect((await assignmentOf(amount.id, customer.id)).progress.toNumber()).toBe(800);
      const completed = await assignmentOf(completes.id, customer.id);
      expect([completed.status, completed.progress.toNumber()]).toEqual(['COMPLETED', 1]);
      // No cumplía la condición: no se le resta
      expect((await assignmentOf(otherDay.id, customer.id)).progress.toNumber()).toBe(3);
      // La anulación no audita nada de misiones
      expect((await newAuditRows()).map((row) => row.actionCode)).toEqual(['CONSUMPTION_VOIDED']);
    });

    it('el avance no baja de 0', async () => {
      const customer = await seedCustomer();
      const mission = await seedMission({ name: 'Monto', objectiveType: 'CONSUMPTION_AMOUNT', target: 50000 });
      const res = await registerConsumption(customer.id, 1000).expect(201);
      await prisma.customerMission.updateMany({ where: { missionId: mission.id }, data: { progress: 300 } });

      await voidConsumption(res.body.consumption.code).expect(200);

      expect((await assignmentOf(mission.id, customer.id)).progress.toNumber()).toBe(0);
    });
  });

  it('CA-30.9: a un cliente dado de baja no se le registra el consumo ni se le asignan misiones', async () => {
    const customer = await seedCustomer(false);
    await seedMission();

    const res = await registerConsumption(customer.id, 1000).expect(409);

    expect(res.body.code).toBe('CUSTOMER_INACTIVE');
    expect(await prisma.customerMission.count()).toBe(0);
  });
});
