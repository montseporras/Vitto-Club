import type { Reward, RewardDisabledReason } from './reward.js';

// US-37 (contrato S4 §3.4): reglas puras de la disponibilidad automática. Las aplica
// RewardsAvailabilityService.reevaluarDisponibilidad (y la usan US-35, US-36 y US-42).

const ARGENTINA_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type RewardReevaluationView = Pick<Reward, 'getStatus' | 'getStock' | 'getExpiresAt' | 'getDisabledReason'>;

// Por qué una recompensa no está disponible, mirando solo stock y fecha (no el estado). null si las
// dos están bien. Si fallan las dos, gana "vencida": es la primera condición que falla (decisión de
// Melisa). US-36 la usa al activar una que no está disponible (§3.2.5, "con su motivo").
export function motivoNoDisponible(
  reward: Pick<Reward, 'getStock' | 'getExpiresAt'>,
  hoyArgentina: string,
): RewardDisabledReason | null {
  if (!ARGENTINA_DATE_PATTERN.test(hoyArgentina)) {
    throw new Error(`hoyArgentina must be YYYY-MM-DD (got "${hoyArgentina}")`);
  }
  const expiresAt = reward.getExpiresAt();
  if (expiresAt !== null && expiresAt < hoyArgentina) return 'EXPIRED';
  const stock = reward.getStock();
  if (stock !== null && stock <= 0) return 'OUT_OF_STOCK';
  return null;
}

// El cambio que corresponde:
// - DISABLED: una ACTIVE que dejó de estar disponible (motivo nuevo).
// - ENABLED: una DISABLED que volvió a estar disponible (con el motivo que tenía, para la auditoría).
// - REASON_CHANGED: una DISABLED que sigue sin estar disponible, pero por otro motivo (por ejemplo,
//   "Agotada" que además venció). Se actualiza y se audita REWARD_DISABLED con el motivo nuevo
//   (decisión de Melisa, opción i).
// - null: no cambia nada. INACTIVE y DELETED nunca cambian (§3.2.4: "INACTIVE no cambia de estado").
export type RewardReevaluation =
  | { kind: 'DISABLED'; reason: RewardDisabledReason }
  | { kind: 'ENABLED'; previousReason: RewardDisabledReason }
  | { kind: 'REASON_CHANGED'; reason: RewardDisabledReason }
  | null;

export function reevaluar(reward: RewardReevaluationView, hoyArgentina: string): RewardReevaluation {
  const status = reward.getStatus();
  if (status !== 'ACTIVE' && status !== 'DISABLED') return null;

  const reason = motivoNoDisponible(reward, hoyArgentina);
  if (status === 'ACTIVE') {
    return reason ? { kind: 'DISABLED', reason } : null;
  }

  const current = reward.getDisabledReason();
  if (!reason) {
    // Un DISABLED siempre tiene motivo (CHECK de la base); OUT_OF_STOCK por si llega uno sin motivo
    return { kind: 'ENABLED', previousReason: current ?? 'OUT_OF_STOCK' };
  }
  return reason === current ? null : { kind: 'REASON_CHANGED', reason };
}
