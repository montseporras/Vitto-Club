import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module.js';
import { PointsModule } from '../points/points.module.js';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';
import { BackgroundTasks } from './application/background-tasks.js';
import { NotificationMessagesService } from './application/notification-messages.service.js';
import { NotificationsDailyService } from './application/notifications-daily.service.js';
import { NotificationsService } from './application/notifications.service.js';
import { PromotionDispatchService } from './application/promotion-dispatch.service.js';
import { PromotionsProcessService } from './application/promotions-process.service.js';
import { PromotionsService } from './application/promotions.service.js';
import { EmailSender } from './domain/port/email-sender.js';
import { NotificationConfigRepository } from './domain/port/notification-config.repository.js';
import { NotificationRepository } from './domain/port/notification.repository.js';
import { PromotionSendRepository } from './domain/port/promotion-send.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { NotificationMessagesController } from './http/notification-messages.controller.js';
import { NotificationsController } from './http/notifications.controller.js';
import { PromotionsController } from './http/promotions.controller.js';
import { LogEmailSender } from './infrastructure/log-email-sender.js';
import { NotificationConfigPrismaRepository } from './infrastructure/notification-config.repository.js';
import { isEmailSendingEnabled, readResendConfig } from './infrastructure/notifications.config.js';
import { NotificationsPrismaRepository } from './infrastructure/notifications.repository.js';
import { PromotionSendsPrismaRepository } from './infrastructure/promotion-sends.repository.js';
import { NotificationsScheduler } from './infrastructure/notifications.scheduler.js';
import { PromotionsScheduler } from './infrastructure/promotions.scheduler.js';
import { ResendEmailSender } from './infrastructure/resend-email-sender.js';

// BASE-5 (contrato S5 §8.4): módulo `notifications` (plantillas, puntos de cumpleaños, envíos de promociones, envío,
// registro y reenvío, y los procesos). Puerto EmailSender: con NOTIFICATIONS_EMAIL_ENABLED=true manda con Resend; si no,
// solo deja el envío en el log. El SDK se carga recién cuando hace falta, así que sin el envío prendido nunca se toca.
// US-14: mensajes automáticos (`/configuracion/mensajes`), envío común, reenvío e historial (`/notificaciones`). La
// auditoría del guardado usa AuditModule, que no importa a ningún módulo de negocio, así que no se arma un ciclo.
// US-15 y US-49: envío de promociones (`/promociones/*`), ahora o programadas, y su proceso de cada minuto.
// US-47 y US-48: proceso diario de las 09:00 (puntos por vencer y regalo de cumpleaños). US-50 agrega su envío usando
// NotificationsService.enviar.
// Dependencias, sin ciclos: `notifications` usa `points` (lotes por vencer y regalo de cumpleaños) y lee
// `customers` por Prisma; atiende `mission.completed` de `missions` después del commit.
@Module({
  imports: [AuditModule, PointsModule],
  controllers: [NotificationMessagesController, NotificationsController, PromotionsController],
  providers: [
    NotificationMessagesService,
    NotificationsService,
    PromotionsService,
    PromotionDispatchService,
    PromotionsProcessService,
    PromotionsScheduler,
    NotificationsDailyService,
    NotificationsScheduler,
    BackgroundTasks,
    { provide: NotificationRepository, useClass: NotificationsPrismaRepository },
    { provide: NotificationConfigRepository, useClass: NotificationConfigPrismaRepository },
    { provide: PromotionSendRepository, useClass: PromotionSendsPrismaRepository },
    { provide: TransactionRunner, useExisting: PrismaTransactionRunner },
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
  exports: [EmailSender, NotificationsService],
})
export class NotificationsModule {}
