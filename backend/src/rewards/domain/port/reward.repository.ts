import { Reward } from '../reward.js';
import type { NewReward } from '../new-reward.js';

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

  // US-34: si hay una recompensa que no está DELETED con ese nombre, sin distinguir mayúsculas
  // ni espacios de los extremos (la misma regla que el índice rewards_active_name_key)
  abstract existsNotDeletedWithName(name: string): Promise<boolean>;

  // US-34: la guarda en ACTIVE
  abstract create(reward: NewReward): Promise<Reward>;

  // US-34 (§3.2.1): nunca devuelve DELETED. Orden updatedAt desc. `now` decide qué canjes
  // CONFIRMED siguen vigentes.
  abstract list(filters: RewardListFilters, now: Date): Promise<RewardListResult>;
}
