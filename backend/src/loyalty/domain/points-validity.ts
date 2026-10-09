import { DomainError } from './errors/domain.error.js';

export const DEFAULT_POINTS_EXPIRATION_MONTHS = 12;
const MAX_POINTS_EXPIRATION_MONTHS = 2_147_483_647;

export type PointsValidityData = {
  pointsExpirationMonths?: number | null;
  updatedAt?: Date | null;
};

export class PointsValidity {
  private constructor(
    private readonly _pointsExpirationMonths: number,
    private readonly _updatedAt: Date | null,
  ) {}

  static define(data: PointsValidityData = {}): PointsValidity {
    const months =
      data.pointsExpirationMonths ?? DEFAULT_POINTS_EXPIRATION_MONTHS;
    if (
      !Number.isInteger(months) ||
      months <= 0 ||
      months > MAX_POINTS_EXPIRATION_MONTHS
    ) {
      throw new DomainError(
        `Points expiration months must be a positive integer no greater than ${MAX_POINTS_EXPIRATION_MONTHS}`,
        'pointsExpirationMonths',
      );
    }

    return new PointsValidity(months, data.updatedAt ?? null);
  }

  static reconstruct(data: PointsValidityData): PointsValidity {
    return new PointsValidity(
      data.pointsExpirationMonths ?? DEFAULT_POINTS_EXPIRATION_MONTHS,
      data.updatedAt ?? null,
    );
  }

  getPointsExpirationMonths(): number {
    return this._pointsExpirationMonths;
  }

  getUpdatedAt(): Date | null {
    return this._updatedAt;
  }
}
