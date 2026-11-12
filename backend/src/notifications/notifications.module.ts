import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailSender } from './domain/port/email-sender.js';
import { NotificationConfigRepository } from './domain/port/notification-config.repository.js';
import { NotificationRepository } from './domain/port/notification.repository.js';
import { PromotionSendRepository } from './domain/port/promotion-send.repository.js';
import { LogEmailSender } from './infrastructure/log-email-sender.js';
import { NotificationConfigPrismaRepository } from './infrastructure/notification-config.repository.js';
import { isEmailSendingEnabled, readResendConfig } from './infrastructure/notifications.config.js';
import { NotificationsPrismaRepository } from './infrastructure/notifications.repository.js';
import { PromotionSendsPrismaRepository } from './infrastructure/promotion-sends.repository.js';
import { ResendEmailSender } from './infrastructure/resend-email-sender.js';

// BASE-5 (contrato S5 §8.4): esqueleto del módulo `notifications` (plantillas, puntos de cumpleaños,
// envíos de promociones, envío, registro, reenvío y los procesos). Tiene los repositorios, sin
// operaciones, y el puerto EmailSender: con NOTIFICATIONS_EMAIL_ENABLED=true manda con Resend; si no,
// solo deja el envío en el log. El SDK se carga recién cuando hace falta, así que sin el envío prendido
// nunca se toca. Los endpoints, el envío y los procesos los agregan US-14, US-15 y US-47 a US-50.
// Dependencias, sin ciclos: `notifications` usará `points` (lotes por vencer y regalo de cumpleaños) y
// leerá `customers` por Prisma; atiende `mission.completed` de `missions` después del commit.
@Module({
  providers: [
    { provide: NotificationRepository, useClass: NotificationsPrismaRepository },
    { provide: NotificationConfigRepository, useClass: NotificationConfigPrismaRepository },
    { provide: PromotionSendRepository, useClass: PromotionSendsPrismaRepository },
    {
      provide: EmailSender,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<EmailSender> => {
        if (!isEmailSendingEnabled(config)) {
          return new LogEmailSender();
        }
        const { apiKey, from } = readResendConfig(config);
        const { Resend } = await import('resend');
        return new ResendEmailSender(new Resend(apiKey), from);
      },
    },
  ],
  exports: [EmailSender],
})
export class NotificationsModule {}
