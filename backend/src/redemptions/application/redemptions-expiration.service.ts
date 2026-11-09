import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { redemptionExpiredEntry } from '../../audit/domain/audit-entries.js';
import { Redemption } from '../domain/redemption.js';
import {
  RedemptionRepository,
  type RedemptionExpirationFilter,
} from '../domain/port/redemption.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';

export type RedemptionExpirationFailure = { redemptionId: number; error: unknown };
export type RedemptionExpirationRunResult = {
  expired: number;
  failures: RedemptionExpirationFailure[];
};

type LockMode = 'skip-locked' | 'wait';

// US-44 (contrato S4 §3.11): vencimiento de canjes. Sin endpoint HTTP. Dos entradas:
// - vencerVencidos(filtro): "vencer al leer" (CA-44.1). Lo llaman, antes de responder,
//   GET /canjes/:code, usar, rechazar, cancelar y los tres listados (US-41, 42, 43 y 45).
// - run(): el barrido (CA-44.3). Lo disparan el cron de 5 minutos, el arranque del servidor y el
//   comando a demanda (expire-redemptions.ts).
// Cada canje vence en SU PROPIA transacción, con su auditoría REDEMPTION_EXPIRED (Sistema). No toca
// saldo, lotes, movimientos ni stock: confirmar no descontó nada (decisión S4-1).
@Injectable()
export class RedemptionsExpirationService {
  private readonly logger = new Logger(RedemptionsExpirationService.name);

  constructor(
    private readonly redemptionRepository: RedemptionRepository,
    private readonly transactionRunner: TransactionRunner,
    private readonly auditService: AuditService,
  ) {}

  // "Vencer al leer". Devuelve cuántos canjes venció.
  //
  // IMPORTANTE para quien lo llama (CA-44.2, §3.9.1 paso 2): llamarlo ANTES de abrir la
  // transacción del caso de uso, nunca adentro. La transacción ambiente se anida: si se llamara
  // dentro de la de `usar` y después `usar` respondiera 409 REDEMPTION_EXPIRED, el rollback se
  // llevaría también el pase a EXPIRED y su auditoría.
  //
  // Bloquea con FOR UPDATE normal (espera): si el barrido tiene tomado el canje, espera a que
  // termine y después lo ve EXPIRED, sin duplicar nada (decisión de Melisa). Si un vencimiento
  // falla, el error sube: quien lee no puede seguir creyendo que el canje está vigente.
  async vencerVencidos(filter: RedemptionExpirationFilter, now: Date = new Date()): Promise<number> {
    const ids = await this.redemptionRepository.findExpiredCandidateIds(filter, now);
    let expired = 0;
    for (const id of ids) {
      if (await this.expireOne(id, now, 'wait')) expired += 1;
    }
    return expired;
  }

  // El barrido: todos los CONFIRMED vencidos, uno por transacción, con FOR UPDATE SKIP LOCKED
  // (CA-44.3). Si uno falla, se deshace solo ese, queda en el log y el resto sigue; se reintenta
  // en la próxima corrida. Idempotente: solo toma CONFIRMED (CA-44.5).
  async run(now: Date = new Date()): Promise<RedemptionExpirationRunResult> {
    const ids = await this.redemptionRepository.findExpiredCandidateIds({ all: true }, now);
    const result: RedemptionExpirationRunResult = { expired: 0, failures: [] };

    for (const id of ids) {
      try {
        if (await this.expireOne(id, now, 'skip-locked')) result.expired += 1;
      } catch (error) {
        result.failures.push({ redemptionId: id, error });
      }
    }

    this.logger.log(`Vencimiento de canjes: ${result.expired} canjes`);
    for (const failure of result.failures) {
      this.logger.error(
        `No se pudo vencer el canje ${failure.redemptionId}`,
        failure.error instanceof Error ? failure.error.stack : String(failure.error),
      );
    }
    return result;
  }

  // Un canje, en su propia transacción. false si se salteó (tomado por otro, o ya no estaba
  // Confirmado o vencido al bloquearlo).
  private async expireOne(id: number, now: Date, mode: LockMode): Promise<boolean> {
    return await this.transactionRunner.run(async () => {
      const redemption = await this.lock(id, mode);
      if (!redemption || !redemption.isExpired(now)) return false;

      redemption.expire(now);
      await this.redemptionRepository.saveExpiration(redemption);

      const customer = await this.redemptionRepository.findCustomer(redemption.getCustomerId());
      await this.auditService.record(
        redemptionExpiredEntry(customer, {
          code: redemption.getCode(),
          rewardName: redemption.getRewardName(),
        }),
      );
      return true;
    });
  }

  private async lock(id: number, mode: LockMode): Promise<Redemption | null> {
    return mode === 'skip-locked'
      ? await this.redemptionRepository.lockForExpirationSkipLocked(id)
      : await this.redemptionRepository.lockForUpdate(id);
  }
}
