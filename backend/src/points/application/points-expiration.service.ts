import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { pointsExpiredEntry } from '../../audit/domain/audit-entries.js';
import { ExpirationRunResult, PointsService } from './points.service.js';

// US-25 (§3.6.3): el proceso de vencimiento de puntos. Lo disparan el cron diario
// (PointsExpirationScheduler) y el comando a demanda (expire-points.ts). No tiene endpoint HTTP.
// Por cada lote vencido escribe la auditoría POINTS_EXPIRED con actor Sistema, en la misma
// transacción que el vencimiento (§3.9.1, reglas 6 y 7).
@Injectable()
export class PointsExpirationService {
  private readonly logger = new Logger(PointsExpirationService.name);

  constructor(
    private readonly pointsService: PointsService,
    private readonly auditService: AuditService,
  ) {}

  // "Ahora" es la hora del servidor al empezar la corrida: vencen los lotes con expiresAt <= now
  async run(now: Date = new Date()): Promise<ExpirationRunResult> {
    const result = await this.pointsService.vencerLotes(now, async (expired) => {
      await this.auditService.record(
        pointsExpiredEntry(expired.customer, {
          points: expired.points,
          accreditedAt: expired.accreditedAt,
          balanceAfter: expired.balanceAfter,
        }),
      );
    });
    this.logger.log(
      `Vencimiento de puntos: ${result.expiredLots} lotes, ${result.expiredPoints} puntos`,
    );
    // Un lote que falló queda como estaba (su transacción se deshizo) y se reintenta mañana
    for (const failure of result.failures) {
      this.logger.error(
        `No se pudo vencer el lote ${failure.lotId}`,
        failure.error instanceof Error ? failure.error.stack : String(failure.error),
      );
    }
    return result;
  }
}
