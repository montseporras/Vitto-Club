import {
  FirstConsumptionBonus,
  FirstConsumptionBonusType,
} from './first-consumption-bonus.js';
import { PointsEquivalence } from './points-equivalence.js';
import { PointsValidity } from './points-validity.js';
import { DomainError } from './errors/domain.error.js';
import {
  assertLevelThresholds,
  DEFAULT_GOLD_MIN_POINTS,
  DEFAULT_SILVER_MIN_POINTS,
} from './levels.js';

export type LoyaltyProgramConfigurationData = {
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
};

export type LoyaltyProgramConfigurationInput = {
  baseAmount: number;
  pointsAwarded: number;
  pointsExpirationMonths: number;
  bonusType: FirstConsumptionBonusType;
  bonusValue: number;
  // US-27: en el guardado completo son opcionales; si faltan se copian de la versión vigente
  silverMinPoints?: number;
  goldMinPoints?: number;
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
      FirstConsumptionBonus.define({
        bonusType: data.bonusType,
        bonusValue: data.bonusValue,
      });
    }

    assertLevelThresholds({
      silverMinPoints: data.silverMinPoints,
      goldMinPoints: data.goldMinPoints,
    });

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
    // US-27: cada versión nueva copia los umbrales vigentes si no vienen
    const silverMinPoints =
      input.silverMinPoints ??
      current?.getSilverMinPoints() ??
      DEFAULT_SILVER_MIN_POINTS;
    const goldMinPoints =
      input.goldMinPoints ?? current?.getGoldMinPoints() ?? DEFAULT_GOLD_MIN_POINTS;
    // Oro > Plata también cuando llega uno solo y el otro se copia de la versión vigente
    assertLevelThresholds({ silverMinPoints, goldMinPoints });

    return {
      version: (current?.getVersion() ?? 0) + 1,
      baseAmount,
      pointsAwarded,
      pointsExpirationMonths,
      bonusType,
      bonusValue,
      silverMinPoints,
      goldMinPoints,
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

  getBonusType(): FirstConsumptionBonusType | null {
    return this.data.bonusType;
  }

  getBonusValue(): number | null {
    return this.data.bonusValue;
  }

  getSilverMinPoints(): number {
    return this.data.silverMinPoints;
  }

  getGoldMinPoints(): number {
    return this.data.goldMinPoints;
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
