import { NotFoundException } from '@nestjs/common';
import { LoyaltyConfigurationRepository } from '../domain/port/loyalty-configuration.repository.js';
import { PointsEquivalence } from '../domain/points-equivalence.js';
import { PointsValidity } from '../domain/points-validity.js';
import { FirstPurchaseBonus } from '../domain/first-purchase-bonus.js';
import { LoyaltyProgramConfiguration } from '../domain/loyalty-program-configuration.js';
import { LoyaltyService } from './loyalty.service.js';

describe('LoyaltyService', () => {
  let repository: {
    savePointsEquivalence: jest.Mock;
    findCurrentPointsEquivalence: jest.Mock;
    savePointsValidity: jest.Mock;
    findCurrentPointsValidity: jest.Mock;
    saveFirstPurchaseBonus: jest.Mock;
    findCurrentFirstPurchaseBonus: jest.Mock;
    getActiveConfig: jest.Mock;
    updateFullConfig: jest.Mock;
  };
  let service: LoyaltyService;

  beforeEach(() => {
    repository = {
      savePointsEquivalence: jest.fn(),
      findCurrentPointsEquivalence: jest.fn(),
      savePointsValidity: jest.fn(),
      findCurrentPointsValidity: jest.fn(),
      saveFirstPurchaseBonus: jest.fn(),
      findCurrentFirstPurchaseBonus: jest.fn(),
      getActiveConfig: jest.fn(),
      updateFullConfig: jest.fn(),
    };
    service = new LoyaltyService(
      repository as unknown as LoyaltyConfigurationRepository,
    );
  });

  it('validates and saves the configured equivalence', async () => {
    const saved = PointsEquivalence.define({
      baseAmount: 996,
      pointsAwarded: 10,
    });
    repository.savePointsEquivalence.mockResolvedValue(saved);

    const result = await service.setPointsEquivalence({
      baseAmount: 996,
      pointsAwarded: 10,
    });

    expect(repository.savePointsEquivalence).toHaveBeenCalledWith(
      expect.objectContaining({
        getBaseAmount: expect.any(Function),
        getPointsAwarded: expect.any(Function),
      }),
    );
    expect(result).toBe(saved);
  });

  it('rejects invalid input without attempting persistence', async () => {
    await expect(
      service.setPointsEquivalence({ baseAmount: 0, pointsAwarded: 10 }),
    ).rejects.toThrow('Base amount must be greater than 0');
    expect(repository.savePointsEquivalence).not.toHaveBeenCalled();
  });

  it('returns the current equivalence', async () => {
    const current = PointsEquivalence.define({
      baseAmount: 1000,
      pointsAwarded: 10,
    });
    repository.findCurrentPointsEquivalence.mockResolvedValue(current);

    await expect(service.getCurrentPointsEquivalence()).resolves.toBe(current);
  });

  it('reports when no equivalence has been configured yet', async () => {
    repository.findCurrentPointsEquivalence.mockResolvedValue(null);

    await expect(service.getCurrentPointsEquivalence()).rejects.toThrow(
      NotFoundException,
    );
  });

  it('saves a custom points validity', async () => {
    const saved = PointsValidity.define({ pointsExpirationMonths: 18 });
    repository.savePointsValidity.mockResolvedValue(saved);

    const result = await service.setPointsValidity({
      pointsExpirationMonths: 18,
    });

    expect(repository.savePointsValidity).toHaveBeenCalledWith(
      expect.objectContaining({
        getPointsExpirationMonths: expect.any(Function),
      }),
    );
    expect(result.getPointsExpirationMonths()).toBe(18);
  });

  it('applies and saves the 12-month default when no value is supplied', async () => {
    repository.savePointsValidity.mockImplementation(async (value) => value);

    const result = await service.setPointsValidity({});

    expect(result.getPointsExpirationMonths()).toBe(12);
    expect(repository.savePointsValidity).toHaveBeenCalledWith(
      expect.objectContaining({
        getPointsExpirationMonths: expect.any(Function),
      }),
    );
  });

  it('rejects invalid validity without attempting persistence', async () => {
    await expect(
      service.setPointsValidity({ pointsExpirationMonths: -2 }),
    ).rejects.toThrow('Points expiration months must be a positive integer');
    expect(repository.savePointsValidity).not.toHaveBeenCalled();
  });

  it('returns the current or default points validity from the repository', async () => {
    const current = PointsValidity.define({ pointsExpirationMonths: 18 });
    repository.findCurrentPointsValidity.mockResolvedValue(current);

    await expect(service.getCurrentPointsValidity()).resolves.toBe(current);
  });

  it('validates and saves a first purchase bonus', async () => {
    const saved = FirstPurchaseBonus.define({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
    repository.saveFirstPurchaseBonus.mockResolvedValue(saved);

    const result = await service.setFirstPurchaseBonus({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });

    expect(repository.saveFirstPurchaseBonus).toHaveBeenCalledWith(
      expect.objectContaining({
        getBonusType: expect.any(Function),
        getBonusValue: expect.any(Function),
      }),
    );
    expect(result).toBe(saved);
  });

  it('does not persist an invalid first purchase bonus', async () => {
    await expect(
      service.setFirstPurchaseBonus({
        bonusType: 'PERCENTAGE',
        bonusValue: 101,
      }),
    ).rejects.toThrow('Percentage bonus must be between 1 and 100');

    expect(repository.saveFirstPurchaseBonus).not.toHaveBeenCalled();
  });

  it('returns the current first purchase bonus', async () => {
    const bonus = FirstPurchaseBonus.define({
      bonusType: 'FIXED_AMOUNT',
      bonusValue: 30,
    });
    repository.findCurrentFirstPurchaseBonus.mockResolvedValue(bonus);

    await expect(service.getCurrentFirstPurchaseBonus()).resolves.toBe(bonus);
  });

  it('returns not found if no first purchase bonus has been configured', async () => {
    repository.findCurrentFirstPurchaseBonus.mockResolvedValue(null);

    await expect(service.getCurrentFirstPurchaseBonus()).rejects.toThrow(
      NotFoundException,
    );
  });

  it('validates and stores all configuration fields as one version', async () => {
    const configuration = LoyaltyProgramConfiguration.define({
      version: 2,
      baseAmount: 500,
      pointsAwarded: 5,
      pointsExpirationMonths: 18,
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
      isActive: true,
      validFrom: new Date(),
      validTo: null,
      createdAt: new Date(),
    });
    repository.updateFullConfig.mockResolvedValue(configuration);
    const input = {
      baseAmount: 500,
      pointsAwarded: 5,
      pointsExpirationMonths: 18,
      bonusType: 'PERCENTAGE' as const,
      bonusValue: 15,
    };

    await expect(service.updateConfiguration(input)).resolves.toBe(
      configuration,
    );
    expect(repository.updateFullConfig).toHaveBeenCalledWith(input);
  });

  it('does not persist a full configuration containing invalid business data', async () => {
    await expect(
      service.updateConfiguration({
        baseAmount: 500,
        pointsAwarded: 5,
        pointsExpirationMonths: 18,
        bonusType: 'PERCENTAGE',
        bonusValue: 101,
      }),
    ).rejects.toThrow('Percentage bonus must be between 1 and 100');
    expect(repository.updateFullConfig).not.toHaveBeenCalled();
  });
});
