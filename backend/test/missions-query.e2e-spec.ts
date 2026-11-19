import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { toArgentinaDateString } from '../src/shared/time/argentina-date.js';
import { deleteNotifications } from './delete-notifications.js';
import { deletePointsMovements } from './delete-points-movements.js';

const CURRENT_MONTH = toArgentinaDateString(new Date()).slice(0, 7);
function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}
const PREVIOUS_MONTH = shiftMonth(CURRENT_MONTH, -1);
const monthDate = (month: string) => new Date(`${month}-01T00:00:00.000Z`);
const lastDayOf = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
};

type AssignmentStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED';

// Cubre US-33 (contrato S5 §3.3.1, §3.3.2 y §3.3.4) contra Postgres real.
describe('Consultar misiones (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lastAuditId = 0;
  let staff: Record<'ADMIN' | 'CASHIER', { accountId: number; employeeId: number }>;

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
    await cleanDatabase();
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
  }

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  const asCustomer = (customerId: number, query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get('/api/customers/me/misiones')
      .query(query)
      .set({ 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '999', 'x-test-customer-id': String(customerId) });

  const asStaff = (role: 'ADMIN' | 'CASHIER', customerId: number | string, query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get(`/api/customers/${customerId}/misiones`)
      .query(query)
      .set({
        'x-test-auth-role': role,
        'x-test-account-id': String(staff[role].accountId),
        'x-test-employee-id': String(staff[role].employeeId),
      });

  let documentSeq = 70000000;
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

  async function seedMission(
    name: string,
    data: { startMonth?: string; endMonth?: string; rewardPoints?: number | null; status?: 'ACTIVE' | 'DELETED' } = {},
  ) {
    const status = data.status ?? 'ACTIVE';
    return await prisma.mission.create({
      data: {
        name,
        description: `Descripción de ${name}`,
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints: data.rewardPoints === undefined ? 50 : data.rewardPoints,
        daysOfWeek: [7],
        timeFrom: new Date('1970-01-01T09:00:00.000Z'),
        timeTo: new Date('1970-01-01T13:00:00.000Z'),
        startMonth: monthDate(data.startMonth ?? PREVIOUS_MONTH),
        endMonth: data.endMonth ? monthDate(data.endMonth) : null,
        status,
        deletedAt: status === 'DELETED' ? new Date() : null,
      },
    });
  }

  async function seedAssignment(missionId: number, customerId: number, status: AssignmentStatus, period = CURRENT_MONTH) {
    const at = new Date(`${period}-02T15:00:00.000Z`);
    return await prisma.customerMission.create({
      data: {
        missionId,
        customerId,
        period: monthDate(period),
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints: 50,
        progress: status === 'IN_PROGRESS' ? 2 : 3,
        status,
        completedAt: status === 'COMPLETED' || status === 'CLAIMED' ? at : null,
        claimedAt: status === 'CLAIMED' ? at : null,
        claimedBy: status === 'CLAIMED' ? 'SYSTEM' : null,
        expiredAt: status === 'EXPIRED' ? at : null,
        expirationReason: status === 'EXPIRED' ? 'Misión dada de baja' : null,
      },
    });
  }

  describe('GET /api/customers/me/misiones', () => {
    it('CA-33.2: asigna las en curso que no tenía, con el snapshot, y devuelve el CustomerMission completo', async () => {
      const customer = await seedCustomer();
      const mission = await seedMission('Vení 3 veces');
      await seedMission('Próxima', { startMonth: shiftMonth(CURRENT_MONTH, 1) });
      await seedMission('Borrada', { status: 'DELETED' });

      const res = await asCustomer(customer.id).expect(200);

      const assignment = await prisma.customerMission.findFirstOrThrow({ where: { customerId: customer.id } });
      expect(await prisma.customerMission.count()).toBe(1);
      expect(res.body).toEqual([
        {
          id: assignment.id,
          mission: { id: mission.id, name: 'Vení 3 veces', description: 'Descripción de Vení 3 veces' },
          period: CURRENT_MONTH,
          objectiveType: 'CONSUMPTION_COUNT',
          target: 3,
          daysOfWeek: [7],
          timeFrom: '09:00',
          timeTo: '13:00',
          rewardPoints: 50,
          progress: 0,
          status: 'IN_PROGRESS',
          completedAt: null,
          claimedAt: null,
          claimedBy: null,
          canClaim: false,
          endsAt: lastDayOf(CURRENT_MONTH),
        },
      ]);
    });

    it('consultar dos veces no duplica y no audita', async () => {
      const customer = await seedCustomer();
      await seedMission('Vení 3 veces');

      await asCustomer(customer.id).expect(200);
      await asCustomer(customer.id).expect(200);

      expect(await prisma.customerMission.count()).toBe(1);
      expect(await newAuditRows()).toEqual([]);
    });

    it('orden: En progreso, Completada, Reclamada, Vencida; por nombre dentro de cada estado; canClaim', async () => {
      const customer = await seedCustomer();
      const statuses: [string, AssignmentStatus][] = [
        ['Expirada', 'EXPIRED'],
        ['Reclamada', 'CLAIMED'],
        ['Completada', 'COMPLETED'],
        ['Zeta en progreso', 'IN_PROGRESS'],
        ['Alfa en progreso', 'IN_PROGRESS'],
      ];
      for (const [name, status] of statuses) {
        const mission = await seedMission(name, { status: status === 'EXPIRED' ? 'DELETED' : 'ACTIVE' });
        await seedAssignment(mission.id, customer.id, status);
      }

      const res = await asCustomer(customer.id).expect(200);

      expect(res.body.map((item: { mission: { name: string }; status: string; canClaim: boolean }) => [item.mission.name, item.status, item.canClaim])).toEqual([
        ['Alfa en progreso', 'IN_PROGRESS', false],
        ['Zeta en progreso', 'IN_PROGRESS', false],
        ['Completada', 'COMPLETED', true],
        ['Reclamada', 'CLAIMED', false],
        ['Expirada', 'EXPIRED', false],
      ]);
    });

    it('CA-33.3: ?period de un mes anterior trae sus asignaciones y no asigna nada nuevo', async () => {
      const customer = await seedCustomer();
      const mission = await seedMission('Vení 3 veces', { startMonth: shiftMonth(CURRENT_MONTH, -2) });
      await seedAssignment(mission.id, customer.id, 'EXPIRED', PREVIOUS_MONTH);

      const res = await asCustomer(customer.id, { period: PREVIOUS_MONTH }).expect(200);

      expect(res.body.map((item: { period: string; status: string; endsAt: string }) => [item.period, item.status, item.endsAt])).toEqual([
        [PREVIOUS_MONTH, 'EXPIRED', lastDayOf(PREVIOUS_MONTH)],
      ]);
      expect(await prisma.customerMission.count()).toBe(1);
    });

    it('?period con el mes actual es lo mismo que sin period', async () => {
      const customer = await seedCustomer();
      await seedMission('Vení 3 veces');

      const res = await asCustomer(customer.id, { period: CURRENT_MONTH }).expect(200);

      expect(res.body).toHaveLength(1);
      expect(await prisma.customerMission.count()).toBe(1);
    });

    it.each([
      ['futuro', shiftMonth(CURRENT_MONTH, 1)],
      ['de hace 12 meses', shiftMonth(CURRENT_MONTH, -12)],
      ['mal escrito', 'noviembre'],
    ])('mes %s → 400 "Elegí un mes de los últimos 12."', async (_case, period) => {
      const customer = await seedCustomer();
      const res = await asCustomer(customer.id, { period }).expect(400);
      expect(res.body.message).toBe('Elegí un mes de los últimos 12.');
    });

    it('vacío → []', async () => {
      const customer = await seedCustomer();
      expect((await asCustomer(customer.id).expect(200)).body).toEqual([]);
    });

    it('cliente dado de baja con token vivo → 401 UNAUTHENTICATED y no se le asigna nada', async () => {
      const customer = await seedCustomer(false);
      await seedMission('Vení 3 veces');

      const res = await asCustomer(customer.id).expect(401);

      expect(res.body.code).toBe('UNAUTHENTICATED');
      expect(await prisma.customerMission.count()).toBe(0);
    });

    it('Administrador y Cajero → 403; sin token → 401', async () => {
      for (const role of ['ADMIN', 'CASHIER'] as const) {
        await request(app.getHttpServer())
          .get('/api/customers/me/misiones')
          .set({
            'x-test-auth-role': role,
            'x-test-account-id': String(staff[role].accountId),
            'x-test-employee-id': String(staff[role].employeeId),
          })
          .expect(403);
      }
      await request(app.getHttpServer()).get('/api/customers/me/misiones').expect(401);
    });
  });

  describe('GET /api/customers/:id/misiones — CA-33.5 y CA-33.6', () => {
    it('no asigna: las en curso que faltan aparecen sin id, con progreso 0, En progreso y sin canClaim', async () => {
      const customer = await seedCustomer();
      const assignedMission = await seedMission('Asignada');
      const missing = await seedMission('Falta');
      const assignment = await seedAssignment(assignedMission.id, customer.id, 'COMPLETED');

      for (const role of ['ADMIN', 'CASHIER'] as const) {
        const res = await asStaff(role, customer.id).expect(200);
        expect(res.body).toEqual([
          {
            id: null,
            mission: { id: missing.id, name: 'Falta', description: 'Descripción de Falta' },
            period: CURRENT_MONTH,
            objectiveType: 'CONSUMPTION_COUNT',
            target: 3,
            daysOfWeek: [7],
            timeFrom: '09:00',
            timeTo: '13:00',
            rewardPoints: 50,
            progress: 0,
            status: 'IN_PROGRESS',
            completedAt: null,
            claimedAt: null,
            claimedBy: null,
            endsAt: lastDayOf(CURRENT_MONTH),
          },
          expect.objectContaining({ id: assignment.id, status: 'COMPLETED', progress: 3 }),
        ]);
        expect(res.body[1].canClaim).toBeUndefined();
      }
      expect(await prisma.customerMission.count()).toBe(1);
      expect(await newAuditRows()).toEqual([]);
    });

    it('?period de un mes anterior: solo las asignadas de ese mes', async () => {
      const customer = await seedCustomer();
      const mission = await seedMission('Vení 3 veces', { startMonth: shiftMonth(CURRENT_MONTH, -2) });
      await seedAssignment(mission.id, customer.id, 'CLAIMED', PREVIOUS_MONTH);

      const res = await asStaff('ADMIN', customer.id, { period: PREVIOUS_MONTH }).expect(200);

      expect(res.body.map((item: { status: string; claimedBy: string }) => [item.status, item.claimedBy])).toEqual([['CLAIMED', 'SYSTEM']]);
    });

    it('cliente inexistente → 404 "No existe el cliente."; dado de baja → []; id que no es número → 400', async () => {
      const res = await asStaff('ADMIN', 999999).expect(404);
      expect(res.body.message).toBe('No existe el cliente.');

      const inactive = await seedCustomer(false);
      await seedMission('Vení 3 veces');
      expect((await asStaff('CASHIER', inactive.id).expect(200)).body).toEqual([]);

      await asStaff('ADMIN', 'abc').expect(400);
    });

    it('Cliente → 403; sin token → 401', async () => {
      const customer = await seedCustomer();
      await request(app.getHttpServer())
        .get(`/api/customers/${customer.id}/misiones`)
        .set({ 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '999', 'x-test-customer-id': String(customer.id) })
        .expect(403);
      await request(app.getHttpServer()).get(`/api/customers/${customer.id}/misiones`).expect(401);
    });
  });
});
