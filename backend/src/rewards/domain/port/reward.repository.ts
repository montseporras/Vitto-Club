import { Reward } from '../reward.js';

// BASE-4: puerto del repositorio de recompensas. Cada historia agrega lo que necesita (listado,
// crear, bloquear con FOR UPDATE, descontar stock...).
export abstract class RewardRepository {
  // null si no existe
  abstract findById(id: number): Promise<Reward | null>;
}
