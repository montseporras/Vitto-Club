import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { MissionsExpirationService } from '../application/missions-expiration.service.js';

// US-32, CA-32.1 (contrato S5 §3.4): el día 1 de cada mes a las 00:10, hora de Argentina (después del
// vencimiento de puntos de las 00:05), y una vez al iniciar el servidor.
export const MISSIONS_EXPIRATION_CRON = '10 0 1 * *';
export const MISSIONS_EXPIRATION_TIME_ZONE = 'America/Argentina/Cordoba';

// MISSIONS_EXPIRATION_CRON_ENABLED=false lo apaga (en los e2e). Sin la variable, queda prendido
// (desarrollo y producción). Mismo criterio que los demás procesos.
export function isMissionsExpirationCronEnabled(config: ConfigService): boolean {
  return config.get<string>('MISSIONS_EXPIRATION_CRON_ENABLED')?.trim().toLowerCase() !== 'false';
}

@Injectable()
export class MissionsExpirationScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(MissionsExpirationScheduler.name);

  constructor(
    private readonly expiration: MissionsExpirationService,
    private readonly config: ConfigService,
  ) {}

  @Cron(MISSIONS_EXPIRATION_CRON, {
    name: 'missions-expiration',
    timeZone: MISSIONS_EXPIRATION_TIME_ZONE,
  })
  async handleCron(): Promise<void> {
    // Se lee al momento de correr: así un cambio de la variable no depende del orden de carga
    if (!isMissionsExpirationCronEnabled(this.config)) return;
    await this.expiration.run();
  }

  // Al iniciar el servidor (y también al correr `npm run missions:expire`, que levanta el contexto de
  // Nest: ahí corre dos veces, sin efecto porque es idempotente, como en rewards). Si falla, queda en el
  // log y el servidor arranca igual.
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.handleCron();
    } catch (error) {
      this.logger.error(
        'No se pudo correr el fin de mes de misiones al iniciar',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
