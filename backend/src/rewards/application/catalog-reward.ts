import type { CatalogEntry } from '../domain/catalog.js';
import type { RewardDisabledReason, RewardStatus } from '../domain/reward.js';

// US-39 (§3.5.1): una recompensa del catálogo del Cliente, con la forma del contrato. Sin
// confirmedCount (es solo del Administrador, §3.1) ni updatedAt (no está en el ejemplo de §3.5.1:
// decisión de Jazmín). Es lo que RewardsService le da a redemptions, que arma la respuesta.
export type CatalogReward = {
  id: number;
  name: string;
  description: string | null;
  points: number;
  stock: number | null;
  expiresAt: string | null;
  daysToExpire: number | null;
  status: RewardStatus;
  disabledReason: RewardDisabledReason | null;
  // Siempre null en el Sprint 4 (§3.3)
  photoUrl: null;
  usedCount: number;
};

export function toCatalogReward(entry: CatalogEntry): CatalogReward {
  const { reward } = entry;
  return {
    id: reward.getId(),
    name: reward.getName(),
    description: reward.getDescription(),
    points: reward.getPoints(),
    stock: reward.getStock(),
    expiresAt: reward.getExpiresAt(),
    daysToExpire: entry.daysToExpire,
    status: entry.status,
    disabledReason: entry.disabledReason,
    photoUrl: null,
    usedCount: reward.getUsedCount(),
  };
}
