import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { rewardDisabledEntry, rewardEnabledEntry } from '../../audit/domain/audit-entries.js';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import { reevaluar } from '../domain/reward-reevaluation.js';
import { Reward } from '../domain/reward.js';
import { RewardRepository } from '../domain/port/reward.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';

// §3.2.4: lo que devuelve PATCH /recompensas/:id en availabilityChange
export type AvailabilityChange = 'ENABLED' | 'DISABLED' | null;

export type RewardExpirationFailure = { rewardId: number; error: unknown };
export type RewardExpirationRunResult = { disabled: number; failures: RewardExpirationFailure[] };

// US-37 (contrato S4 §3.4): disponibilidad automática de las recompensas, con actor Sistema.
// - reevaluarDisponibilidad: la función compartida (CA-37.1). La llaman US-35 (editar), US-42 (usar,
//   cuando el stock llega a 0) y este proceso; no repiten la lógica.
// - runDailyExpiration: el proceso diario de vencidas (CA-37.2 a CA-37.5).
@Injectable()
export class RewardsAvailabilityService {
  private readonly logger = new Logger(RewardsAvailabilityService.name);

  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly transactionRunner: TransactionRunner,
    private readonly auditService: AuditService,
  ) {}

  // Aplica la tabla de la §3.4 a una recompensa ya bloqueada por quien llama: guarda el cambio y
  // audita REWARD_DISABLED o REWARD_ENABLED (Sistema). Corre DENTRO de la transacción de quien llama
  // (editar, usar): si algo falla, se deshace todo. Devuelve el availabilityChange de la §3.2.4:
  // "ENABLED", "DISABLED" o null (sin cambio de estado; también cuando una DISABLED solo cambia de
  // motivo, que igual se guarda y se audita, decisión de Melisa). INACTIVE y DELETED: null, sin tocar.
  // hoyArgentina va en YYYY-MM-DD (toArgentinaDateString).
  async reevaluarDisponibilidad(reward: Reward, hoyArgentina: string): Promise<AvailabilityChange> {
    const change = reevaluar(reward, hoyArgentina);
    if (!change) return null;

    return await this.transactionRunner.run(async () => {
      if (change.kind === 'ENABLED') {
        reward.enable();
        await this.rewardRepository.saveAvailability(reward);
        await this.auditService.record(rewardEnabledEntry(reward.getName(), change.previousReason));
        return 'ENABLED';
      }

      reward.disable(change.reason);
      await this.rewardRepository.saveAvailability(reward);
      await this.auditService.record(rewardDisabledEntry(reward.getName(), change.reason));
      return change.kind === 'DISABLED' ? 'DISABLED' : null;
    });
  }

  // El proceso diario: las ACTIVE con expires_at < hoy pasan a DISABLED / EXPIRED. Una por
  // transacción, con FOR UPDATE SKIP LOCKED. Si una falla, se deshace solo esa, queda en el log y el
  // resto sigue (CA-37.5). Idempotente: solo toma ACTIVE. Las que vencen hoy no se tocan (CA-37.3).
  // Sus canjes Confirmados no se tocan (CA-37.6).
  async runDailyExpiration(now: Date = new Date()): Promise<RewardExpirationRunResult> {
    const hoy = toArgentinaDateString(now);
    const ids = await this.rewardRepository.findExpiredCandidateIds(hoy);
    const result: RewardExpirationRunResult = { disabled: 0, failures: [] };

    for (const id of ids) {
      try {
        if (await this.expireOne(id, hoy)) result.disabled += 1;
      } catch (error) {
        result.failures.push({ rewardId: id, error });
      }
    }

    this.logger.log(`Vencimiento de recompensas: ${result.disabled} recompensas`);
    for (const failure of result.failures) {
      this.logger.error(
        `No se pudo vencer la recompensa ${failure.rewardId}`,
        failure.error instanceof Error ? failure.error.stack : String(failure.error),
      );
    }
    return result;
  }

  // Una recompensa, en su propia transacción. false si se salteó (tomada por otro, o ya no estaba
  // ACTIVE y vencida al bloquearla).
  private async expireOne(id: number, hoy: string): Promise<boolean> {
    return await this.transactionRunner.run(async () => {
      const reward = await this.rewardRepository.lockForUpdateSkipLocked(id);
      if (!reward || reward.getStatus() !== 'ACTIVE') return false;
      return (await this.reevaluarDisponibilidad(reward, hoy)) === 'DISABLED';
    });
  }
}
