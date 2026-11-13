import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PromotionsProcessService } from '../application/promotions-process.service.js';

// US-15, CA-15.6 (contrato S5 §3.7.4): el proceso de los envíos programados corre cada minuto.
export const PROMOTIONS_CRON = '* * * * *';

// CA-15.6: PROMOTIONS_CRON_ENABLED=false lo apaga (en los e2e). Sin la variable, queda prendido (desarrollo y
// producción). Mismo criterio que POINTS_EXPIRATION_CRON_ENABLED (US-25).
export function isPromotionsCronEnabled(config: ConfigService): boolean {
  return config.get<string>('PROMOTIONS_CRON_ENABLED')?.trim().toLowerCase() !== 'false';
}

@Injectable()
export class PromotionsScheduler {
  private readonly logger = new Logger(PromotionsScheduler.name);

  constructor(
    private readonly process: PromotionsProcessService,
    private readonly config: ConfigService,
  ) {}

  @Cron(PROMOTIONS_CRON, { name: 'promotions-send' })
  async handleCron(): Promise<void> {
    // Se lee al momento de correr: así un cambio de la variable no depende del orden de carga
    if (!isPromotionsCronEnabled(this.config)) return;
    try {
      await this.process.run();
    } catch (error) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }
  }
}
