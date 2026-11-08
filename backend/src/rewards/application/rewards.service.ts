import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import { Reward, type RewardDisabledReason } from '../domain/reward.js';
import { buildNewReward, NewRewardInput } from '../domain/new-reward.js';
import { AvailabilityChange, planRewardEdit, RewardEditInput, RewardFieldChange } from '../domain/reward-edit.js';
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

// §3.2.2 y §3.2.4: una dada de baja tampoco existe para el Administrador. Sin code (§5).
export const REWARD_NOT_FOUND_MESSAGE = 'No existe la recompensa.';
export const EMPTY_EDIT_MESSAGE = 'Indicá al menos un campo para modificar.';
export const STOCK_BELOW_CONFIRMED_CODE = 'STOCK_BELOW_CONFIRMED';

export type RewardWithConfirmed = { reward: Reward; confirmedCount: number };

// Lo que quien llama necesita para responder (§3.2.4) y auditar (REWARD_UPDATED y, si cambió la
// disponibilidad, REWARD_ENABLED o REWARD_DISABLED)
export type RewardEditResult = RewardWithConfirmed & {
  // Como estaba antes de editar (para las filas "antes → después" de la auditoría)
  previous: Reward;
  // Vacío = no cambió nada: no se guardó ni se audita
  changes: RewardFieldChange[];
  availabilityChange: AvailabilityChange;
  enabledFrom: RewardDisabledReason | null;
};

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

  // US-35 (§3.2.2): con sus canjes confirmados vigentes
  async getById(id: number, now: Date = new Date()): Promise<RewardWithConfirmed> {
    const reward = await this.rewardRepository.findNotDeletedById(id);
    if (!reward) throw new NotFoundException(REWARD_NOT_FOUND_MESSAGE);
    return { reward, confirmedCount: await this.rewardRepository.countConfirmed(id, now) };
  }

  // US-35 (§3.2.4). Corre dentro de la transacción de quien llama (el controller la abre con
  // AuditService.capture). Bloquea la recompensa antes de contar los confirmados: así ningún canje
  // se confirma entre el conteo y el guardado (US-40 tiene que bloquearla igual al confirmar). Sin cambios,
  // no escribe nada, ni siquiera updatedAt (decisión de Jazmín: no sube en el listado).
  async update(id: number, input: RewardEditInput, now: Date = new Date()): Promise<RewardEditResult> {
    if (Object.values(input).every((value) => value === undefined)) {
      throw new BadRequestException(EMPTY_EDIT_MESSAGE);
    }

    const current = await this.rewardRepository.lockNotDeletedForUpdate(id);
    if (!current) throw new NotFoundException(REWARD_NOT_FOUND_MESSAGE);

    const plan = planRewardEdit(
      {
        name: current.getName(),
        description: current.getDescription(),
        points: current.getPoints(),
        stock: current.getStock(),
        expiresAt: current.getExpiresAt(),
        status: current.getStatus(),
        disabledReason: current.getDisabledReason(),
      },
      input,
      toArgentinaDateString(now),
    );

    const confirmedCount = await this.rewardRepository.countConfirmed(id, now);
    // S4-14: el stock no puede quedar por debajo de los canjes confirmados vigentes
    if (input.stock !== undefined && plan.next.stock !== null && plan.next.stock < confirmedCount) {
      throw new ConflictException({
        message: `El stock no puede ser menor a los ${confirmedCount} canjes confirmados.`,
        code: STOCK_BELOW_CONFIRMED_CODE,
      });
    }

    const renamed = plan.changes.some((change) => change.field === 'name');
    if (renamed && (await this.rewardRepository.existsNotDeletedWithName(plan.next.name, id))) {
      throw new ConflictException(REWARD_NAME_IN_USE);
    }

    if (plan.changes.length === 0) {
      return { reward: current, previous: current, confirmedCount, changes: [], availabilityChange: null, enabledFrom: null };
    }

    const reward = await this.rewardRepository.update(id, plan.next);
    return {
      reward,
      previous: current,
      confirmedCount,
      changes: plan.changes,
      availabilityChange: plan.availabilityChange,
      enabledFrom: plan.enabledFrom,
    };
  }

  // US-34 (§3.2.1): listado del Administrador. Solo lectura: no abre transacción ni audita.
  async list(filters: RewardListFilters, now: Date = new Date()): Promise<RewardListResult> {
    return await this.rewardRepository.list(filters, now);
  }
}
