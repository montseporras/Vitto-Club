import type { RewardDisabledReason, RewardStatus } from './reward.js';

// US-36 (contrato S4 §3.2.5 y §3.2.6): a qué estado pasa una recompensa al activarla o desactivarla.
// Que esté en el estado de partida correcto lo valida el servicio (409 INVALID_REWARD_STATUS).

export type RewardStatusState = { status: RewardStatus; disabledReason: RewardDisabledReason | null };

// Activar solo desde INACTIVE; desactivar desde ACTIVE o DISABLED
export const canActivate = (status: RewardStatus): boolean => status === 'INACTIVE';
export const canDeactivate = (status: RewardStatus): boolean => status === 'ACTIVE' || status === 'DISABLED';
// US-38 (§3.2.7): desde cualquier estado menos DELETED, que es final (S4-13)
export const canDelete = (status: RewardStatus): boolean => status !== 'DELETED';

// §3.2.5 y S4-9: si está disponible queda ACTIVE; si no, DISABLED con su motivo (no es un error).
// Sin stock y vencida a la vez: "Agotada", primero el stock (decisión de Jazmín, la misma regla que
// al editar). `hoyArgentina` y `expiresAt` en YYYY-MM-DD.
export function activationResult(
  reward: { stock: number | null; expiresAt: string | null },
  hoyArgentina: string,
): RewardStatusState {
  if (reward.stock !== null && reward.stock <= 0) return { status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' };
  if (reward.expiresAt !== null && reward.expiresAt < hoyArgentina) return { status: 'DISABLED', disabledReason: 'EXPIRED' };
  return { status: 'ACTIVE', disabledReason: null };
}

// §3.2.6: pasa a INACTIVE y pierde el motivo de deshabilitación (CA-36.3)
export const DEACTIVATED: RewardStatusState = { status: 'INACTIVE', disabledReason: null };
