import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  REWARD_DEACTIVATED,
  REWARD_DELETED,
  type RedemptionsRejectedResult,
  type RewardDeactivatedEvent,
  type RewardDeletedEvent,
} from '../../shared/events/domain-events.js';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import { Reward, type RewardStatus } from '../domain/reward.js';
import { buildCatalog, type CatalogFilter } from '../domain/catalog.js';
import { toCatalogReward, type CatalogReward } from './catalog-reward.js';
import { activationResult, canActivate, canDeactivate, canDelete, DEACTIVATED } from '../domain/reward-status-change.js';
import { buildNewReward, NewRewardInput } from '../domain/new-reward.js';
import { planRewardEdit, RewardEditInput, RewardFieldChange } from '../domain/reward-edit.js';
import { AuditService } from '../../audit/application/audit.service.js';
import type { AuditActor } from '../../audit/domain/audit-entry.js';
import { rewardUpdatedEntry, type RewardEditSnapshot } from '../../audit/domain/audit-entries.js';
import { RewardsAvailabilityService, type AvailabilityChange } from './rewards-availability.service.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
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

export const INVALID_REWARD_STATUS_CODE = 'INVALID_REWARD_STATUS';
const NOT_INACTIVE_MESSAGE = 'La recompensa no está inactiva.';
const ALREADY_INACTIVE_MESSAGE = 'La recompensa ya está inactiva.';

export type RewardWithConfirmed = { reward: Reward; confirmedCount: number };

// US-36: para responder y auditar el cambio de estado ("Estado: {antes} → {después}")
export type RewardStatusChangeResult = RewardWithConfirmed & { previousStatus: RewardStatus };
export type RewardDeactivationResult = RewardStatusChangeResult & { rejectedRedemptions: number };

// US-38: la respuesta es solo { rejectedRedemptions }; la recompensa va para la auditoría
export type RewardDeletionResult = { reward: Reward; previousStatus: RewardStatus; rejectedRedemptions: number };

// US-43: emitAsync devuelve un resultado por listener. El de redemptions trae { rejectedRedemptions }.
// Copia de customers.service.ts (la nota de US-43 lo indica así: shared/events es solo de datos).
function rejectedRedemptionsFrom(listenerResults: unknown[]): number {
  return listenerResults.reduce<number>((total, result) => {
    const value =
      typeof result === 'object' && result !== null
        ? (result as Partial<RedemptionsRejectedResult>).rejectedRedemptions
        : undefined;
    return typeof value === 'number' ? total + value : total;
  }, 0);
}

// Lo que quien llama necesita para responder (§3.2.4) y auditar (REWARD_UPDATED y, si cambió la
// disponibilidad, REWARD_ENABLED o REWARD_DISABLED)
export type RewardEditResult = RewardWithConfirmed & {
  // Vacío = no cambió nada: no se guardó ni se audita
  changes: RewardFieldChange[];
  // Lo que devolvió reevaluarDisponibilidad (US-37): "ENABLED", "DISABLED" o null
  availabilityChange: AvailabilityChange;
};

const editSnapshot = (reward: Reward): RewardEditSnapshot => ({
  name: reward.getName(),
  description: reward.getDescription(),
  points: reward.getPoints(),
  stock: reward.getStock(),
  expiresAt: reward.getExpiresAt(),
});

// BASE-4: punto de entrada de rewards para los demás módulos (redemptions lo usa, §8.4). Cada
// historia agrega sus casos de uso (US-34 a US-38) y lo que redemptions necesita (bloquear,
// verificar disponibilidad, descontar stock).
@Injectable()
export class RewardsService {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly availability: RewardsAvailabilityService,
    private readonly auditService: AuditService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

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

  // US-35 (§3.2.4). En una transacción: bloquea la recompensa antes de contar los confirmados (así
  // ningún canje se confirma entre el conteo y el guardado; US-40 tiene que bloquearla igual al
  // confirmar), guarda, audita REWARD_UPDATED a nombre del Administrador y, después, reevalúa la
  // disponibilidad con la función de US-37, que guarda y audita REWARD_ENABLED o REWARD_DISABLED
  // (Sistema). Sin cambios, no escribe nada, ni siquiera updatedAt (decisión de Jazmín: no sube en el
  // listado).
  async update(id: number, input: RewardEditInput, actor: AuditActor, now: Date = new Date()): Promise<RewardEditResult> {
    if (Object.values(input).every((value) => value === undefined)) {
      throw new BadRequestException(EMPTY_EDIT_MESSAGE);
    }

    return await this.transactionRunner.run(async () => {
      const current = await this.rewardRepository.lockNotDeletedForUpdate(id);
      if (!current) throw new NotFoundException(REWARD_NOT_FOUND_MESSAGE);

      const hoyArgentina = toArgentinaDateString(now);
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
        hoyArgentina,
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
        return { reward: current, confirmedCount, changes: [], availabilityChange: null };
      }

      const reward = await this.rewardRepository.update(id, plan.next);
      const entry = rewardUpdatedEntry(actor, editSnapshot(current), editSnapshot(reward));
      if (entry) await this.auditService.record(entry);
      // Cambia el estado de `reward` si corresponde (la deja como quedó en la base)
      const availabilityChange = await this.availability.reevaluarDisponibilidad(reward, hoyArgentina);
      return { reward, confirmedCount, changes: plan.changes, availabilityChange };
    });
  }

  // US-36 (§3.2.5): solo desde INACTIVE. Si no está disponible queda DISABLED con su motivo, y no
  // es un error (S4-9). Corre dentro de la transacción de quien llama (AuditService.capture).
  async activate(id: number, now: Date = new Date()): Promise<RewardStatusChangeResult> {
    const current = await this.rewardRepository.lockNotDeletedForUpdate(id);
    if (!current) throw new NotFoundException(REWARD_NOT_FOUND_MESSAGE);
    if (!canActivate(current.getStatus())) {
      throw new ConflictException({ message: NOT_INACTIVE_MESSAGE, code: INVALID_REWARD_STATUS_CODE });
    }

    const next = activationResult(current, toArgentinaDateString(now));
    const reward = await this.rewardRepository.updateStatus(id, next);
    return {
      reward,
      previousStatus: current.getStatus(),
      confirmedCount: await this.rewardRepository.countConfirmed(id, now),
    };
  }

  // US-36 (§3.2.6): desde ACTIVE o DISABLED. En la transacción que abre quien llama: guarda INACTIVE
  // y publica reward.deactivated, que redemptions escucha (US-43) para rechazar los canjes CONFIRMED
  // vigentes como Sistema y auditarlos. rewards no importa redemptions (CA-B4.8). La recompensa
  // queda bloqueada antes que los canjes: el mismo orden que al usar (§3.9.1).
  async deactivate(id: number, now: Date = new Date()): Promise<RewardDeactivationResult> {
    const current = await this.rewardRepository.lockNotDeletedForUpdate(id);
    if (!current) throw new NotFoundException(REWARD_NOT_FOUND_MESSAGE);
    if (!canDeactivate(current.getStatus())) {
      throw new ConflictException({ message: ALREADY_INACTIVE_MESSAGE, code: INVALID_REWARD_STATUS_CODE });
    }

    const reward = await this.rewardRepository.updateStatus(id, DEACTIVATED);
    const listenerResults: unknown[] = await this.eventEmitter.emitAsync(REWARD_DEACTIVATED, {
      rewardId: id,
    } satisfies RewardDeactivatedEvent);
    return {
      reward,
      previousStatus: current.getStatus(),
      rejectedRedemptions: rejectedRedemptionsFrom(listenerResults),
      confirmedCount: await this.rewardRepository.countConfirmed(id, now),
    };
  }

  // US-38 (§3.2.7): igual que desactivar, pero pasa a DELETED (final) y redemptions rechaza los
  // canjes con "Recompensa eliminada" al escuchar reward.deleted (US-43). Una dada de baja o que no
  // existe da 404, también si se elimina dos veces (CA-38.7).
  async delete(id: number, now: Date = new Date()): Promise<RewardDeletionResult> {
    const current = await this.rewardRepository.lockNotDeletedForUpdate(id);
    if (!current || !canDelete(current.getStatus())) throw new NotFoundException(REWARD_NOT_FOUND_MESSAGE);

    const reward = await this.rewardRepository.markDeleted(id, now);
    const listenerResults: unknown[] = await this.eventEmitter.emitAsync(REWARD_DELETED, {
      rewardId: id,
    } satisfies RewardDeletedEvent);
    return { reward, previousStatus: current.getStatus(), rejectedRedemptions: rejectedRedemptionsFrom(listenerResults) };
  }

  // US-39 (§3.5.1): el catálogo del Cliente, ya filtrado y ordenado, con la fecha de hoy en
  // Argentina. Solo lectura: no abre transacción ni audita. El saldo lo agrega quien llama.
  async catalog(filter: CatalogFilter, now: Date = new Date()): Promise<CatalogReward[]> {
    const rewards = await this.rewardRepository.findForCatalog();
    return buildCatalog(rewards, filter, toArgentinaDateString(now)).map(toCatalogReward);
  }

  // US-34 (§3.2.1): listado del Administrador. Solo lectura: no abre transacción ni audita.
  async list(filters: RewardListFilters, now: Date = new Date()): Promise<RewardListResult> {
    return await this.rewardRepository.list(filters, now);
  }
}
