import { LoyaltyService } from '../application/loyalty.service.js';
import { FirstPurchaseBonus } from '../domain/first-purchase-bonus.js';
import { FirstPurchaseBonusController } from './first-purchase-bonus.controller.js';

describe('FirstPurchaseBonusController', () => {
  let service: {
    setFirstPurchaseBonus: jest.Mock;
    getCurrentFirstPurchaseBonus: jest.Mock;
  };
  let controller: FirstPurchaseBonusController;
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
      setFirstPurchaseBonus: jest.fn(),
      getCurrentFirstPurchaseBonus: jest.fn(),
    };
    controller = new FirstPurchaseBonusController(
      service as unknown as LoyaltyService,
      audit as never,
    );
  });

  it('saves a percentage bonus and returns its response DTO', async () => {
    const bonus = FirstPurchaseBonus.define({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
    service.setFirstPurchaseBonus.mockResolvedValue(bonus);

    const response = await controller.set(
      {
        bonusType: 'PERCENTAGE',
        bonusValue: 15,
      },
      actor,
    );

    expect(service.setFirstPurchaseBonus).toHaveBeenCalledWith({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
    expect(response).toMatchObject({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
  });

  it('returns the current fixed bonus', async () => {
    service.getCurrentFirstPurchaseBonus.mockResolvedValue(
      FirstPurchaseBonus.define({
        bonusType: 'FIXED_AMOUNT',
        bonusValue: 30,
      }),
    );

    await expect(controller.getCurrent()).resolves.toMatchObject({
      bonusType: 'FIXED_AMOUNT',
      bonusValue: 30,
    });
  });
});
