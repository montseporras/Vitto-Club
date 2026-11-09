import { daysToExpire } from './new-reward.js';
import type { Reward, RewardDisabledReason, RewardStatus } from './reward.js';

// US-39 (contrato S4 §2.5 y §3.5.1): qué recompensas ve el Cliente en el catálogo y en qué orden.

export const CATALOG_FILTERS = ['ALL', 'MOST_REDEEMED', 'EXPIRING_SOON'] as const;
export type CatalogFilter = (typeof CATALOG_FILTERS)[number];

// "Próx. a vencer": las que vencen en 7 días o menos (0 ≤ daysToExpire ≤ 7)
const EXPIRING_SOON_DAYS = 7;

// Una recompensa tal como la ve el Cliente: el estado puede no ser el guardado (ver catalogView)
export type CatalogEntry = {
  reward: Reward;
  status: RewardStatus;
  disabledReason: RewardDisabledReason | null;
  daysToExpire: number | null;
};

// §3.5.1: una ACTIVE que ya venció se muestra DISABLED / EXPIRED aunque el proceso diario todavía no
// la haya marcado. `hoyArgentina` en YYYY-MM-DD.
export function catalogView(reward: Reward, hoyArgentina: string): CatalogEntry {
  const days = daysToExpire(reward.getExpiresAt(), hoyArgentina);
  const expiredButActive = reward.getStatus() === 'ACTIVE' && days !== null && days < 0;
  return {
    reward,
    status: expiredButActive ? 'DISABLED' : reward.getStatus(),
    disabledReason: expiredButActive ? 'EXPIRED' : reward.getDisabledReason(),
    daysToExpire: days,
  };
}

const byName = (a: CatalogEntry, b: CatalogEntry) => a.reward.getName().localeCompare(b.reward.getName(), 'es');
const byPoints = (a: CatalogEntry, b: CatalogEntry) => a.reward.getPoints() - b.reward.getPoints() || byName(a, b);

// §2.5. Desempates que el contrato no dice (decisión de Jazmín): puntos ascendentes y después nombre,
// igual que "Todas".
const ORDER: Record<CatalogFilter, (a: CatalogEntry, b: CatalogEntry) => number> = {
  ALL: byPoints,
  MOST_REDEEMED: (a, b) => b.reward.getUsedCount() - a.reward.getUsedCount() || byPoints(a, b),
  EXPIRING_SOON: (a, b) =>
    (a.reward.getExpiresAt() ?? '').localeCompare(b.reward.getExpiresAt() ?? '') || byPoints(a, b),
};

// Nunca INACTIVE ni DELETED (§3.5.1). "Todas" y "Más canjeadas": Activas y Deshabilitadas. "Próx. a
// vencer": solo las Activas (ya con la fecha mirada) que vencen en 7 días o menos.
export function buildCatalog(rewards: Reward[], filter: CatalogFilter, hoyArgentina: string): CatalogEntry[] {
  return rewards
    .map((reward) => catalogView(reward, hoyArgentina))
    .filter((entry) => entry.status === 'ACTIVE' || entry.status === 'DISABLED')
    .filter(
      (entry) =>
        filter !== 'EXPIRING_SOON' ||
        (entry.status === 'ACTIVE' &&
          entry.daysToExpire !== null &&
          entry.daysToExpire >= 0 &&
          entry.daysToExpire <= EXPIRING_SOON_DAYS),
    )
    .sort(ORDER[filter]);
}
