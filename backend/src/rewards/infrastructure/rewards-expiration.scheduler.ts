import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { RewardsAvailabilityService } from '../application/rewards-availability.service.js';

// US-37, CA-37.2 y CA-37.4 (contrato S4 §3.4): todos los días a las 00:05, hora de Argentina, junto
// con el vencimiento de puntos de US-25, y una vez al iniciar el servidor.
export const REWARDS_EXPIRATION_CRON = '5 0 * * *';
export const REWARDS_EXPIRATION_TIME_ZONE = 'America/Argentina/Cordoba';

// CA-37.7: REWARDS_EXPIRATION_CRON_ENABLED=false lo apaga (en los e2e). Sin la variable, queda
// prendido (desarrollo y producción). Mismo criterio que US-25 y US-44.
export function isRewardsExpirationCronEnabled(config: ConfigService): boolean {
  return config.get<string>('REWARDS_EXPIRATION_CRON_ENABLED')?.trim().toLowerCase() !== 'false';
}

@Injectable()
export class RewardsExpirationScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(RewardsExpirationScheduler.name);

  constructor(
    private readonly availability: RewardsAvailabilityService,
    private readonly config: ConfigService,
  ) {}

  @Cron(REWARDS_EXPIRATION_CRON, {
    name: 'rewards-expiration',
    timeZone: REWARDS_EXPIRATION_TIME_ZONE,
  })
  async handleCron(): Promise<void> {
    // Se lee al momento de correr: así un cambio de la variable no depende del orden de carga
    if (!isRewardsExpirationCronEnabled(this.config)) return;
    await this.availability.runDailyExpiration();
  }

  // CA-37.4: al iniciar el servidor (y también al correr `npm run rewards:expire`, que levanta el
  // contexto de Nest: ahí corre dos veces, sin efecto porque es idempotente; decisión de Melisa). Si
  // falla, se deja en el log y el servidor arranca igual: la disponibilidad se calcula con la fecha
  // (§3.1), así que una vencida sin marcar igual no se puede canjear.
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.handleCron();
    } catch (error) {
      this.logger.error(
        'No se pudo correr el vencimiento de recompensas al iniciar',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
