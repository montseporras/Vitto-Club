import type { Reward, RewardDisabledReason, RewardStatus } from './reward.js';
import { motivoNoDisponible } from './reward-reevaluation.js';

// US-36 (contrato S4 §3.2.5 y §3.2.6): a qué estado pasa una recompensa al activarla o desactivarla.
// Que esté en el estado de partida correcto lo valida el servicio (409 INVALID_REWARD_STATUS).

export type RewardStatusState = { status: RewardStatus; disabledReason: RewardDisabledReason | null };

// Activar solo desde INACTIVE; desactivar desde ACTIVE o DISABLED
export const canActivate = (status: RewardStatus): boolean => status === 'INACTIVE';
export const canDeactivate = (status: RewardStatus): boolean => status === 'ACTIVE' || status === 'DISABLED';

// §3.2.5 y S4-9: si está disponible queda ACTIVE; si no, DISABLED con su motivo (no es un error).
// El motivo es el de US-37 (motivoNoDisponible): si fallan stock y fecha a la vez, gana "Vencida"
// (decisión de Jazmín y Melisa, una sola regla). `hoyArgentina` en YYYY-MM-DD.
export function activationResult(
  reward: Pick<Reward, 'getStock' | 'getExpiresAt'>,
  hoyArgentina: string,
): RewardStatusState {
  const reason = motivoNoDisponible(reward, hoyArgentina);
  return reason ? { status: 'DISABLED', disabledReason: reason } : { status: 'ACTIVE', disabledReason: null };
}

// §3.2.6: pasa a INACTIVE y pierde el motivo de deshabilitación (CA-36.3)
export const DEACTIVATED: RewardStatusState = { status: 'INACTIVE', disabledReason: null };
