import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { NotificationsDailyService } from '../application/notifications-daily.service.js';

// US-47 y US-48 (contrato S5 §3.8.1): el proceso diario de avisos corre a las 09:00, hora de Argentina.
export const NOTIFICATIONS_CRON = '0 9 * * *';
export const NOTIFICATIONS_CRON_TIME_ZONE = 'America/Argentina/Buenos_Aires';

// NOTIFICATIONS_CRON_ENABLED=false lo apaga (en los e2e). Sin la variable, queda prendido. Mismo criterio que
// POINTS_EXPIRATION_CRON_ENABLED (US-25). No corre al iniciar el servidor: para eso, `npm run notifications:send`.
export function isNotificationsCronEnabled(config: ConfigService): boolean {
  return config.get<string>('NOTIFICATIONS_CRON_ENABLED')?.trim().toLowerCase() !== 'false';
}

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly daily: NotificationsDailyService,
    private readonly config: ConfigService,
  ) {}

  @Cron(NOTIFICATIONS_CRON, { name: 'notifications-daily', timeZone: NOTIFICATIONS_CRON_TIME_ZONE })
  async handleCron(): Promise<void> {
    if (!isNotificationsCronEnabled(this.config)) return;
    try {
      await this.daily.run();
    } catch (error) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }
  }
}
