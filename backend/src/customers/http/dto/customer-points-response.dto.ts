import type { PointsSummary } from '../../../points/application/points.service.js';
import type { Level } from '../../../points/domain/level.js';

// Forma exacta de §3.4.1. La usan GET /customers/:id/puntos y GET /customers/me/puntos (§3.10.1).
export class CustomerPointsResponseDto {
  customerId!: number;
  balance!: number;
  negativeBalance!: boolean;
  lifetimePoints!: number;
  level!: {
    current: Level;
    next: Level | null;
    currentMinPoints: number;
    nextMinPoints: number | null;
    pointsToNext: number;
    progressPercent: number;
  };
  nextExpirations!: { points: number; expiresAt: string }[];

  static fromSummary(summary: PointsSummary): CustomerPointsResponseDto {
    const dto = new CustomerPointsResponseDto();
    dto.customerId = summary.customerId;
    dto.balance = summary.balance;
    dto.negativeBalance = summary.negativeBalance;
    dto.lifetimePoints = summary.lifetimePoints;
    dto.level = {
      current: summary.level.current,
      next: summary.level.next,
      currentMinPoints: summary.level.currentMinPoints,
      nextMinPoints: summary.level.nextMinPoints,
      pointsToNext: summary.level.pointsToNext,
      progressPercent: summary.level.progressPercent,
    };
    dto.nextExpirations = summary.nextExpirations.map((expiration) => ({
      points: expiration.points,
      expiresAt: expiration.expiresAt,
    }));
    return dto;
  }
}
