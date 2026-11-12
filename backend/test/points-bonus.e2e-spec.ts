import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PointsService } from '../src/points/application/points.service.js';
import { deletePointsMovements } from './delete-points-movements.js';

// BASE-5 (CA-B5.5, contrato S5 §2.7): PointsService.acreditarBonificacion contra Postgres real. Todavía no
// tiene endpoint (lo llaman US-31, US-32 y US-48), así que se usa el servicio directo.
describe('PointsService.acreditarBonificacion (e2e, BASE-5)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let points: PointsService;
  let customerId: number;
  let customerMissionId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    points = app.get(PointsService);
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  // Escenario: Carolina con 40 pts de saldo (un lote), 250 acumulados (Bronce) y una misión asignada
  beforeEach(async () => {
    await cleanDatabase();
    await prisma.loyaltyProgramConfiguration.create({
      data: {
        version: 1,
        baseAmount: 1000,
        pointsAwarded: 10,
        pointsExpirationMonths: 12,
        silverMinPoints: 300,
        goldMinPoints: 800,
        isActive: true,
      },
    });
    customerId = (
      await prisma.customer.create({
        data: {
          firstName: 'Carolina',
          lastName: 'Fernández',
          documentType: 'DNI',
          documentNumber: '38456123',
          email: 'carolina@vitto.club',
        },
      })
    ).id;
    await prisma.customerPoints.create({ data: { customerId, balance: 40, debt: 0, lifetimePoints: 250 } });
    await prisma.pointsLot.create({
      data: {
        customerId,
        initialPoints: 40,
        remainingPoints: 40,
        accreditedAt: new Date(),
        expiresAt: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
      },
    });
    const mission = await prisma.mission.create({
      data: {
        name: 'Brunch del finde',
        objectiveType: 'CONSUMPTION_COUNT',
        target: 3,
        rewardPoints: 100,
        startMonth: new Date('2026-11-01'),
      },
    });
    customerMissionId = (
      await prisma.customerMission.create({
        data: {
          missionId: mission.id,
          customerId,
          period: new Date('2026-11-01'),
          objectiveType: 'CONSUMPTION_COUNT',
          target: 3,
          rewardPoints: 100,
        },
      })
    ).id;
  });

  async function cleanDatabase() {
    await deletePointsMovements(prisma);
    await prisma.customerMission.deleteMany();
    await prisma.mission.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.loyaltyProgramConfiguration.deleteMany();
  }

  const lots = () => prisma.pointsLot.findMany({ where: { customerId }, orderBy: { id: 'asc' } });

  it('MISSION_REWARD: crea un lote con la vigencia vigente, inserta el movimiento a nombre del Sistema y no toca lifetimePoints', async () => {
    const before = Date.now();

    const result = await points.acreditarBonificacion({
      customerId,
      type: 'MISSION_REWARD',
      points: 100,
      customerMissionId,
    });

    expect(result).toEqual({
      balanceBefore: 40,
      balanceAfter: 140,
      lifetimePointsBefore: 250,
      lifetimePointsAfter: 250,
    });
    expect(await prisma.customerPoints.findUnique({ where: { customerId } })).toMatchObject({
      balance: 140,
      debt: 0,
      lifetimePoints: 250,
    });

    const [, gift] = await lots();
    expect(gift).toMatchObject({ initialPoints: 100, remainingPoints: 100, status: 'ACTIVE', consumptionId: null });
    // Vigencia vigente: 12 meses desde que se acreditó (configuración de la prueba)
    const expected = new Date(gift.accreditedAt);
    expected.setUTCMonth(expected.getUTCMonth() + 12);
    expect(gift.expiresAt).toEqual(expected);
    expect(gift.accreditedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);

    expect(await prisma.pointsMovement.findMany({ where: { customerId } })).toEqual([
      expect.objectContaining({
        type: 'MISSION_REWARD',
        points: 100,
        balanceAfter: 140,
        customerMissionId,
        lotId: gift.id,
        consumptionId: null,
        redemptionId: null,
        reason: null,
        performedByAccountId: null,
        performedByName: 'Sistema',
      }),
    ]);

    // Invariante del Sprint 3: balance = Σ remaining de los lotes ACTIVE − debt (debt = 0)
    const remaining = (await lots()).filter((lot) => lot.status === 'ACTIVE').reduce((sum, lot) => sum + lot.remainingPoints, 0);
    expect(remaining).toBe(140);
  });

  it('el nivel no cambia aunque el regalo cruce un umbral: sale solo de los consumos (S5-9)', async () => {
    // 250 acumulados + un regalo de 1.000 sería Oro si sumara; no suma
    await points.acreditarBonificacion({ customerId, type: 'BIRTHDAY_BONUS', points: 1000 });

    const summary = await points.resumen(customerId);
    expect(summary).toMatchObject({ balance: 1040, lifetimePoints: 250 });
    expect(summary.level.current).toBe('BRONZE');
  });

  it('BIRTHDAY_BONUS con deuda: cancela primero la deuda y el lote es por lo que sobra', async () => {
    await prisma.pointsLot.deleteMany({ where: { customerId } });
    await prisma.customerPoints.update({ where: { customerId }, data: { balance: -30, debt: 30 } });

    const result = await points.acreditarBonificacion({ customerId, type: 'BIRTHDAY_BONUS', points: 100 });

    expect(result).toMatchObject({ balanceBefore: -30, balanceAfter: 70 });
    expect(await prisma.customerPoints.findUnique({ where: { customerId } })).toMatchObject({
      balance: 70,
      debt: 0,
      lifetimePoints: 250,
    });
    expect(await lots()).toEqual([expect.objectContaining({ initialPoints: 70, remainingPoints: 70 })]);
    expect(await prisma.pointsMovement.findMany({ where: { customerId } })).toEqual([
      expect.objectContaining({
        type: 'BIRTHDAY_BONUS',
        points: 100,
        balanceAfter: 70,
        customerMissionId: null,
        performedByAccountId: null,
        performedByName: 'Sistema',
      }),
    ]);
  });

  it('con deuda mayor que el regalo: no crea lote y el movimiento queda sin lote', async () => {
    await prisma.pointsLot.deleteMany({ where: { customerId } });
    await prisma.customerPoints.update({ where: { customerId }, data: { balance: -300, debt: 300 } });

    await points.acreditarBonificacion({ customerId, type: 'BIRTHDAY_BONUS', points: 100 });

    expect(await prisma.customerPoints.findUnique({ where: { customerId } })).toMatchObject({
      balance: -200,
      debt: 200,
    });
    expect(await lots()).toEqual([]);
    expect((await prisma.pointsMovement.findMany({ where: { customerId } }))[0].lotId).toBeNull();
  });

  it('una misma misión no se cobra dos veces: el segundo intento falla y no deja nada escrito', async () => {
    await points.acreditarBonificacion({ customerId, type: 'MISSION_REWARD', points: 100, customerMissionId });

    await expect(
      points.acreditarBonificacion({ customerId, type: 'MISSION_REWARD', points: 100, customerMissionId }),
    ).rejects.toThrow();

    // Solo quedó lo del primero: el segundo se deshizo entero (saldo, lote y movimiento)
    expect(await prisma.customerPoints.findUnique({ where: { customerId } })).toMatchObject({ balance: 140 });
    expect(await lots()).toHaveLength(2);
    expect(await prisma.pointsMovement.count({ where: { customerId } })).toBe(1);
  });
});
