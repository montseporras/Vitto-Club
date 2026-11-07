import type { Reward } from './reward.js';

const ARGENTINA_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Lo único que mira la disponibilidad. Una Reward lo cumple.
export type RewardAvailabilityView = Pick<Reward, 'getStatus' | 'getStock' | 'getExpiresAt'>;

// BASE-4 (CA-B4.4, contrato S4 §3.1, "Disponible"): la usan US-35, US-37, US-39, US-40 y US-42.
// Disponible = status ACTIVE, stock null (sin límite) o > 0, y expiresAt null (no vence) o
// >= hoy. Se calcula con la fecha y no solo con el estado: entre las 00:00 y la corrida del
// proceso diario una recompensa puede seguir ACTIVE con la fecha vencida, y ya no está
// disponible.
// hoyArgentina va en YYYY-MM-DD (toArgentinaDateString de src/shared/time). Las dos fechas
// tienen el mismo formato, así que se comparan como texto.
export function estaDisponible(reward: RewardAvailabilityView, hoyArgentina: string): boolean {
  if (!ARGENTINA_DATE_PATTERN.test(hoyArgentina)) {
    throw new Error(`hoyArgentina must be YYYY-MM-DD (got "${hoyArgentina}")`);
  }

  if (reward.getStatus() !== 'ACTIVE') return false;

  const stock = reward.getStock();
  if (stock !== null && stock <= 0) return false;

  const expiresAt = reward.getExpiresAt();
  if (expiresAt !== null && expiresAt < hoyArgentina) return false;

  return true;
}
