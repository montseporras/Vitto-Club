import { Reward } from '../reward.js';

// BASE-4: puerto del repositorio de recompensas. Cada historia agrega lo que necesita (listado,
// crear, bloquear con FOR UPDATE, descontar stock...).
export abstract class RewardRepository {
  // null si no existe
  abstract findById(id: number): Promise<Reward | null>;

  // US-40 (GET /recompensas/disponibles): las ACTIVE por puntos ascendentes (desempate por id).
  // La disponibilidad (stock y fecha) la mantiene al día US-37 (status), así que no se filtra de
  // nuevo acá.
  abstract findActive(): Promise<Reward[]>;

  // US-37, proceso diario (§3.4): ids de las ACTIVE con expires_at < hoy (YYYY-MM-DD, Argentina).
  // Sin bloqueo: cada una se bloquea después, en su propia transacción.
  abstract findExpiredCandidateIds(hoyArgentina: string): Promise<number[]>;

  // US-37: FOR UPDATE SKIP LOCKED. null si otra operación la tiene tomada (se saltea) o no existe.
  abstract lockForUpdateSkipLocked(id: number): Promise<Reward | null>;

  // US-37: guarda status y disabled_reason
  abstract saveAvailability(reward: Reward): Promise<void>;

  // US-42 (§3.9.1, orden de bloqueos: recompensa → canje → customer_points). FOR UPDATE que
  // espera (no SKIP LOCKED: un uso no se saltea una recompensa tomada, espera). null si no existe.
  abstract lockForUpdate(id: number): Promise<Reward | null>;

  // US-42: guarda stock y usedCount (el cambio de status/disabledReason lo guarda
  // saveAvailability, desde RewardsAvailabilityService.reevaluarDisponibilidad)
  abstract saveUsage(reward: Reward): Promise<void>;
}
