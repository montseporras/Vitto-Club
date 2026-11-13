import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { birthdayBonusGrantedEntry } from '../../audit/domain/audit-entries.js';
import { PointsService } from '../../points/application/points.service.js';
import {
  argentinaDayOf,
  argentinaYearPeriod,
  BIRTHDAY_GREETING_WITHOUT_GIFT,
  birthdayDatesFor,
  formatArgentinaDate,
  formatPointsValue,
} from '../domain/daily-notifications.js';
import { NotificationConfigRepository } from '../domain/port/notification-config.repository.js';
import { NotificationRepository, type BirthdayCustomer } from '../domain/port/notification.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { NotificationsService } from './notifications.service.js';

export type DailyRunResult = {
  // Clientes que cumplen años hoy y a los que se les procesó el cumpleaños
  birthdays: number;
  // Regalos de cumpleaños acreditados en esta corrida
  birthdayGifts: number;
  // Lotes por vencer a los que se les procesó el aviso
  expiringLots: number;
  // Clientes o lotes que fallaron por un error inesperado (quedan en el log; no frenan a los demás)
  failures: number;
};

// US-47 y US-48 (contrato S5 §3.8): el proceso diario de avisos, a las 09:00 hora de Argentina (NotificationsScheduler) y
// a demanda con `npm run notifications:send`. Primero los cumpleaños y después los vencimientos de puntos.
@Injectable()
export class NotificationsDailyService {
  private readonly logger = new Logger(NotificationsDailyService.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly notificationRepository: NotificationRepository,
    private readonly config: NotificationConfigRepository,
    private readonly points: PointsService,
    private readonly audit: AuditService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // Es idempotente: una segunda corrida el mismo día no regala ni manda nada de nuevo (el regalo es una vez por año y los
  // correos llevan una clave por motivo). Un error con un cliente o un lote se registra y se sigue con el resto.
  async run(now: Date = new Date()): Promise<DailyRunResult> {
    const result: DailyRunResult = { birthdays: 0, birthdayGifts: 0, expiringLots: 0, failures: 0 };
    await this.processBirthdays(now, result);
    await this.processExpiringLots(now, result);
    this.logger.log(
      `Avisos diarios: ${result.birthdays} cumpleaños (${result.birthdayGifts} regalos), ` +
        `${result.expiringLots} lotes por vencer, ${result.failures} fallas`,
    );
    return result;
  }

  // US-48
  private async processBirthdays(now: Date, result: DailyRunResult): Promise<void> {
    const today = argentinaDayOf(now);
    const customers = await this.notificationRepository.findBirthdayCustomers(birthdayDatesFor(today));
    if (customers.length === 0) return;

    // Se leen una vez por corrida; el Administrador los puede cambiar entre un día y otro
    const template = await this.config.findTemplate('BIRTHDAY');
    if (!template) throw new Error('Falta la plantilla del mensaje BIRTHDAY');
    const { birthdayBonusPoints } = await this.config.findSettings();
    const period = argentinaYearPeriod(today.year);

    for (const customer of customers) {
      result.birthdays += 1;
      try {
        if (await this.processBirthday(customer, today.year, template.active, birthdayBonusPoints, period)) {
          result.birthdayGifts += 1;
        }
      } catch (error) {
        result.failures += 1;
        this.logger.error(
          `No se pudo procesar el cumpleaños del cliente ${customer.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  // Devuelve true si acreditó el regalo
  private async processBirthday(
    customer: BirthdayCustomer,
    year: number,
    templateActive: boolean,
    bonusPoints: number,
    period: { from: Date; to: Date },
  ): Promise<boolean> {
    const reason = `birthday:${year}`;

    // Con el tipo desactivado no se regala ni se manda (S5-25); `enviar` deja el registro SKIPPED, una vez por año
    if (!templateActive) {
      await this.notifications.enviar({
        type: 'BIRTHDAY',
        customerId: customer.id,
        reason,
        variables: { puntos: formatPointsValue(bonusPoints) },
      });
      return false;
    }

    // 0 puntos: no se regala y el correo es solo el saludo, sin hablar de puntos
    if (bonusPoints === 0) {
      await this.notifications.enviar({
        type: 'BIRTHDAY',
        customerId: customer.id,
        reason,
        textOverride: BIRTHDAY_GREETING_WITHOUT_GIFT,
      });
      return false;
    }

    // El regalo y su auditoría van en una misma transacción: si la auditoría falla, no queda el regalo
    const granted = await this.transactionRunner.run(async () => {
      const mutation = await this.points.acreditarBonificacionUnaVez(
        { customerId: customer.id, type: 'BIRTHDAY_BONUS', points: bonusPoints },
        period,
      );
      if (mutation) {
        await this.audit.record(birthdayBonusGrantedEntry(customer, { points: bonusPoints, balanceAfter: mutation.balanceAfter }));
      }
      return mutation !== null;
    });

    // DESPUÉS del commit: el correo nunca deshace el regalo. Si ya se había regalado este año, `enviar` no repite el correo
    // cuando ya hay registro; si falló antes de registrarse, lo manda ahora.
    await this.notifications.enviar({
      type: 'BIRTHDAY',
      customerId: customer.id,
      reason,
      variables: { puntos: formatPointsValue(bonusPoints) },
    });
    return granted;
  }

  // US-47: un correo por lote que vence en los próximos 7 días
  private async processExpiringLots(now: Date, result: DailyRunResult): Promise<void> {
    const lots = await this.points.lotesPorVencer(now);
    for (const lot of lots) {
      try {
        await this.notifications.enviar({
          type: 'POINTS_EXPIRING',
          customerId: lot.customerId,
          reason: `lot:${lot.lotId}`,
          variables: { puntos: formatPointsValue(lot.remainingPoints), fecha: formatArgentinaDate(lot.expiresAt) },
        });
        result.expiringLots += 1;
      } catch (error) {
        result.failures += 1;
        this.logger.error(
          `No se pudo procesar el aviso del lote ${lot.lotId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
