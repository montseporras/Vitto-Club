import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PointsService } from '../src/points/application/points.service.js';
import { PointsMovementsService } from '../src/points/application/points-movements.service.js';
import { InsufficientBalanceError } from '../src/points/domain/errors/insufficient-balance.error.js';

// BASE-4 (CA-B4.6): PointsService.canjear contra Postgres real. Todavía no tiene endpoint (lo
// llama US-42), así que se usa el servicio directo.
describe('PointsService.canjear (e2e, BASE-4)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let points: PointsService;
  let movements: PointsMovementsService;
  let customerId: number;
  let accountId: number;
  let redemptionId: number;

  const performedBy = () => ({ accountId, name: 'Bruno Pérez' });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    points = app.get(PointsService);
    movements = app.get(PointsMovementsService);
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  // Escenario: Carolina con dos lotes, 100 que vencen antes y 200 después (saldo 300, 500
  // acumulados), y un canje Confirmado de 150 pts.
  beforeEach(async () => {
    await cleanDatabase();
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Carolina',
        lastName: 'Fernández',
        documentType: 'DNI',
        documentNumber: '38456123',
        email: 'carolina@vitto.club',
      },
    });
    customerId = customer.id;
    const employee = await prisma.employee.create({
      data: { firstName: 'Bruno', lastName: 'Pérez', email: 'cajero@vitto.club', role: 'CASHIER' },
    });
    accountId = (
      await prisma.account.create({
        data: { email: 'cajero@vitto.club', passwordHash: 'hashed:x', role: 'CASHIER', employeeId: employee.id },
      })
    ).id;

    await prisma.customerPoints.create({ data: { customerId, balance: 300, debt: 0, lifetimePoints: 500 } });
    const accreditedAt = new Date('2026-01-10T15:00:00.000Z');
    await prisma.pointsLot.create({
      data: { customerId, initialPoints: 100, remainingPoints: 100, accreditedAt, expiresAt: new Date('2027-01-10T15:00:00.000Z') },
    });
    await prisma.pointsLot.create({
      data: { customerId, initialPoints: 200, remainingPoints: 200, accreditedAt, expiresAt: new Date('2027-06-10T15:00:00.000Z') },
    });

    const reward = await prisma.reward.create({ data: { name: 'Café + medialuna', points: 150, stock: 10 } });
    const createdAt = new Date('2026-11-07T15:00:00.000Z');
    redemptionId = (
      await prisma.redemption.create({
        data: {
          code: 'K7MP2X',
          customerId,
          rewardId: reward.id,
          rewardName: reward.name,
          points: 150,
          origin: 'APP',
          createdAt,
          expiresAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
        },
      })
    ).id;
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
    await prisma.customer.deleteMany();
  }

  const lots = () => prisma.pointsLot.findMany({ where: { customerId }, orderBy: { expiresAt: 'asc' } });

  it('descuenta FIFO, inserta REDEMPTION con redemption_id y no toca lifetimePoints', async () => {
    const result = await points.canjear({ customerId, points: 150, redemptionId, performedBy: performedBy() });

    expect(result).toEqual({ balanceBefore: 300, balanceAfter: 150 });

    const [first, second] = await lots();
    expect(first).toMatchObject({ remainingPoints: 0, status: 'CONSUMED' });
    expect(second).toMatchObject({ remainingPoints: 150, status: 'ACTIVE' });

    expect(await prisma.customerPoints.findUnique({ where: { customerId } })).toMatchObject({
      balance: 150,
      debt: 0,
      lifetimePoints: 500,
    });

    const movements = await prisma.pointsMovement.findMany({ where: { customerId } });
    expect(movements).toEqual([
      expect.objectContaining({
        type: 'REDEMPTION',
        points: -150,
        balanceAfter: 150,
        redemptionId,
        consumptionId: null,
        lotId: null,
        reason: null,
        performedByAccountId: accountId,
        performedByName: 'Bruno Pérez',
      }),
    ]);

    // Invariante del Sprint 3: balance = Σ remaining de los lotes ACTIVE − debt (debt = 0)
    const remaining = (await lots()).filter((l) => l.status === 'ACTIVE').reduce((s, l) => s + l.remainingPoints, 0);
    expect(remaining).toBe(150);
  });

  // Fix de BASE-4: antes, describeMovement tiraba error con REDEMPTION y las tres consultas de
  // movimientos respondían 500 en cuanto el cliente usaba un canje
  it('las consultas de movimientos muestran el canje como "Canje: {recompensa}"', async () => {
    await points.canjear({ customerId, points: 150, redemptionId, performedBy: performedBy() });

    const mine = await movements.listMine({ customerId, page: 1, limit: 10 });
    const all = await movements.listAll({ page: 1, limit: 10 });

    for (const page of [mine, all]) {
      expect(page.items[0]).toMatchObject({
        type: 'REDEMPTION',
        points: -150,
        description: 'Canje: Café + medialuna',
        consumptionCode: null,
        reason: null,
        lot: null,
        performedBy: { actorType: 'EMPLOYEE', accountId, name: 'Bruno Pérez' },
      });
    }
  });

  it('saldo insuficiente: INSUFFICIENT_BALANCE y no queda nada escrito', async () => {
    await expect(
      points.canjear({ customerId, points: 301, redemptionId, performedBy: performedBy() }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);

    expect((await lots()).map((l) => l.remainingPoints)).toEqual([100, 200]);
    expect(await prisma.customerPoints.findUnique({ where: { customerId } })).toMatchObject({ balance: 300 });
    expect(await prisma.pointsMovement.count()).toBe(0);
  });

  it('saldo negativo: INSUFFICIENT_BALANCE', async () => {
    await prisma.customerPoints.update({ where: { customerId }, data: { balance: -20, debt: 320 } });

    await expect(
      points.canjear({ customerId, points: 10, redemptionId, performedBy: performedBy() }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);
    expect(await prisma.pointsMovement.count()).toBe(0);
  });

  it('dos canjes en paralelo sobre el mismo saldo: FOR UPDATE los ordena y el segundo ve el saldo nuevo', async () => {
    // 300 de saldo: 150 + 200 no entran juntos. Uno gana; el otro falla sin escribir nada.
    const results = await Promise.allSettled([
      points.canjear({ customerId, points: 150, redemptionId, performedBy: performedBy() }),
      points.canjear({ customerId, points: 200, redemptionId, performedBy: performedBy() }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientBalanceError);

    const balance = (await prisma.customerPoints.findUnique({ where: { customerId } }))?.balance ?? 0;
    const remaining = (await lots()).filter((l) => l.status === 'ACTIVE').reduce((s, l) => s + l.remainingPoints, 0);
    expect(remaining).toBe(balance);
    expect(await prisma.pointsMovement.count()).toBe(1);
  });
});
