import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { RedemptionsExpirationService } from '../application/redemptions-expiration.service.js';

// US-44, CA-44.3 (contrato S4 §3.11): el barrido corre cada 5 minutos y una vez al iniciar.
export const REDEMPTIONS_EXPIRATION_CRON = '*/5 * * * *';

// CA-44.7: REDEMPTIONS_EXPIRATION_CRON_ENABLED=false lo apaga (en los e2e). Sin la variable, queda
// prendido (desarrollo y producción). Mismo criterio que POINTS_EXPIRATION_CRON_ENABLED (US-25).
export function isRedemptionsExpirationCronEnabled(config: ConfigService): boolean {
  return config.get<string>('REDEMPTIONS_EXPIRATION_CRON_ENABLED')?.trim().toLowerCase() !== 'false';
}

@Injectable()
export class RedemptionsExpirationScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(RedemptionsExpirationScheduler.name);

  constructor(
    private readonly expiration: RedemptionsExpirationService,
    private readonly config: ConfigService,
  ) {}

  @Cron(REDEMPTIONS_EXPIRATION_CRON, { name: 'redemptions-expiration' })
  async handleCron(): Promise<void> {
    // Se lee al momento de correr: así un cambio de la variable no depende del orden de carga
    if (!isRedemptionsExpirationCronEnabled(this.config)) return;
    await this.expiration.run();
  }

  // Al iniciar el servidor (y también al correr `npm run redemptions:expire`, que levanta el
  // contexto de Nest: ahí corre dos veces, sin efecto porque es idempotente; decisión de Melisa).
  // Si falla (por ejemplo, la base no responde), se deja en el log y el servidor arranca igual: el
  // "vencer al leer" sigue protegiendo y el próximo barrido lo reintenta.
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.handleCron();
    } catch (error) {
      this.logger.error(
        'No se pudo correr el vencimiento de canjes al iniciar',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
