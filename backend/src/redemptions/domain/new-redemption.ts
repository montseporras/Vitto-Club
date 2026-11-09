import { REDEMPTION_DURATION_MS, type RedemptionOrigin } from './redemption.js';

// Lo que se guarda al confirmar. El id, el estado (CONFIRMED) y los campos de resolución los pone
// la base: un canje recién confirmado no tiene resolución ni saldos (§3.6.2).
export type NewRedemption = {
  code: string;
  customerId: number;
  rewardId: number;
  // Snapshot de la recompensa al confirmar (CA-40.1): un cambio posterior no lo modifica
  rewardName: string;
  points: number;
  origin: RedemptionOrigin;
  // Solo si origin = COUNTER: el empleado que lo confirmó en la caja
  confirmedByAccountId: number | null;
  confirmedByName: string | null;
  createdAt: Date;
  expiresAt: Date;
};

export type NewRedemptionInput = {
  code: string;
  customerId: number;
  reward: { id: number; name: string; points: number };
  // Quién confirma: null = el propio Cliente desde la app (APP); un empleado = la caja (COUNTER)
  confirmedBy: { accountId: number; name: string } | null;
  now: Date;
};

// Confirmar no descuenta nada (S4-1, regla 2): acá solo se arma el canje. Los puntos y el stock se
// descuentan recién al registrar el uso (US-42).
export function crearCanjeConfirmado(input: NewRedemptionInput): NewRedemption {
  return {
    code: input.code,
    customerId: input.customerId,
    rewardId: input.reward.id,
    rewardName: input.reward.name,
    points: input.reward.points,
    origin: input.confirmedBy ? 'COUNTER' : 'APP',
    confirmedByAccountId: input.confirmedBy?.accountId ?? null,
    confirmedByName: input.confirmedBy?.name ?? null,
    createdAt: input.now,
    expiresAt: new Date(input.now.getTime() + REDEMPTION_DURATION_MS),
  };
}
