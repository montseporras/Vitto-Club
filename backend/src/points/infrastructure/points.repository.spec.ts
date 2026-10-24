import { NotFoundException } from '@nestjs/common';
import { PointsPrismaRepository, toDomain } from './points.repository.js';
import { PointsLot } from '../domain/points-lot.js';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';

function fakePrisma() {
  return {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    customerPoints: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pointsLot: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    pointsMovement: {
      create: jest.fn(),
    },
    loyaltyProgramConfiguration: {
      findFirst: jest.fn(),
    },
  };
}

function fakeTransactionRunner(prismaLike: ReturnType<typeof fakePrisma>): PrismaTransactionRunner {
  return { client: prismaLike } as unknown as PrismaTransactionRunner;
}

const LOT_RECORD = {
  id: 7,
  customerId: 101,
  consumptionId: 141,
  initialPoints: 500,
  remainingPoints: 500,
  accreditedAt: new Date('2026-10-16T18:40:00.000Z'),
  expiresAt: new Date('2027-10-16T18:40:00.000Z'),
  status: 'ACTIVE' as const,
  expiredAt: null,
};

describe('toDomain (mapeo PointsLot dominio <-> Prisma)', () => {
  it('mapea los campos tal cual', () => {
    const lot = toDomain(LOT_RECORD);
    expect(lot.getId()).toBe(7);
    expect(lot.getCustomerId()).toBe(101);
    expect(lot.getRemainingPoints()).toBe(500);
    expect(lot.getStatus()).toBe('ACTIVE');
  });
});

describe('PointsPrismaRepository', () => {
  describe('lockOrCreateBalance()', () => {
    it('devuelve la fila si ya existe, sin insertar nada', async () => {
      const prisma = fakePrisma();
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { customerId: 101, balance: 500, debt: 0, lifetimePoints: 500 },
      ]);
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));

      const balance = await repo.lockOrCreateBalance(101);

      expect(balance).toEqual({ customerId: 101, balance: 500, debt: 0, lifetimePoints: 500 });
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('la crea con ceros si todavía no existe, y la vuelve a leer bloqueada', async () => {
      const prisma = fakePrisma();
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([]) // primer SELECT FOR UPDATE: no existe
        .mockResolvedValueOnce([{ customerId: 101, balance: 0, debt: 0, lifetimePoints: 0 }]); // segundo, ya creada
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));

      const balance = await repo.lockOrCreateBalance(101);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(balance).toEqual({ customerId: 101, balance: 0, debt: 0, lifetimePoints: 0 });
    });
  });

  describe('findBalance()', () => {
    it('devuelve la fila si existe', async () => {
      const prisma = fakePrisma();
      (prisma.customerPoints.findUnique as jest.Mock).mockResolvedValue({
        customerId: 101,
        balance: 100,
        debt: 0,
        lifetimePoints: 100,
      });
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.findBalance(101)).toEqual({
        customerId: 101,
        balance: 100,
        debt: 0,
        lifetimePoints: 100,
      });
    });

    it('null si el cliente nunca tuvo movimientos', async () => {
      const prisma = fakePrisma();
      (prisma.customerPoints.findUnique as jest.Mock).mockResolvedValue(null);
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.findBalance(101)).toBeNull();
    });
  });

  describe('findActiveLotsByCustomerId()', () => {
    it('filtra ACTIVE y ordena por expiresAt ascendente', async () => {
      const prisma = fakePrisma();
      (prisma.pointsLot.findMany as jest.Mock).mockResolvedValue([LOT_RECORD]);
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));

      const lots = await repo.findActiveLotsByCustomerId(101);

      expect(prisma.pointsLot.findMany).toHaveBeenCalledWith({
        where: { customerId: 101, status: 'ACTIVE' },
        orderBy: { expiresAt: 'asc' },
      });
      expect(lots).toHaveLength(1);
    });
  });

  describe('findLotByConsumptionId()', () => {
    it('busca por el unique consumptionId', async () => {
      const prisma = fakePrisma();
      (prisma.pointsLot.findUnique as jest.Mock).mockResolvedValue(LOT_RECORD);
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));

      const lot = await repo.findLotByConsumptionId(141);

      expect(prisma.pointsLot.findUnique).toHaveBeenCalledWith({ where: { consumptionId: 141 } });
      expect(lot?.getId()).toBe(7);
    });

    it('null si no hay lote para ese consumo', async () => {
      const prisma = fakePrisma();
      (prisma.pointsLot.findUnique as jest.Mock).mockResolvedValue(null);
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.findLotByConsumptionId(999)).toBeNull();
    });
  });

  describe('createLot()', () => {
    it('inserta el lote con los campos del dominio', async () => {
      const prisma = fakePrisma();
      (prisma.pointsLot.create as jest.Mock).mockResolvedValue(LOT_RECORD);
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));
      const lot = PointsLot.create({
        customerId: 101,
        consumptionId: 141,
        initialPoints: 500,
        accreditedAt: new Date('2026-10-16T18:40:00.000Z'),
        expiresAt: new Date('2027-10-16T18:40:00.000Z'),
      });

      const created = await repo.createLot(lot);

      expect(prisma.pointsLot.create).toHaveBeenCalledWith({
        data: {
          customerId: 101,
          consumptionId: 141,
          initialPoints: 500,
          remainingPoints: 500,
          accreditedAt: lot.getAccreditedAt(),
          expiresAt: lot.getExpiresAt(),
          status: 'ACTIVE',
        },
      });
      expect(created.getId()).toBe(7);
    });
  });

  describe('updateLot()', () => {
    it('escribe remainingPoints, status y expiredAt', async () => {
      const prisma = fakePrisma();
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));
      const lot = toDomain(LOT_RECORD);
      lot.consume(500);

      await repo.updateLot(lot);

      expect(prisma.pointsLot.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { remainingPoints: 0, status: 'CONSUMED', expiredAt: null },
      });
    });

    it('lanza NotFoundException si el lote no tiene id', async () => {
      const repo = new PointsPrismaRepository(fakeTransactionRunner(fakePrisma()));
      const lot = PointsLot.create({
        customerId: 101,
        consumptionId: null,
        initialPoints: 100,
        accreditedAt: new Date(),
        expiresAt: new Date(),
      });

      await expect(repo.updateLot(lot)).rejects.toThrow(NotFoundException);
    });
  });

  describe('insertMovement()', () => {
    it('inserta el movimiento con los campos dados', async () => {
      const prisma = fakePrisma();
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));

      await repo.insertMovement({
        customerId: 101,
        type: 'CONSUMPTION_CREDIT',
        points: 500,
        balanceAfter: 500,
        consumptionId: 141,
        lotId: 7,
        performedByAccountId: 12,
        performedByName: 'Ana Pereyra',
      });

      expect(prisma.pointsMovement.create).toHaveBeenCalledWith({
        data: {
          customerId: 101,
          type: 'CONSUMPTION_CREDIT',
          points: 500,
          balanceAfter: 500,
          consumptionId: 141,
          lotId: 7,
          reason: null,
          performedByAccountId: 12,
          performedByName: 'Ana Pereyra',
        },
      });
    });
  });

  describe('findActiveLoyaltyConfiguration()', () => {
    it('devuelve los campos que necesita PointsService', async () => {
      const prisma = fakePrisma();
      (prisma.loyaltyProgramConfiguration.findFirst as jest.Mock).mockResolvedValue({
        pointsExpirationMonths: 12,
        silverMinPoints: 300,
        goldMinPoints: 800,
      });
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));

      const config = await repo.findActiveLoyaltyConfiguration();

      expect(prisma.loyaltyProgramConfiguration.findFirst).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(config).toEqual({ pointsExpirationMonths: 12, silverMinPoints: 300, goldMinPoints: 800 });
    });

    it('null si no hay ninguna configuración activa', async () => {
      const prisma = fakePrisma();
      (prisma.loyaltyProgramConfiguration.findFirst as jest.Mock).mockResolvedValue(null);
      const repo = new PointsPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.findActiveLoyaltyConfiguration()).toBeNull();
    });
  });
});
