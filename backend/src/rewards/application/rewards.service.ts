import { Injectable } from '@nestjs/common';
import { Reward } from '../domain/reward.js';
import { estaDisponible } from '../domain/reward-availability.js';
import { RewardRepository } from '../domain/port/reward.repository.js';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';

// BASE-4: punto de entrada de rewards para los demás módulos (redemptions lo usa, §8.4). Cada
// historia agrega sus casos de uso (US-34 a US-38) y lo que redemptions necesita (bloquear,
// verificar disponibilidad, descontar stock).
@Injectable()
export class RewardsService {
  constructor(private readonly rewardRepository: RewardRepository) {}

  // null si no existe
  async findById(id: number): Promise<Reward | null> {
    return await this.rewardRepository.findById(id);
  }

  // US-40, §3.5.2: solo las disponibles (§3.1), por puntos ascendentes. Se calcula con la fecha de
  // hoy en Argentina, no solo con el estado.
  async findAvailable(now: Date = new Date()): Promise<Reward[]> {
    const today = toArgentinaDateString(now);
    const active = await this.rewardRepository.findActive();
    return active.filter((reward) => estaDisponible(reward, today));
  }

  // US-40, §3.7.1 paso 3 y US-42: ¿se puede canjear ahora? Misma regla de §3.1
  isAvailable(reward: Reward, now: Date = new Date()): boolean {
    return estaDisponible(reward, toArgentinaDateString(now));
  }

  // US-42 (§3.9.1, orden de bloqueos: recompensa → canje → customer_points). null si no existe.
  async lockById(id: number): Promise<Reward | null> {
    return await this.rewardRepository.lockById(id);
  }

  // US-42 (§3.9.1 paso 8): registra el uso (stock, usedCount) y persiste. Devuelve si quedó
  // deshabilitada, para que quien orquesta decida si audita REWARD_DISABLED.
  async registerUse(reward: Reward): Promise<{ disabled: boolean }> {
    const result = reward.registerUse();
    await this.rewardRepository.update(reward);
    return result;
  }
}
