import { Injectable, NotFoundException } from '@nestjs/common';
import { PointsEquivalence } from '../domain/points-equivalence.js';
import { LoyaltyConfigurationRepository } from '../domain/port/loyalty-configuration.repository.js';
import {
  PointsValidity,
  PointsValidityData,
} from '../domain/points-validity.js';
import {
  FirstConsumptionBonus,
  FirstConsumptionBonusData,
} from '../domain/first-consumption-bonus.js';
import {
  LoyaltyProgramConfiguration,
  LoyaltyProgramConfigurationInput,
} from '../domain/loyalty-program-configuration.js';
import { assertLevelThresholds, LevelThresholds } from '../domain/levels.js';

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly loyaltyRepository: LoyaltyConfigurationRepository,
  ) {}

  async setPointsEquivalence(data: {
    baseAmount: number;
    pointsAwarded: number;
  }): Promise<PointsEquivalence> {
    const configuration = PointsEquivalence.define(data);
    return await this.loyaltyRepository.savePointsEquivalence(configuration);
  }

  async getCurrentPointsEquivalence(): Promise<PointsEquivalence> {
    const configuration =
      await this.loyaltyRepository.findCurrentPointsEquivalence();
    if (!configuration) {
      throw new NotFoundException('Points equivalence has not been configured');
    }
    return configuration;
  }

  async setPointsValidity(data: PointsValidityData): Promise<PointsValidity> {
    const validity = PointsValidity.define(data);
    return await this.loyaltyRepository.savePointsValidity(validity);
  }

  async getCurrentPointsValidity(): Promise<PointsValidity> {
    return await this.loyaltyRepository.findCurrentPointsValidity();
  }

  async setFirstConsumptionBonus(
    data: FirstConsumptionBonusData,
  ): Promise<FirstConsumptionBonus> {
    const bonus = FirstConsumptionBonus.define(data);
    return await this.loyaltyRepository.saveFirstConsumptionBonus(bonus);
  }

  async getCurrentFirstConsumptionBonus(): Promise<FirstConsumptionBonus> {
    const bonus = await this.loyaltyRepository.findCurrentFirstConsumptionBonus();
    if (!bonus) {
      throw new NotFoundException(
        'First consumption bonus has not been configured',
      );
    }
    return bonus;
  }

  // US-27 (§3.7.2): versión nueva con los umbrales, copiando el resto de los valores
  async setLevels(
    thresholds: LevelThresholds,
  ): Promise<LoyaltyProgramConfiguration> {
    assertLevelThresholds(thresholds);
    return await this.loyaltyRepository.saveLevels(thresholds);
  }

  async getActiveConfiguration(): Promise<LoyaltyProgramConfiguration> {
    return await this.loyaltyRepository.getActiveConfig();
  }

  async updateConfiguration(
    data: LoyaltyProgramConfigurationInput,
  ): Promise<LoyaltyProgramConfiguration> {
    PointsEquivalence.define({
      baseAmount: data.baseAmount,
      pointsAwarded: data.pointsAwarded,
    });
    PointsValidity.define({
      pointsExpirationMonths: data.pointsExpirationMonths,
    });
    FirstConsumptionBonus.define({
      bonusType: data.bonusType,
      bonusValue: data.bonusValue,
    });
    return await this.loyaltyRepository.updateFullConfig(data);
  }
}
