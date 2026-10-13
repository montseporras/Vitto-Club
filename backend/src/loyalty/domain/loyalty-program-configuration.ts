import {
  FirstPurchaseBonus,
  FirstPurchaseBonusType,
} from './first-purchase-bonus.js';
import { PointsEquivalence } from './points-equivalence.js';
import { PointsValidity } from './points-validity.js';
import { DomainError } from './errors/domain.error.js';

export type LoyaltyProgramConfigurationData = {
  version: number;
  baseAmount: number | null;
  pointsAwarded: number | null;
  pointsExpirationMonths: number;
  bonusType: FirstPurchaseBonusType | null;
  bonusValue: number | null;
  isActive: boolean;
  validFrom: Date;
  validTo: Date | null;
  createdAt: Date;
};

export type LoyaltyProgramConfigurationInput = {
  baseAmount: number;
  pointsAwarded: number;
  pointsExpirationMonths: number;
  bonusType: FirstPurchaseBonusType;
  bonusValue: number;
};

export class LoyaltyProgramConfiguration {
  private constructor(private readonly data: LoyaltyProgramConfigurationData) {}

  static define(
    data: LoyaltyProgramConfigurationData,
  ): LoyaltyProgramConfiguration {
    if (!Number.isInteger(data.version) || data.version < 1) {
      throw new DomainError(
        'Configuration version must be a positive integer',
        'version',
      );
    }

    if ((data.baseAmount === null) !== (data.pointsAwarded === null)) {
      throw new DomainError(
        'Base amount and points awarded must both be configured or both be empty',
        'baseAmount',
      );
    }
    if (data.baseAmount !== null && data.pointsAwarded !== null) {
      PointsEquivalence.define({
        baseAmount: data.baseAmount,
        pointsAwarded: data.pointsAwarded,
      });
    }

    PointsValidity.define({
      pointsExpirationMonths: data.pointsExpirationMonths,
    });

    if ((data.bonusType === null) !== (data.bonusValue === null)) {
      throw new DomainError(
        'Bonus type and value must both be configured or empty',
        'bonusType',
      );
    }
    if (data.bonusType !== null && data.bonusValue !== null) {
      FirstPurchaseBonus.define({
        bonusType: data.bonusType,
        bonusValue: data.bonusValue,
      });
    }

    return new LoyaltyProgramConfiguration(data);
  }

  static createNextVersion(
    current: LoyaltyProgramConfiguration | null,
    input: Partial<LoyaltyProgramConfigurationInput>,
  ): LoyaltyProgramConfigurationData {
    const baseAmount = input.baseAmount ?? current?.getBaseAmount() ?? null;
    const pointsAwarded =
      input.pointsAwarded ?? current?.getPointsAwarded() ?? null;
    const pointsExpirationMonths =
      input.pointsExpirationMonths ??
      current?.getPointsExpirationMonths() ??
      12;
    const bonusType = input.bonusType ?? current?.getBonusType() ?? null;
    const bonusValue = input.bonusValue ?? current?.getBonusValue() ?? null;

    return {
      version: (current?.getVersion() ?? 0) + 1,
      baseAmount,
      pointsAwarded,
      pointsExpirationMonths,
      bonusType,
      bonusValue,
      isActive: true,
      validFrom: new Date(),
      validTo: null,
      createdAt: new Date(),
    };
  }

  getVersion(): number {
    return this.data.version;
  }

  getBaseAmount(): number | null {
    return this.data.baseAmount;
  }

  getPointsAwarded(): number | null {
    return this.data.pointsAwarded;
  }

  getPointsExpirationMonths(): number {
    return this.data.pointsExpirationMonths;
  }

  getBonusType(): FirstPurchaseBonusType | null {
    return this.data.bonusType;
  }

  getBonusValue(): number | null {
    return this.data.bonusValue;
  }

  getIsActive(): boolean {
    return this.data.isActive;
  }

  getValidFrom(): Date {
    return this.data.validFrom;
  }

  getValidTo(): Date | null {
    return this.data.validTo;
  }

  getCreatedAt(): Date {
    return this.data.createdAt;
  }
}
