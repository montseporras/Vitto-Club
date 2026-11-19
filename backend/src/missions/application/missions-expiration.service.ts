import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { missionsExpiredEntry } from '../../audit/domain/audit-entries.js';
import { canClaim } from '../domain/mission-claim.js';
import { CustomerMissionRepository } from '../domain/port/customer-mission.repository.js';
import { MissionRepository } from '../domain/port/mission.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { MissionsClaimService } from './missions-claim.service.js';
import { currentArgentinaMonth } from './missions.service.js';

// §3.4: el motivo de las asignaciones que vencen a fin de mes
export const END_OF_MONTH_EXPIRATION_REASON = 'Fin de mes';

export type MissionsExpirationResult = {
  expired: number;
  claimed: number;
  appliedPendingChanges: number;
  failures: { customerMissionId: number; error: unknown }[];
};

// US-32 (contrato S5 §3.4, RF-036): el proceso de fin de mes. Lo disparan el cron del día 1 a las 00:10,
// el arranque del servidor (MissionsExpirationScheduler) y el comando a demanda (expire-missions.ts). No
// tiene endpoint HTTP.
@Injectable()
export class MissionsExpirationService {
  private readonly logger = new Logger(MissionsExpirationService.name);

  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly customerMissionRepository: CustomerMissionRepository,
    private readonly claims: MissionsClaimService,
    private readonly auditService: AuditService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // Por cada asignación de un mes ya terminado, en su propia transacción (FOR UPDATE SKIP LOCKED):
  // - En progreso → Vencida "Fin de mes" (el cliente pierde la misión, S5-5);
  // - Completada con recompensa → Reclamada sola (Sistema), con sus puntos y su MISSION_REWARD_CLAIMED;
  // - Completada sin recompensa: queda igual (no es candidata, S5-4).
  // Un fallo deshace solo esa asignación y no frena el resto: se reintenta en la próxima corrida. Después
  // aplica los pendingChanges que ya rigen y escribe una sola MISSIONS_EXPIRED si hubo algo. Idempotente:
  // una segunda corrida no encuentra candidatas.
  async run(now: Date = new Date()): Promise<MissionsExpirationResult> {
    const currentMonth = currentArgentinaMonth(now);
    const result: MissionsExpirationResult = { expired: 0, claimed: 0, appliedPendingChanges: 0, failures: [] };
    const periods: string[] = [];

    for (const candidate of await this.customerMissionRepository.findPendingBefore(currentMonth)) {
      try {
        const outcome = await this.transactionRunner.run(() => this.resolve(candidate.id, now));
        if (outcome === 'EXPIRED') result.expired += 1;
        if (outcome === 'CLAIMED') result.claimed += 1;
        if (outcome) periods.push(candidate.period);
      } catch (error) {
        result.failures.push({ customerMissionId: candidate.id, error });
        this.logger.error(
          `No se pudo resolver la asignación ${candidate.id} a fin de mes`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    // §3.4: "Si la misión tenía pendingChanges con appliesFrom = el mes nuevo, el proceso los aplica".
    // Se aplican los que tengan appliesFrom <= mes actual, para no perder ninguno si una corrida no se
    // hizo, y sin auditoría: el cambio ya se auditó como MISSION_UPDATED con "Rige desde" (decisión de
    // Jazmín).
    try {
      result.appliedPendingChanges = await this.transactionRunner.run(() =>
        this.missionRepository.applyPendingChanges(currentMonth),
      );
    } catch (error) {
      this.logger.error(
        'No se pudieron aplicar los cambios pendientes de las misiones',
        error instanceof Error ? error.stack : String(error),
      );
    }

    // CA-32.5: una sola entrada por corrida; ninguna si no venció ni se reclamó nada
    if (result.expired + result.claimed > 0) {
      await this.transactionRunner.run(() =>
        this.auditService.record(missionsExpiredEntry({ periods, expired: result.expired, claimed: result.claimed })),
      );
    }

    this.logger.log(
      `Fin de mes de misiones: ${result.expired} vencidas, ${result.claimed} reclamadas, ` +
        `${result.appliedPendingChanges} cambios aplicados, ${result.failures.length} con error`,
    );
    return result;
  }

  // null si otra transacción tiene la asignación (SKIP LOCKED) o si ya no hay nada que hacer
  private async resolve(customerMissionId: number, now: Date): Promise<'EXPIRED' | 'CLAIMED' | null> {
    const assignment = await this.customerMissionRepository.lockForExpiration(customerMissionId);
    if (!assignment) return null;
    if (assignment.status === 'IN_PROGRESS') {
      await this.customerMissionRepository.expire(assignment.id, END_OF_MONTH_EXPIRATION_REASON, now);
      return 'EXPIRED';
    }
    if (canClaim(assignment.status, assignment.rewardPoints)) {
      await this.claims.reclamar(assignment.id, 'SYSTEM', { now });
      return 'CLAIMED';
    }
    return null;
  }
}
