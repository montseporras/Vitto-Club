import { daysToExpire } from '../../domain/new-reward.js';
import type { Reward, RewardDisabledReason, RewardStatus } from '../../domain/reward.js';

// Tipo Reward de §3.1, tal como lo recibe el Administrador (con confirmedCount)
export type RewardResponse = {
  id: number;
  name: string;
  description: string | null;
  points: number;
  stock: number | null;
  expiresAt: string | null;
  daysToExpire: number | null;
  status: RewardStatus;
  disabledReason: RewardDisabledReason | null;
  // Siempre null en el Sprint 4 (§3.3): la foto llega en el Sprint 5
  photoUrl: null;
  usedCount: number;
  confirmedCount: number;
  updatedAt: string;
};

// GET /recompensas/disponibles (§3.5.2): Reward[] sin confirmedCount, que es solo del Administrador
// (§3.1) y este endpoint también lo usa el Cajero.
export type AvailableRewardResponse = Omit<RewardResponse, 'confirmedCount'>;

export class RewardResponseDto {
  // `hoyArgentina` en YYYY-MM-DD, para daysToExpire
  static fromDomain(reward: Reward, confirmedCount: number, hoyArgentina: string): RewardResponse {
    return { ...RewardResponseDto.availableFromDomain(reward, hoyArgentina), confirmedCount };
  }

  static availableFromDomain(reward: Reward, hoyArgentina: string): AvailableRewardResponse {
    return {
      id: reward.getId(),
      name: reward.getName(),
      description: reward.getDescription(),
      points: reward.getPoints(),
      stock: reward.getStock(),
      expiresAt: reward.getExpiresAt(),
      daysToExpire: daysToExpire(reward.getExpiresAt(), hoyArgentina),
      status: reward.getStatus(),
      disabledReason: reward.getDisabledReason(),
      photoUrl: null,
      usedCount: reward.getUsedCount(),
      updatedAt: reward.getUpdatedAt().toISOString(),
    };
  }
}
