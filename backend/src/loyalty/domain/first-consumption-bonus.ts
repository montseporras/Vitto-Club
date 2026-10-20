import { DomainError } from './errors/domain.error.js';

export const FIRST_PURCHASE_BONUS_TYPES = [
  'PERCENTAGE',
  'FIXED_AMOUNT',
] as const;
export type FirstPurchaseBonusType =
  (typeof FIRST_PURCHASE_BONUS_TYPES)[number];

export type FirstPurchaseBonusData = {
  bonusType: FirstPurchaseBonusType;
  bonusValue: number;
  updatedAt?: Date;
};

const MIN_PERCENTAGE = 1;
const MAX_PERCENTAGE = 100;
const MAX_FIXED_POINTS = 10_000;

export class FirstPurchaseBonus {
  private constructor(
    private readonly _bonusType: FirstPurchaseBonusType,
    private readonly _bonusValue: number,
    private readonly _updatedAt: Date,
  ) {}

  static define(data: FirstPurchaseBonusData): FirstPurchaseBonus {
    if (!FIRST_PURCHASE_BONUS_TYPES.includes(data.bonusType)) {
      throw new DomainError(
        `Bonus type must be one of: ${FIRST_PURCHASE_BONUS_TYPES.join(', ')}`,
        'bonusType',
      );
    }

    if (
      !Number.isFinite(data.bonusValue) ||
      Math.round(data.bonusValue * 100) / 100 !== data.bonusValue
    ) {
      throw new DomainError(
        'Bonus value must be a finite number with no more than 2 decimal places',
        'bonusValue',
      );
    }

    if (data.bonusType === 'PERCENTAGE') {
      if (
        data.bonusValue < MIN_PERCENTAGE ||
        data.bonusValue > MAX_PERCENTAGE
      ) {
        throw new DomainError(
          `Percentage bonus must be between ${MIN_PERCENTAGE} and ${MAX_PERCENTAGE}`,
          'bonusValue',
        );
      }
    } else if (
      !Number.isInteger(data.bonusValue) ||
      data.bonusValue < 1 ||
      data.bonusValue > MAX_FIXED_POINTS
    ) {
      throw new DomainError(
        `Fixed points bonus must be an integer between 1 and ${MAX_FIXED_POINTS}`,
        'bonusValue',
      );
    }

    return new FirstPurchaseBonus(
      data.bonusType,
      data.bonusValue,
      data.updatedAt ?? new Date(),
    );
  }

  static reconstruct(data: FirstPurchaseBonusData): FirstPurchaseBonus {
    return new FirstPurchaseBonus(
      data.bonusType,
      data.bonusValue,
      data.updatedAt ?? new Date(),
    );
  }

  getBonusType(): FirstPurchaseBonusType {
    return this._bonusType;
  }

  getBonusValue(): number {
    return this._bonusValue;
  }

  getUpdatedAt(): Date {
    return this._updatedAt;
  }
}
