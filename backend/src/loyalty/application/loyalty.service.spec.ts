import { NotFoundException } from '@nestjs/common';
import { LoyaltyConfigurationRepository } from '../domain/port/loyalty-configuration.repository.js';
import { PointsEquivalence } from '../domain/points-equivalence.js';
import { PointsValidity } from '../domain/points-validity.js';
import { FirstConsumptionBonus } from '../domain/first-consumption-bonus.js';
import { LoyaltyProgramConfiguration } from '../domain/loyalty-program-configuration.js';
import { LoyaltyService } from './loyalty.service.js';

describe('LoyaltyService', () => {
  let repository: {
    savePointsEquivalence: jest.Mock;
    findCurrentPointsEquivalence: jest.Mock;
    savePointsValidity: jest.Mock;
    findCurrentPointsValidity: jest.Mock;
    saveFirstConsumptionBonus: jest.Mock;
    findCurrentFirstConsumptionBonus: jest.Mock;
    getActiveConfig: jest.Mock;
    updateFullConfig: jest.Mock;
    saveLevels: jest.Mock;
  };
  let service: LoyaltyService;

  beforeEach(() => {
    repository = {
      savePointsEquivalence: jest.fn(),
      findCurrentPointsEquivalence: jest.fn(),
      savePointsValidity: jest.fn(),
      findCurrentPointsValidity: jest.fn(),
      saveFirstConsumptionBonus: jest.fn(),
      findCurrentFirstConsumptionBonus: jest.fn(),
      getActiveConfig: jest.fn(),
      updateFullConfig: jest.fn(),
      saveLevels: jest.fn(),
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

  it('validates and saves a first consumption bonus', async () => {
    const saved = FirstConsumptionBonus.define({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
    repository.saveFirstConsumptionBonus.mockResolvedValue(saved);

    const result = await service.setFirstConsumptionBonus({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });

    expect(repository.saveFirstConsumptionBonus).toHaveBeenCalledWith(
      expect.objectContaining({
        getBonusType: expect.any(Function),
        getBonusValue: expect.any(Function),
      }),
    );
    expect(result).toBe(saved);
  });

  it('does not persist an invalid first consumption bonus', async () => {
    await expect(
      service.setFirstConsumptionBonus({
        bonusType: 'PERCENTAGE',
        bonusValue: 101,
      }),
    ).rejects.toThrow('Percentage bonus must be between 1 and 100');

    expect(repository.saveFirstConsumptionBonus).not.toHaveBeenCalled();
  });

  it('returns the current first consumption bonus', async () => {
    const bonus = FirstConsumptionBonus.define({
      bonusType: 'FIXED_AMOUNT',
      bonusValue: 30,
    });
    repository.findCurrentFirstConsumptionBonus.mockResolvedValue(bonus);

    await expect(service.getCurrentFirstConsumptionBonus()).resolves.toBe(bonus);
  });

  it('returns not found if no first consumption bonus has been configured', async () => {
    repository.findCurrentFirstConsumptionBonus.mockResolvedValue(null);

    await expect(service.getCurrentFirstConsumptionBonus()).rejects.toThrow(
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
      silverMinPoints: 300,
      goldMinPoints: 800,
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

  describe('setLevels() — US-27', () => {
    it('valida y guarda los umbrales como una versión nueva', async () => {
      repository.saveLevels.mockResolvedValue('saved');

      await expect(
        service.setLevels({ silverMinPoints: 400, goldMinPoints: 900 }),
      ).resolves.toBe('saved');
      expect(repository.saveLevels).toHaveBeenCalledWith({
        silverMinPoints: 400,
        goldMinPoints: 900,
      });
    });

    it.each([
      [{ silverMinPoints: 0, goldMinPoints: 800 }, 'El umbral de Plata debe ser mayor que 0'],
      [{ silverMinPoints: 500, goldMinPoints: 500 }, 'El umbral de Oro debe ser mayor que el de Plata'],
    ])('rechaza %j sin guardar', async (thresholds, message) => {
      await expect(service.setLevels(thresholds)).rejects.toThrow(message);
      expect(repository.saveLevels).not.toHaveBeenCalled();
    });
  });
});
