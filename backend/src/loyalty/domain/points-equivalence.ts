import { DomainError } from './errors/domain.error.js';

export type PointsEquivalenceData = {
  baseAmount: number;
  pointsAwarded: number;
  updatedAt?: Date;
};

const MAX_BASE_AMOUNT = 9_999_999_999.99;
const MAX_POINTS = 2_147_483_647;

export class PointsEquivalence {
  private constructor(
    private readonly _baseAmount: number,
    private readonly _pointsAwarded: number,
    private readonly _updatedAt: Date,
  ) {}

  static define(data: PointsEquivalenceData): PointsEquivalence {
    if (
      !Number.isFinite(data.baseAmount) ||
      data.baseAmount <= 0 ||
      data.baseAmount > MAX_BASE_AMOUNT ||
      Math.round(data.baseAmount * 100) / 100 !== data.baseAmount
    ) {
      throw new DomainError(
        `Base amount must be greater than 0, have no more than 2 decimal places, and be no greater than ${MAX_BASE_AMOUNT}`,
        'baseAmount',
      );
    }

    if (
      !Number.isInteger(data.pointsAwarded) ||
      data.pointsAwarded <= 0 ||
      data.pointsAwarded > MAX_POINTS
    ) {
      throw new DomainError(
        `Points awarded must be a positive integer no greater than ${MAX_POINTS}`,
        'pointsAwarded',
      );
    }

    return new PointsEquivalence(
      data.baseAmount,
      data.pointsAwarded,
      data.updatedAt ?? new Date(),
    );
  }

  static reconstruct(data: PointsEquivalenceData): PointsEquivalence {
    return new PointsEquivalence(
      data.baseAmount,
      data.pointsAwarded,
      data.updatedAt ?? new Date(),
    );
  }

  getBaseAmount(): number {
    return this._baseAmount;
  }

  getPointsAwarded(): number {
    return this._pointsAwarded;
  }

  getUpdatedAt(): Date {
    return this._updatedAt;
  }
}
