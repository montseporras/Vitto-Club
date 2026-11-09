import { Injectable } from '@nestjs/common';
import { estaDisponible } from '../domain/reward-availability.js';
import { Reward } from '../domain/reward.js';
import { RewardRepository } from '../domain/port/reward.repository.js';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';

// BASE-4: punto de entrada de rewards para los demás módulos (redemptions lo usa, §8.4). Cada
// historia agrega sus casos de uso (US-34 a US-38) y lo que redemptions necesita (bloquear,
// descontar stock).
@Injectable()
export class RewardsService {
  constructor(private readonly rewardRepository: RewardRepository) {}

  // null si no existe
  async findById(id: number): Promise<Reward | null> {
    return await this.rewardRepository.findById(id);
  }

  // US-40, §3.5.2: las disponibles (ACTIVE) por puntos ascendentes, filtradas por fecha y stock en
  // vivo (CA-B4.4): el status ACTIVE puede estar un rato desactualizado hasta que corra el
  // proceso diario de US-37.
  async findAvailable(now: Date = new Date()): Promise<Reward[]> {
    const hoy = toArgentinaDateString(now);
    const active = await this.rewardRepository.findActive();
    return active.filter((reward) => estaDisponible(reward, hoy));
  }

  // US-40, §3.7.1 paso 3 y US-42, §3.9.1 paso 5: ¿se puede canjear/confirmar ahora? Lectura pura,
  // sin tocar la base: no deshabilita nada (eso es de reevaluarDisponibilidad, cuando corresponde
  // persistirlo y auditarlo).
  isAvailable(reward: Reward, now: Date = new Date()): boolean {
    return estaDisponible(reward, toArgentinaDateString(now));
  }

  // US-42 (§3.9.1, orden de bloqueos: recompensa → canje → customer_points). null si no existe.
  async lockForUpdate(id: number): Promise<Reward | null> {
    return await this.rewardRepository.lockForUpdate(id);
  }

  // US-42 (§3.9.1 paso 8): suma 1 a usedCount y descuenta 1 del stock si tiene límite. Solo
  // persiste esos dos campos; si queda sin stock, quien llama tiene que reevaluar la
  // disponibilidad (RewardsAvailabilityService) para deshabilitarla y auditar.
  async recordUse(reward: Reward): Promise<void> {
    reward.registerUse();
    await this.rewardRepository.saveUsage(reward);
  }
}
