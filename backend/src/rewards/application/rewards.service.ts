import { ConflictException, Injectable } from '@nestjs/common';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import { Reward } from '../domain/reward.js';
import { buildNewReward, NewRewardInput } from '../domain/new-reward.js';
import {
  RewardListFilters,
  RewardListResult,
  RewardRepository,
} from '../domain/port/reward.repository.js';

// §3.2.3 y §5
export const REWARD_NAME_IN_USE = {
  message: 'Ya existe una recompensa con ese nombre.',
  code: 'REWARD_NAME_IN_USE',
} as const;

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

  // US-34 (§3.2.3): crea la recompensa en ACTIVE. Corre dentro de la transacción de quien llama
  // (el controller la abre con AuditService.capture, para que la auditoría REWARD_CREATED quede en
  // la misma). Si dos altas con el mismo nombre llegan a la vez, el índice único de la base frena a
  // la segunda y el filtro responde el mismo 409.
  async create(input: NewRewardInput, now: Date = new Date()): Promise<Reward> {
    const reward = buildNewReward(input, toArgentinaDateString(now));
    if (await this.rewardRepository.existsNotDeletedWithName(reward.name)) {
      throw new ConflictException(REWARD_NAME_IN_USE);
    }
    return await this.rewardRepository.create(reward);
  }

  // US-34 (§3.2.1): listado del Administrador. Solo lectura: no abre transacción ni audita.
  async list(filters: RewardListFilters, now: Date = new Date()): Promise<RewardListResult> {
    return await this.rewardRepository.list(filters, now);
  }
}
