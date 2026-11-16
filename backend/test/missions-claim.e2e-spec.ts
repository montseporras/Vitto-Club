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

// El mes actual en Argentina, YYYY-MM, y su último día
const CURRENT_MONTH = toArgentinaDateString(new Date()).slice(0, 7);
const monthDate = (month: string) => new Date(`${month}-01T00:00:00.000Z`);
const lastDayOf = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
};

type AssignmentStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED';

// Cubre US-31 (contrato S5 §3.3.3, §2.7 y MISSION_REWARD_CLAIMED de §3.14.2) contra Postgres real.
describe('Reclamar la recompensa de una misión (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lastAuditId = 0;
  let staff: { ADMIN: { accountId: number; employeeId: number }; CASHIER: { accountId: number; employeeId: number } };

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
        const customerId = req.header('x-test-customer-id');
        const token = await issuer.issue({
          accountId: Number(req.header('x-test-account-id') ?? 1),
          role,
          ...(employeeId ? { employeeId: Number(employeeId) } : {}),
          ...(customerId ? { customerId: Number(customerId) } : {}),
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
    const seedStaff = async (role: 'ADMIN' | 'CASHIER', email: string) => {
      const employee = await prisma.employee.create({
        data: { firstName: 'Ana', lastName: role, phone: '3510000000', email, role, isActive: true },
      });
      const account = await prisma.account.create({
        data: { email, passwordHash: 'hashed:secreta123', role, isActive: true, employeeId: employee.id },
      });
      return { accountId: account.id, employeeId: employee.id };
    };
    staff = { ADMIN: await seedStaff('ADMIN', 'admin@vitto.club'), CASHIER: await seedStaff('CASHIER', 'cajero@vitto.club') };
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

  const customerHeaders = (customerId: number) => ({
    'x-test-auth-role': 'CUSTOMER',
    'x-test-account-id': '999',
    'x-test-customer-id': String(customerId),
  });

  const claim = (customerMissionId: number | string, customerId: number) =>
    request(app.getHttpServer())
      .patch(`/api/customers/me/misiones/${customerMissionId}/reclamar`)
      .set(customerHeaders(customerId));

  let documentSeq = 50000000;
  async function seedCustomer(options: { active?: boolean; balance?: number; debt?: number; lifetimePoints?: number } = {}) {
    documentSeq += 1;
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Martín',
        lastName: 'Gómez',
        documentType: 'DNI',
        documentNumber: String(documentSeq),
        email: `${documentSeq}@mail.com`,
        isActive: options.active ?? true,
      },
    });
    if (options.balance !== undefined) {
      await prisma.customerPoints.create({
        data: {
          customerId: customer.id,
          balance: options.balance,
          debt: options.debt ?? 0,
          lifetimePoints: options.lifetimePoints ?? 0,
        },
      });
    }
    return customer;
  }

  async function seedAssignment(customerId: number, status: AssignmentStatus, rewardPoints: number | null = 50) {
    const mission = await prisma.mission.create({
      data: {
        name: `Vení 3 veces ${documentSeq}-${status}-${Math.random()}`,
        description: 'Tres consumos en el mes.',
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints,
        startMonth: monthDate(CURRENT_MONTH),
      },
    });
    const at = new Date();
    const assignment = await prisma.customerMission.create({
      data: {
        missionId: mission.id,
        customerId,
        period: monthDate(CURRENT_MONTH),
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints,
        progress: status === 'IN_PROGRESS' ? 1 : 3,
        status,
        completedAt: status === 'COMPLETED' || status === 'CLAIMED' ? at : null,
        claimedAt: status === 'CLAIMED' ? at : null,
        claimedBy: status === 'CLAIMED' ? 'CUSTOMER' : null,
        expiredAt: status === 'EXPIRED' ? at : null,
        expirationReason: status === 'EXPIRED' ? 'Fin de mes' : null,
      },
    });
    return { mission, assignment };
  }

  const movementsOf = (customerId: number) =>
    prisma.pointsMovement.findMany({ where: { customerId, type: 'MISSION_REWARD' } });

  describe('CA-31.1 y CA-31.2: reclamar', () => {
    it('Completada con 50 pts → 200, Reclamada, movimiento +50, lote nuevo y saldo; lifetimePoints igual', async () => {
      const customer = await seedCustomer({ balance: 100, lifetimePoints: 200 });
      const { mission, assignment } = await seedAssignment(customer.id, 'COMPLETED');

      const res = await claim(assignment.id, customer.id).expect(200);

      expect(res.body).toEqual({
        customerMission: {
          id: assignment.id,
          mission: { id: mission.id, name: mission.name, description: 'Tres consumos en el mes.' },
          period: CURRENT_MONTH,
          objectiveType: 'CONSUMPTION_COUNT',
          target: 3,
          daysOfWeek: null,
          timeFrom: null,
          timeTo: null,
          rewardPoints: 50,
          progress: 3,
          status: 'CLAIMED',
          completedAt: assignment.completedAt?.toISOString(),
          claimedAt: expect.stringMatching(ISO_INSTANT),
          claimedBy: 'CUSTOMER',
          canClaim: false,
          endsAt: lastDayOf(CURRENT_MONTH),
        },
        balanceAfter: 150,
      });

      const saved = await prisma.customerMission.findUniqueOrThrow({ where: { id: assignment.id } });
      expect([saved.status, saved.claimedBy]).toEqual(['CLAIMED', 'CUSTOMER']);
      expect(saved.claimedAt?.toISOString()).toBe(res.body.customerMission.claimedAt);

      const movements = await movementsOf(customer.id);
      expect(movements).toHaveLength(1);
      expect(movements[0]).toMatchObject({ points: 50, balanceAfter: 150, customerMissionId: assignment.id, consumptionId: null });

      const lots = await prisma.pointsLot.findMany({ where: { customerId: customer.id } });
      expect(lots.map((lot) => [lot.initialPoints, lot.remainingPoints, lot.consumptionId])).toEqual([[50, 50, null]]);

      const points = await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: customer.id } });
      expect([points.balance, points.lifetimePoints]).toEqual([150, 200]);
    });

    it('con deuda, la recompensa cancela primero la deuda', async () => {
      const customer = await seedCustomer({ balance: -30, debt: 30 });
      const { assignment } = await seedAssignment(customer.id, 'COMPLETED');

      const res = await claim(assignment.id, customer.id).expect(200);

      expect(res.body.balanceAfter).toBe(20);
      const points = await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: customer.id } });
      expect([points.balance, points.debt]).toEqual([20, 0]);
      const lots = await prisma.pointsLot.findMany({ where: { customerId: customer.id } });
      expect(lots.map((lot) => lot.initialPoints)).toEqual([20]);
    });
  });

  describe('CA-31.3: no reclamable → 409 MISSION_NOT_CLAIMABLE con el mensaje de cada caso', () => {
    it.each([
      ['En progreso', 'IN_PROGRESS', 50, 'La misión todavía no está completada.'],
      ['Reclamada', 'CLAIMED', 50, 'La recompensa de esta misión ya se reclamó.'],
      ['Vencida', 'EXPIRED', 50, 'La misión venció.'],
      ['sin recompensa', 'COMPLETED', null, 'Esta misión no tiene recompensa.'],
    ] as const)('%s', async (_case, status, rewardPoints, message) => {
      const customer = await seedCustomer({ balance: 100 });
      const { assignment } = await seedAssignment(customer.id, status, rewardPoints);

      const res = await claim(assignment.id, customer.id).expect(409);

      expect(res.body).toMatchObject({ statusCode: 409, code: 'MISSION_NOT_CLAIMABLE', message });
      expect(await movementsOf(customer.id)).toHaveLength(0);
      expect((await prisma.customerMission.findUniqueOrThrow({ where: { id: assignment.id } })).status).toBe(status);
      expect(await newAuditRows()).toHaveLength(0);
    });
  });

  describe('CA-31.4: ajena', () => {
    it('de otro cliente o inexistente → 404 "No existe la misión."; id que no es número → 400', async () => {
      const owner = await seedCustomer({ balance: 0 });
      const other = await seedCustomer({ balance: 0 });
      const { assignment } = await seedAssignment(owner.id, 'COMPLETED');

      for (const id of [assignment.id, 999999]) {
        const res = await claim(id, other.id).expect(404);
        expect(res.body).toMatchObject({ statusCode: 404, message: 'No existe la misión.' });
        expect(res.body.code).toBeUndefined();
      }
      await claim('abc', other.id).expect(400);
      expect((await prisma.customerMission.findUniqueOrThrow({ where: { id: assignment.id } })).status).toBe('COMPLETED');
    });
  });

  it('CA-31.5: dos reclamos a la vez → uno 200 y el otro 409; un solo movimiento', async () => {
    const customer = await seedCustomer({ balance: 0 });
    const { assignment } = await seedAssignment(customer.id, 'COMPLETED');

    const responses = await Promise.all([claim(assignment.id, customer.id), claim(assignment.id, customer.id)]);

    expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(responses.find((res) => res.status === 409)?.body).toMatchObject({
      code: 'MISSION_NOT_CLAIMABLE',
      message: 'La recompensa de esta misión ya se reclamó.',
    });
    expect(await movementsOf(customer.id)).toHaveLength(1);
    expect((await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: customer.id } })).balance).toBe(50);
    expect(await newAuditRows()).toHaveLength(1);
  });

  it('CA-31.6: audita MISSION_REWARD_CLAIMED a nombre del Sistema, con "Reclamada por: Cliente"', async () => {
    const customer = await seedCustomer({ balance: 1500 });
    const { mission, assignment } = await seedAssignment(customer.id, 'COMPLETED');

    await claim(assignment.id, customer.id).expect(200);

    const rows = await newAuditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorType: 'SYSTEM',
      actorAccountId: null,
      performedBy: 'Sistema',
      module: 'MISSIONS',
      actionCode: 'MISSION_REWARD_CLAIMED',
      description: `Reclamó la recompensa de la misión "${mission.name}" de Martín Gómez`,
      affectedCustomerId: customer.id,
      operationCode: null,
      details: [
        { label: 'Misión', value: mission.name },
        { label: 'Puntos otorgados', value: '50 pts' },
        { label: 'Saldo resultante', value: '1.550 pts' },
        { label: 'Reclamada por', value: 'Cliente' },
      ],
    });
  });

  it('rollback: si falla la auditoría, la misión sigue Completada y no se acredita nada', async () => {
    const customer = await seedCustomer({ balance: 100 });
    const { assignment } = await seedAssignment(customer.id, 'COMPLETED');
    jest.spyOn(app.get(AuditService), 'record').mockRejectedValueOnce(new Error('falla la auditoría'));

    const res = await claim(assignment.id, customer.id);

    expect(res.status).toBe(500);
    expect((await prisma.customerMission.findUniqueOrThrow({ where: { id: assignment.id } })).status).toBe('COMPLETED');
    expect(await movementsOf(customer.id)).toHaveLength(0);
    expect(await prisma.pointsLot.count()).toBe(0);
    expect((await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: customer.id } })).balance).toBe(100);
  });

  it('cliente dado de baja con token vivo → 401 UNAUTHENTICATED, sin acreditar', async () => {
    const customer = await seedCustomer({ active: false, balance: 100 });
    const { assignment } = await seedAssignment(customer.id, 'COMPLETED');

    const res = await claim(assignment.id, customer.id).expect(401);

    expect(res.body.code).toBe('UNAUTHENTICATED');
    expect(await movementsOf(customer.id)).toHaveLength(0);
  });

  it('CA-31.7: Administrador y Cajero → 403; sin token → 401', async () => {
    const customer = await seedCustomer({ balance: 0 });
    const { assignment } = await seedAssignment(customer.id, 'COMPLETED');
    const path = `/api/customers/me/misiones/${assignment.id}/reclamar`;

    for (const role of ['ADMIN', 'CASHIER'] as const) {
      const res = await request(app.getHttpServer())
        .patch(path)
        .set({
          'x-test-auth-role': role,
          'x-test-account-id': String(staff[role].accountId),
          'x-test-employee-id': String(staff[role].employeeId),
        })
        .expect(403);
      expect(res.body.code).toBe('FORBIDDEN');
    }
    await request(app.getHttpServer()).patch(path).expect(401);

    expect((await prisma.customerMission.findUniqueOrThrow({ where: { id: assignment.id } })).status).toBe('COMPLETED');
    expect(await newAuditRows()).toHaveLength(0);
  });
});
