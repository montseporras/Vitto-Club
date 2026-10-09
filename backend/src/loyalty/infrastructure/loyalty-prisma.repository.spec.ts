import { PrismaService } from '../../prisma/prisma.service.js';
import { PointsEquivalence } from '../domain/points-equivalence.js';
import { LoyaltyPrismaRepository } from './loyalty-prisma.repository.js';

describe('LoyaltyPrismaRepository', () => {
  const timestamp = new Date('2026-10-07T12:00:00.000Z');
  const activeRecord = {
    id: 1,
    version: 1,
    baseAmount: null,
    pointsAwarded: null,
    pointsExpirationMonths: 12,
    bonusType: null,
    bonusValue: null,
    isActive: true,
    validFrom: timestamp,
    validTo: null,
    createdAt: timestamp,
  };
  let transaction: {
    $queryRaw: jest.Mock;
    loyaltyProgramConfiguration: {
      findFirst: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let prisma: {
    $transaction: jest.Mock;
    loyaltyProgramConfiguration: { findFirst: jest.Mock };
  };
  let repository: LoyaltyPrismaRepository;

  beforeEach(() => {
    transaction = {
      $queryRaw: jest.fn(),
      loyaltyProgramConfiguration: {
        findFirst: jest.fn().mockResolvedValue(activeRecord),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn((query) =>
          Promise.resolve({
            ...activeRecord,
            ...query.data,
            baseAmount:
              query.data.baseAmount === null
                ? null
                : { toNumber: () => Number(query.data.baseAmount) },
            bonusValue:
              query.data.bonusValue === null
                ? null
                : { toNumber: () => Number(query.data.bonusValue) },
            id: 2,
            createdAt: timestamp,
          }),
        ),
      },
    };
    prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
      loyaltyProgramConfiguration: {
        findFirst: jest.fn().mockResolvedValue(activeRecord),
      },
    };
    repository = new LoyaltyPrismaRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('reads the active configuration snapshot', async () => {
    const result = await repository.getActiveConfig();

    expect(prisma.loyaltyProgramConfiguration.findFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });
    expect(result.getVersion()).toBe(1);
    expect(result.getPointsExpirationMonths()).toBe(12);
  });

  it('retains the points-validity default if no active snapshot exists', async () => {
    prisma.loyaltyProgramConfiguration.findFirst.mockResolvedValue(null);

    const validity = await repository.findCurrentPointsValidity();

    expect(validity.getPointsExpirationMonths()).toBe(12);
    expect(validity.getUpdatedAt()).toBeNull();
  });

  it('atomically versions a setting and carries every other current value forward', async () => {
    transaction.loyaltyProgramConfiguration.findFirst.mockResolvedValue({
      ...activeRecord,
      baseAmount: { toNumber: () => 1000 },
      pointsAwarded: 10,
      pointsExpirationMonths: 18,
      bonusType: 'PERCENTAGE',
      bonusValue: { toNumber: () => 15 },
    });

    const result = await repository.savePointsEquivalence(
      PointsEquivalence.define({ baseAmount: 996.5, pointsAwarded: 12 }),
    );

    expect(transaction.$queryRaw).toHaveBeenCalled();
    expect(transaction.loyaltyProgramConfiguration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { version: 1 },
        data: { isActive: false, validTo: expect.any(Date) },
      }),
    );
    expect(transaction.loyaltyProgramConfiguration.create).toHaveBeenCalledWith(
      {
        data: expect.objectContaining({
          version: 2,
          baseAmount: 996.5,
          pointsAwarded: 12,
          pointsExpirationMonths: 18,
          bonusType: 'PERCENTAGE',
          bonusValue: 15,
          isActive: true,
          validTo: null,
        }),
      },
    );
    expect(result.getBaseAmount()).toBe(996.5);
    expect(result.getPointsAwarded()).toBe(12);
  });

  it('creates the first version if no active version is present', async () => {
    transaction.loyaltyProgramConfiguration.findFirst.mockResolvedValue(null);
    const next = {
      ...activeRecord,
      version: 1,
      baseAmount: 500,
      pointsAwarded: 5,
    };

    const result = await repository.saveNewConfigVersion(next);

    expect(
      transaction.loyaltyProgramConfiguration.update,
    ).not.toHaveBeenCalled();
    expect(transaction.loyaltyProgramConfiguration.create).toHaveBeenCalledWith(
      {
        data: expect.objectContaining({ version: 1, isActive: true }),
      },
    );
    expect(result.getVersion()).toBe(1);
  });
});
