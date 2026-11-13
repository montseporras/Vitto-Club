import { Injectable } from '@nestjs/common';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import {
  NotificationConfigRepository,
  type NotificationSettingsRecord,
  type TemplateChange,
} from '../domain/port/notification-config.repository.js';
import type { AutomaticNotificationType, NotificationTemplateRecord } from '../domain/notification.js';
import { sortAutomaticMessages } from '../domain/notification-messages.js';

// notification_templates solo tiene filas de los tipos automáticos (CHECK type <> 'PROMOTION'), así que el tipo
// que sale de la base entra tal cual en el tipo del dominio.
const toTemplate = (row: {
  type: string;
  active: boolean;
  subject: string;
  body: string;
  updatedAt: Date;
}): NotificationTemplateRecord => ({ ...row, type: row.type as AutomaticNotificationType });

// BASE-5 y US-14: implementación de Prisma de NotificationConfigRepository. Usa el client de
// PrismaTransactionRunner para participar de la transacción ambiente, igual que los demás módulos.
@Injectable()
export class NotificationConfigPrismaRepository implements NotificationConfigRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async findTemplates(): Promise<NotificationTemplateRecord[]> {
    const rows = await this.prisma.notificationTemplate.findMany();
    return sortAutomaticMessages(rows.map(toTemplate));
  }

  async findTemplate(type: AutomaticNotificationType): Promise<NotificationTemplateRecord | null> {
    const row = await this.prisma.notificationTemplate.findUnique({ where: { type } });
    return row ? toTemplate(row) : null;
  }

  async findSettings(): Promise<NotificationSettingsRecord> {
    const row = await this.prisma.notificationSettings.findUnique({ where: { id: 1 } });
    if (!row) {
      // La migración de BASE-5 la carga: si falta, la base está mal armada y no hay nada que adivinar
      throw new Error('Falta la fila única de notification_settings (id = 1)');
    }
    return { birthdayBonusPoints: row.birthdayBonusPoints };
  }

  async lockSettings(): Promise<NotificationSettingsRecord> {
    await this.prisma.$queryRaw`SELECT id FROM notification_settings WHERE id = 1 FOR UPDATE`;
    return await this.findSettings();
  }

  async saveTemplate(type: AutomaticNotificationType, change: TemplateChange): Promise<void> {
    await this.prisma.notificationTemplate.update({
      where: { type },
      data: { active: change.active, subject: change.subject, body: change.body },
    });
  }

  async saveBirthdayBonusPoints(points: number): Promise<void> {
    await this.prisma.notificationSettings.update({ where: { id: 1 }, data: { birthdayBonusPoints: points } });
  }
}
