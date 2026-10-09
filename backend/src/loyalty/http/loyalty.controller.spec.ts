import { LoyaltyService } from '../application/loyalty.service.js';
import { PointsEquivalence } from '../domain/points-equivalence.js';
import { LoyaltyController } from './loyalty.controller.js';

describe('LoyaltyController', () => {
  let service: {
    setPointsEquivalence: jest.Mock;
    getCurrentPointsEquivalence: jest.Mock;
  };
  let controller: LoyaltyController;
  const actor = { accountId: 1, role: 'ADMIN' as const, employeeId: 1 };
  const audit = {
    capture: jest.fn().mockImplementation(async (operation, createEntry) => {
      const result = await operation();
      createEntry(result);
      return result;
    }),
  };

  beforeEach(() => {
    service = {
      setPointsEquivalence: jest.fn(),
      getCurrentPointsEquivalence: jest.fn(),
    };
    controller = new LoyaltyController(
      service as unknown as LoyaltyService,
      audit as never,
    );
  });

  it('saves and returns the points equivalence contract', async () => {
    const configuration = PointsEquivalence.define({
      baseAmount: 996,
      pointsAwarded: 10,
    });
    service.setPointsEquivalence.mockResolvedValue(configuration);

    const result = await controller.set(
      { baseAmount: 996, pointsAwarded: 10 },
      actor,
    );

    expect(service.setPointsEquivalence).toHaveBeenCalledWith({
      baseAmount: 996,
      pointsAwarded: 10,
    });
    expect(result).toMatchObject({ baseAmount: 996, pointsAwarded: 10 });
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('returns the current points equivalence', async () => {
    const configuration = PointsEquivalence.define({
      baseAmount: 1000,
      pointsAwarded: 10,
    });
    service.getCurrentPointsEquivalence.mockResolvedValue(configuration);

    await expect(controller.getCurrent()).resolves.toMatchObject({
      baseAmount: 1000,
      pointsAwarded: 10,
    });
  });
});
