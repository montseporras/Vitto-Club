import { PointsEquivalence } from '../../domain/points-equivalence.js';

export class PointsEquivalenceResponseDto {
  baseAmount: number;
  pointsAwarded: number;
  updatedAt: Date;

  private constructor(configuration: PointsEquivalence) {
    this.baseAmount = configuration.getBaseAmount();
    this.pointsAwarded = configuration.getPointsAwarded();
    this.updatedAt = configuration.getUpdatedAt();
  }

  static fromDomain(
    configuration: PointsEquivalence,
  ): PointsEquivalenceResponseDto {
    return new PointsEquivalenceResponseDto(configuration);
  }
}
