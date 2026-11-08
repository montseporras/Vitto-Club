import { Reward } from '../reward.js';

// BASE-4: puerto del repositorio de recompensas. Cada historia agrega lo que necesita (listado,
// crear, bloquear con FOR UPDATE, descontar stock...).
export abstract class RewardRepository {
  // null si no existe
  abstract findById(id: number): Promise<Reward | null>;

  // US-40 (GET /recompensas/disponibles): las ACTIVE por puntos ascendentes (desempate por id).
  // Si además están disponibles por stock y fecha lo decide estaDisponible, no la base.
  abstract findActive(): Promise<Reward[]>;

  // US-42 (§3.9.1, orden de bloqueos: recompensa → canje → customer_points). SELECT FOR UPDATE.
  // null si no existe.
  abstract lockById(id: number): Promise<Reward | null>;

  // US-42: persiste los cambios de registerUse() (stock, usedCount, status, disabledReason).
  abstract update(reward: Reward): Promise<void>;
}
