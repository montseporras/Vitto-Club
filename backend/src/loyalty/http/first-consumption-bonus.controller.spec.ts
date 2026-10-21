import { LoyaltyService } from '../application/loyalty.service.js';
import { FirstConsumptionBonus } from '../domain/first-consumption-bonus.js';
import { FirstConsumptionBonusController } from './first-consumption-bonus.controller.js';

describe('FirstConsumptionBonusController', () => {
  let service: {
    setFirstConsumptionBonus: jest.Mock;
    getCurrentFirstConsumptionBonus: jest.Mock;
  };
  let controller: FirstConsumptionBonusController;

  beforeEach(() => {
    service = {
      setFirstConsumptionBonus: jest.fn(),
      getCurrentFirstConsumptionBonus: jest.fn(),
    };
    controller = new FirstConsumptionBonusController(
      service as unknown as LoyaltyService,
    );
  });

  it('saves a percentage bonus and returns its response DTO', async () => {
    const bonus = FirstConsumptionBonus.define({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
    service.setFirstConsumptionBonus.mockResolvedValue(bonus);

    const response = await controller.set({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });

    expect(service.setFirstConsumptionBonus).toHaveBeenCalledWith({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
    expect(response).toMatchObject({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
  });

  it('returns the current fixed bonus', async () => {
    service.getCurrentFirstConsumptionBonus.mockResolvedValue(
      FirstConsumptionBonus.define({
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
