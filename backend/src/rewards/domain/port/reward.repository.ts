import { Reward } from '../reward.js';
import type { NewReward } from '../new-reward.js';
import type { RewardEditableState } from '../reward-edit.js';
import type { RewardStatusState } from '../reward-status-change.js';

// US-34 (§3.2.1): el filtro "Estado" del listado. DELETED no se puede pedir.
export const LISTABLE_REWARD_STATUSES = ['ACTIVE', 'DISABLED', 'INACTIVE'] as const;
export type ListableRewardStatus = (typeof LISTABLE_REWARD_STATUSES)[number];

export type RewardListFilters = {
  // Parte del nombre, sin distinguir mayúsculas ni tildes
  q?: string;
  status?: ListableRewardStatus;
  page: number;
  limit: number;
};

// Cada recompensa con sus canjes CONFIRMED vigentes en este momento (§3.1, confirmedCount)
export type RewardListItem = { reward: Reward; confirmedCount: number };

export type RewardListResult = { items: RewardListItem[]; total: number };

// BASE-4: puerto del repositorio de recompensas. Cada historia agrega lo que necesita (listado,
// crear, bloquear con FOR UPDATE, descontar stock...).
export abstract class RewardRepository {
  // null si no existe
  abstract findById(id: number): Promise<Reward | null>;

  // US-35: null si no existe o está DELETED (para el Administrador, una dada de baja no existe)
  abstract findNotDeletedById(id: number): Promise<Reward | null>;

  // US-35: igual que findNotDeletedById, pero bloquea la fila (FOR UPDATE) hasta el final de la
  // transacción, para que nadie confirme un canje entre el conteo de confirmados y el guardado
  abstract lockNotDeletedForUpdate(id: number): Promise<Reward | null>;

  // US-34: si hay una recompensa que no está DELETED con ese nombre, sin distinguir mayúsculas
  // ni espacios de los extremos (la misma regla que el índice rewards_active_name_key).
  // US-35: `exceptId` deja afuera a la que se está editando.
  abstract existsNotDeletedWithName(name: string, exceptId?: number): Promise<boolean>;

  // US-35: canjes CONFIRMED de la recompensa que todavía no vencieron (confirmedCount)
  abstract countConfirmed(rewardId: number, now: Date): Promise<number>;

  // US-35: guarda los datos editados y el estado que resultó; actualiza updatedAt
  abstract update(id: number, state: RewardEditableState): Promise<Reward>;

  // US-36: cambia solo el estado y el motivo; actualiza updatedAt
  abstract updateStatus(id: number, state: RewardStatusState): Promise<Reward>;

  // US-34: la guarda en ACTIVE
  abstract create(reward: NewReward): Promise<Reward>;

  // US-34 (§3.2.1): nunca devuelve DELETED. Orden updatedAt desc. `now` decide qué canjes
  // CONFIRMED siguen vigentes.
  abstract list(filters: RewardListFilters, now: Date): Promise<RewardListResult>;

  // US-37, proceso diario (§3.4): ids de las ACTIVE con expires_at < hoy (YYYY-MM-DD, Argentina).
  // Sin bloqueo: cada una se bloquea después, en su propia transacción.
  abstract findExpiredCandidateIds(hoyArgentina: string): Promise<number[]>;

  // US-37: FOR UPDATE SKIP LOCKED. null si otra operación la tiene tomada (se saltea) o no existe.
  abstract lockForUpdateSkipLocked(id: number): Promise<Reward | null>;

  // US-37: guarda status y disabled_reason
  abstract saveAvailability(reward: Reward): Promise<void>;
}
