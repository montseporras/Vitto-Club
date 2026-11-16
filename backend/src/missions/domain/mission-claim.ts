// US-31 (contrato S5 §3.3.3): cuándo se puede reclamar la recompensa de una misión. Solo una Completada
// con recompensa; cada caso que no tiene su mensaje (409 MISSION_NOT_CLAIMABLE).

export type CustomerMissionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED';

// Quién reclamó: el Cliente desde la app, o el Sistema (al dar de baja la misión, US-29; a fin de mes,
// US-32). El actor de la auditoría es siempre el Sistema.
export type ClaimedBy = 'CUSTOMER' | 'SYSTEM';

export const MISSION_NOT_CLAIMABLE_CODE = 'MISSION_NOT_CLAIMABLE';

export const CLAIM_MESSAGES = {
  notCompleted: 'La misión todavía no está completada.',
  alreadyClaimed: 'La recompensa de esta misión ya se reclamó.',
  expired: 'La misión venció.',
  noReward: 'Esta misión no tiene recompensa.',
} as const;

// null si se puede reclamar; si no, el mensaje del contrato
export function claimRejection(status: CustomerMissionStatus, rewardPoints: number | null): string | null {
  if (status === 'IN_PROGRESS') return CLAIM_MESSAGES.notCompleted;
  if (status === 'CLAIMED') return CLAIM_MESSAGES.alreadyClaimed;
  if (status === 'EXPIRED') return CLAIM_MESSAGES.expired;
  if (rewardPoints === null) return CLAIM_MESSAGES.noReward;
  return null;
}

// §3.3.1: canClaim solo si está Completada y tiene recompensa
export const canClaim = (status: CustomerMissionStatus, rewardPoints: number | null): boolean =>
  claimRejection(status, rewardPoints) === null;

// §3.3.1: endsAt = último día del mes de la asignación, YYYY-MM-DD
export function endOfPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
