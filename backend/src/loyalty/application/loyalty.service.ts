import { Injectable, NotFoundException } from '@nestjs/common';
import { PointsEquivalence } from '../domain/points-equivalence.js';
import { LoyaltyConfigurationRepository } from '../domain/port/loyalty-configuration.repository.js';
import {
  PointsValidity,
  PointsValidityData,
} from '../domain/points-validity.js';
import {
  FirstPurchaseBonus,
  FirstPurchaseBonusData,
} from '../domain/first-purchase-bonus.js';
import {
  LoyaltyProgramConfiguration,
  LoyaltyProgramConfigurationInput,
} from '../domain/loyalty-program-configuration.js';

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

  async setFirstPurchaseBonus(
    data: FirstPurchaseBonusData,
  ): Promise<FirstPurchaseBonus> {
    const bonus = FirstPurchaseBonus.define(data);
    return await this.loyaltyRepository.saveFirstPurchaseBonus(bonus);
  }

  async getCurrentFirstPurchaseBonus(): Promise<FirstPurchaseBonus> {
    const bonus = await this.loyaltyRepository.findCurrentFirstPurchaseBonus();
    if (!bonus) {
      throw new NotFoundException(
        'First purchase bonus has not been configured',
      );
    }
    return bonus;
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
    FirstPurchaseBonus.define({
      bonusType: data.bonusType,
      bonusValue: data.bonusValue,
    });
    return await this.loyaltyRepository.updateFullConfig(data);
  }
}
