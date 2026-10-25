import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PointsExpirationService } from '../application/points-expiration.service.js';

// US-25, CA-25.1: todos los días a las 00:05, hora de Argentina (§3.6.3).
export const POINTS_EXPIRATION_CRON = '5 0 * * *';
export const POINTS_EXPIRATION_TIME_ZONE = 'America/Argentina/Cordoba';

// CA-25.6 (P7, decisión de Melisa): POINTS_EXPIRATION_CRON_ENABLED=false lo apaga (en los e2e).
// Sin la variable, queda prendido (desarrollo y producción).
export function isPointsExpirationCronEnabled(config: ConfigService): boolean {
  return config.get<string>('POINTS_EXPIRATION_CRON_ENABLED')?.trim().toLowerCase() !== 'false';
}

@Injectable()
export class PointsExpirationScheduler {
  constructor(
    private readonly expiration: PointsExpirationService,
    private readonly config: ConfigService,
  ) {}

  @Cron(POINTS_EXPIRATION_CRON, {
    name: 'points-expiration',
    timeZone: POINTS_EXPIRATION_TIME_ZONE,
  })
  async handleCron(): Promise<void> {
    // Se lee al momento de correr: así un cambio de la variable no depende del orden de carga
    if (!isPointsExpirationCronEnabled(this.config)) return;
    await this.expiration.run();
  }
}
