import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AuditService } from '../src/audit/application/audit.service.js';
import type { AuditEntryInput } from '../src/audit/domain/audit-entry.js';
import { MissionsExpirationService } from '../src/missions/application/missions-expiration.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { toArgentinaDateString } from '../src/shared/time/argentina-date.js';
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

// Las asignaciones se siembran en meses ya terminados y el proceso corre "ahora"
const CURRENT_MONTH = toArgentinaDateString(new Date()).slice(0, 7);
function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}
const PREVIOUS_MONTH = shiftMonth(CURRENT_MONTH, -1);
const TWO_MONTHS_AGO = shiftMonth(CURRENT_MONTH, -2);
const monthDate = (month: string) => new Date(`${month}-01T00:00:00.000Z`);
const monthText = (month: string) => `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

type AssignmentStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED';

// Cubre US-32 (contrato S5 §3.4, S5-4, S5-5 y MISSIONS_EXPIRED de §3.14.2) contra Postgres real. El cron
// está apagado (MISSIONS_EXPIRATION_CRON_ENABLED=false en setup-e2e-env.ts): el test llama al servicio.
describe('Vencer y reiniciar misiones (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let expiration: MissionsExpirationService;
  let lastAuditId = 0;
  let admin: { accountId: number; employeeId: number };

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
    expiration = app.get(MissionsExpirationService);
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
    admin = { accountId: account.id, employeeId: employee.id };
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

  let documentSeq = 60000000;
  async function seedCustomer(active = true) {
    documentSeq += 1;
    return await prisma.customer.create({
      data: {
        firstName: 'Martín',
        lastName: 'Gómez',
        documentType: 'DNI',
        documentNumber: String(documentSeq),
        email: `${documentSeq}@mail.com`,
        isActive: active,
      },
    });
  }

  let missionSeq = 0;
  async function seedMission(data: { pendingChanges?: object; startMonth?: string } = {}) {
    missionSeq += 1;
    return await prisma.mission.create({
      data: {
        name: `Vení 3 veces ${missionSeq}`,
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints: 50,
        startMonth: monthDate(data.startMonth ?? TWO_MONTHS_AGO),
        ...(data.pendingChanges ? { pendingChanges: data.pendingChanges } : {}),
      },
    });
  }

  async function seedAssignment(
    missionId: number,
    customerId: number,
    status: AssignmentStatus,
    options: { period?: string; rewardPoints?: number | null } = {},
  ) {
    const period = options.period ?? PREVIOUS_MONTH;
    const at = new Date(`${period}-10T15:00:00.000Z`);
    return await prisma.customerMission.create({
      data: {
        missionId,
        customerId,
        period: monthDate(period),
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints: options.rewardPoints === undefined ? 50 : options.rewardPoints,
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

  const statusOf = async (id: number) => await prisma.customerMission.findUniqueOrThrow({ where: { id } });

  it('CA-32.2: En progreso de un mes terminado → Vencida "Fin de mes"; la del mes actual no se toca', async () => {
    const customer = await seedCustomer();
    const mission = await seedMission();
    const previous = await seedAssignment(mission.id, customer.id, 'IN_PROGRESS');
    const current = await seedAssignment(mission.id, customer.id, 'IN_PROGRESS', { period: CURRENT_MONTH });

    const result = await expiration.run();

    expect(result).toMatchObject({ expired: 1, claimed: 0, failures: [] });
    const expired = await statusOf(previous.id);
    expect(expired).toMatchObject({ status: 'EXPIRED', expirationReason: 'Fin de mes' });
    expect(expired.expiredAt).toBeInstanceOf(Date);
    expect((await statusOf(current.id)).status).toBe('IN_PROGRESS');
  });

  it('CA-32.3: Completada con recompensa → Reclamada sola (SYSTEM), con puntos y "Reclamada por: Automático"', async () => {
    const customer = await seedCustomer();
    await prisma.customerPoints.create({ data: { customerId: customer.id, balance: 100, lifetimePoints: 400 } });
    const mission = await seedMission();
    const completed = await seedAssignment(mission.id, customer.id, 'COMPLETED');

    const result = await expiration.run();

    expect(result).toMatchObject({ expired: 0, claimed: 1 });
    expect(await statusOf(completed.id)).toMatchObject({ status: 'CLAIMED', claimedBy: 'SYSTEM' });
    const movements = await prisma.pointsMovement.findMany({ where: { customerId: customer.id, type: 'MISSION_REWARD' } });
    expect(movements.map((movement) => [movement.points, movement.customerMissionId])).toEqual([[50, completed.id]]);
    const points = await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: customer.id } });
    // El nivel no cambia (S5-9)
    expect([points.balance, points.lifetimePoints]).toEqual([150, 400]);

    const rows = await newAuditRows();
    expect(rows.map((row) => row.actionCode)).toEqual(['MISSION_REWARD_CLAIMED', 'MISSIONS_EXPIRED']);
    expect(rows[0]).toMatchObject({
      actorType: 'SYSTEM',
      affectedCustomerId: customer.id,
      details: expect.arrayContaining([{ label: 'Reclamada por', value: 'Automático' }]),
    });
  });

  it('CA-32.4: Completada sin recompensa, Reclamada y Vencida quedan igual; sin nada que hacer, no se audita', async () => {
    const customer = await seedCustomer();
    const mission = await seedMission();
    const ids = [
      (await seedAssignment(mission.id, customer.id, 'COMPLETED', { rewardPoints: null })).id,
      (await seedAssignment(mission.id, (await seedCustomer()).id, 'CLAIMED')).id,
      (await seedAssignment(mission.id, (await seedCustomer()).id, 'EXPIRED')).id,
    ];

    const result = await expiration.run();

    expect(result).toMatchObject({ expired: 0, claimed: 0 });
    const after = await prisma.customerMission.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } });
    expect(after.map((item) => item.status)).toEqual(['COMPLETED', 'CLAIMED', 'EXPIRED']);
    // CA-32.5: ninguna MISSIONS_EXPIRED si no venció nada
    expect(await newAuditRows()).toEqual([]);
  });

  it('CA-32.5: una sola MISSIONS_EXPIRED por corrida, a nombre del Sistema, con los totales', async () => {
    const mission = await seedMission();
    for (const status of ['IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED'] as const) {
      await seedAssignment(mission.id, (await seedCustomer()).id, status);
    }

    await expiration.run();

    const summaries = (await newAuditRows()).filter((row) => row.actionCode === 'MISSIONS_EXPIRED');
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      actorType: 'SYSTEM',
      actorAccountId: null,
      module: 'MISSIONS',
      description: 'Venció las misiones del mes',
      affectedCustomerId: null,
      details: [
        { label: 'Período', value: monthText(PREVIOUS_MONTH) },
        { label: 'Misiones vencidas', value: '2' },
        { label: 'Recompensas reclamadas automáticamente', value: '1' },
      ],
    });
  });

  it('si la corrida resuelve más de un mes, "Período" los nombra a todos', async () => {
    const mission = await seedMission();
    await seedAssignment(mission.id, (await seedCustomer()).id, 'IN_PROGRESS', { period: TWO_MONTHS_AGO });
    await seedAssignment(mission.id, (await seedCustomer()).id, 'IN_PROGRESS');

    await expiration.run();

    const [summary] = (await newAuditRows()).filter((row) => row.actionCode === 'MISSIONS_EXPIRED');
    expect(summary.details).toEqual(
      expect.arrayContaining([
        { label: 'Período', value: `${monthText(TWO_MONTHS_AGO)}, ${monthText(PREVIOUS_MONTH)}` },
        { label: 'Misiones vencidas', value: '2' },
      ]),
    );
  });

  describe('CA-32.6', () => {
    it('idempotente: la segunda corrida no cambia nada ni audita', async () => {
      const customer = await seedCustomer();
      const mission = await seedMission();
      await seedAssignment(mission.id, customer.id, 'IN_PROGRESS');
      await seedAssignment(mission.id, (await seedCustomer()).id, 'COMPLETED');
      await expiration.run();
      lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;

      const second = await expiration.run();

      expect(second).toMatchObject({ expired: 0, claimed: 0, failures: [] });
      expect(await newAuditRows()).toEqual([]);
      expect(await prisma.pointsMovement.count({ where: { type: 'MISSION_REWARD' } })).toBe(1);
    });

    it('un fallo deshace solo esa asignación y no frena el resto', async () => {
      const mission = await seedMission();
      const failing = await seedAssignment(mission.id, (await seedCustomer()).id, 'COMPLETED');
      const other = await seedAssignment(mission.id, (await seedCustomer()).id, 'IN_PROGRESS');
      const audit = app.get(AuditService);
      const original = audit.record.bind(audit);
      jest.spyOn(audit, 'record').mockImplementation(async (entry: AuditEntryInput) => {
        if (entry.action === 'MISSION_REWARD_CLAIMED') throw new Error('falla la auditoría');
        return await original(entry);
      });

      const result = await expiration.run();

      expect(result.failures.map((failure) => failure.customerMissionId)).toEqual([failing.id]);
      expect(result).toMatchObject({ expired: 1, claimed: 0 });
      expect((await statusOf(failing.id)).status).toBe('COMPLETED');
      expect(await prisma.pointsMovement.count({ where: { type: 'MISSION_REWARD' } })).toBe(0);
      expect((await statusOf(other.id)).status).toBe('EXPIRED');
    });

    it('SKIP LOCKED: una asignación bloqueada por otra transacción se saltea y queda para la próxima corrida', async () => {
      const mission = await seedMission();
      const locked = await seedAssignment(mission.id, (await seedCustomer()).id, 'IN_PROGRESS');
      const free = await seedAssignment(mission.id, (await seedCustomer()).id, 'IN_PROGRESS');

      await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM customer_missions WHERE id = ${locked.id} FOR UPDATE`;
          const result = await expiration.run();
          expect(result.expired).toBe(1);
        },
        { timeout: 20_000 },
      );

      expect((await statusOf(locked.id)).status).toBe('IN_PROGRESS');
      expect((await statusOf(free.id)).status).toBe('EXPIRED');
      // La próxima corrida la resuelve
      await expiration.run();
      expect((await statusOf(locked.id)).status).toBe('EXPIRED');
    });
  });

  it('aplica los pendingChanges que ya rigen; los que rigen más adelante quedan', async () => {
    const objective = { objectiveType: 'CONSUMPTION_COUNT', daysOfWeek: null, timeFrom: null, timeTo: null };
    const due = await seedMission({ pendingChanges: { appliesFrom: CURRENT_MONTH, ...objective, target: 5, rewardPoints: 80 } });
    const later = await seedMission({
      pendingChanges: { appliesFrom: shiftMonth(CURRENT_MONTH, 1), ...objective, target: 7, rewardPoints: 90 },
    });

    const result = await expiration.run();

    expect(result.appliedPendingChanges).toBe(1);
    const applied = await prisma.mission.findUniqueOrThrow({ where: { id: due.id } });
    expect([applied.target.toNumber(), applied.rewardPoints, applied.pendingChanges]).toEqual([5, 80, null]);
    const kept = await prisma.mission.findUniqueOrThrow({ where: { id: later.id } });
    expect([kept.target.toNumber(), kept.pendingChanges]).toEqual([3, expect.objectContaining({ target: 7 })]);
    // Sin auditoría (decisión de Jazmín) y, sin asignaciones, sin MISSIONS_EXPIRED
    expect(await newAuditRows()).toEqual([]);
  });

  it('cliente dado de baja: su En progreso vence y su Completada con recompensa se reclama igual', async () => {
    const customer = await seedCustomer(false);
    const mission = await seedMission();
    const inProgress = await seedAssignment(mission.id, customer.id, 'IN_PROGRESS', { period: TWO_MONTHS_AGO });
    const completed = await seedAssignment(mission.id, customer.id, 'COMPLETED');

    await expiration.run();

    expect((await statusOf(inProgress.id)).status).toBe('EXPIRED');
    expect(await statusOf(completed.id)).toMatchObject({ status: 'CLAIMED', claimedBy: 'SYSTEM' });
  });

  it('CA-32.7: en el mes nuevo, el primer consumo asigna la misión vigente desde cero', async () => {
    const customer = await seedCustomer();
    const mission = await seedMission();
    const previous = await seedAssignment(mission.id, customer.id, 'IN_PROGRESS');
    await expiration.run();

    await request(app.getHttpServer())
      .post('/api/consumos')
      .set({ 'x-test-auth-role': 'ADMIN', 'x-test-account-id': String(admin.accountId), 'x-test-employee-id': String(admin.employeeId) })
      .send({ customerId: customer.id, amount: 1000 })
      .expect(201);

    expect((await statusOf(previous.id)).status).toBe('EXPIRED');
    const current = await prisma.customerMission.findFirstOrThrow({
      where: { missionId: mission.id, customerId: customer.id, period: monthDate(CURRENT_MONTH) },
    });
    expect([current.status, current.progress.toNumber()]).toEqual(['IN_PROGRESS', 1]);
  });
});
