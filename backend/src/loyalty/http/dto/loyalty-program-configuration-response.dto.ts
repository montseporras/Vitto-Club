import { FirstConsumptionBonusType } from '../../domain/first-consumption-bonus.js';
import { LoyaltyProgramConfiguration } from '../../domain/loyalty-program-configuration.js';

export class LoyaltyProgramConfigurationResponseDto {
  version: number;
  baseAmount: number | null;
  pointsAwarded: number | null;
  pointsExpirationMonths: number;
  bonusType: FirstConsumptionBonusType | null;
  bonusValue: number | null;
  silverMinPoints: number;
  goldMinPoints: number;
  isActive: boolean;
  validFrom: Date;
  validTo: Date | null;
  createdAt: Date;

  private constructor(configuration: LoyaltyProgramConfiguration) {
    this.version = configuration.getVersion();
    this.baseAmount = configuration.getBaseAmount();
    this.pointsAwarded = configuration.getPointsAwarded();
    this.pointsExpirationMonths = configuration.getPointsExpirationMonths();
    this.bonusType = configuration.getBonusType();
    this.bonusValue = configuration.getBonusValue();
    this.silverMinPoints = configuration.getSilverMinPoints();
    this.goldMinPoints = configuration.getGoldMinPoints();
    this.isActive = configuration.getIsActive();
    this.validFrom = configuration.getValidFrom();
    this.validTo = configuration.getValidTo();
    this.createdAt = configuration.getCreatedAt();
  }

  static fromDomain(
    configuration: LoyaltyProgramConfiguration,
  ): LoyaltyProgramConfigurationResponseDto {
    return new LoyaltyProgramConfigurationResponseDto(configuration);
  }
}
