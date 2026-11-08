import { Reward } from '../../domain/reward.js';
import { toArgentinaDateString } from '../../../shared/time/argentina-date.js';

// §3.1. `confirmedCount` solo viaja en las respuestas del Administrador (US-34 a US-38), así que
// no está en este tipo.
export type RewardResponse = {
  id: number;
  name: string;
  description: string | null;
  points: number;
  stock: number | null;
  expiresAt: string | null;
  daysToExpire: number | null;
  status: string;
  disabledReason: string | null;
  // Siempre null en el Sprint 4: la foto es del Sprint 5 (§3.3)
  photoUrl: null;
  usedCount: number;
  updatedAt: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// expiresAt − hoy, en días y en hora de Argentina (negativo si ya venció). Las dos fechas son
// YYYY-MM-DD, así que se restan como medianoches UTC sin que influya la hora.
function daysUntil(expiresAt: string, now: Date): number {
  const today = toArgentinaDateString(now);
  return Math.round((Date.parse(`${expiresAt}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / MS_PER_DAY);
}

export function toRewardResponse(reward: Reward, now: Date = new Date()): RewardResponse {
  const expiresAt = reward.getExpiresAt();
  return {
    id: reward.getId(),
    name: reward.getName(),
    description: reward.getDescription(),
    points: reward.getPoints(),
    stock: reward.getStock(),
    expiresAt,
    daysToExpire: expiresAt === null ? null : daysUntil(expiresAt, now),
    status: reward.getStatus(),
    disabledReason: reward.getDisabledReason(),
    photoUrl: null,
    usedCount: reward.getUsedCount(),
    updatedAt: reward.getUpdatedAt().toISOString(),
  };
}
