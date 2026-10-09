import { PointsValidity } from '../../domain/points-validity.js';

export class PointsValidityResponseDto {
  pointsExpirationMonths: number;
  updatedAt: Date | null;

  private constructor(validity: PointsValidity) {
    this.pointsExpirationMonths = validity.getPointsExpirationMonths();
    this.updatedAt = validity.getUpdatedAt();
  }

  static fromDomain(validity: PointsValidity): PointsValidityResponseDto {
    return new PointsValidityResponseDto(validity);
  }
}
