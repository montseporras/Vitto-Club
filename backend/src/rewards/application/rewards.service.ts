import { Injectable } from '@nestjs/common';
import { Reward } from '../domain/reward.js';
import { RewardRepository } from '../domain/port/reward.repository.js';

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
}
