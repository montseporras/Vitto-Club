import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import type { PromotionLevel, PromotionSendRecord, PromotionSendWithCreator } from '../domain/notification.js';
import {
  PromotionSendRepository,
  type NewPromotionSend,
} from '../domain/port/promotion-send.repository.js';

const CREATOR_SELECT = { id: true, firstName: true, lastName: true } as const;

const toRecord = (row: {
  id: number;
  subject: string;
  body: string;
  level: string | null;
  scheduledAt: Date | null;
  status: string;
  sentAt: Date | null;
  cancelledAt: Date | null;
  recipients: number | null;
  createdByEmployeeId: number;
  createdAt: Date;
}): PromotionSendRecord => ({
  ...row,
  level: row.level as PromotionLevel | null,
  status: row.status as PromotionSendRecord['status'],
});

// BASE-5, US-15 y US-49: implementación de Prisma de PromotionSendRepository. Usa el client de
// PrismaTransactionRunner para participar de la transacción ambiente, igual que los demás módulos.
@Injectable()
export class PromotionSendsPrismaRepository implements PromotionSendRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async create(data: NewPromotionSend): Promise<PromotionSendWithCreator> {
    const row = await this.prisma.promotionSend.create({
      data: {
        subject: data.subject,
        body: data.body,
        level: data.level,
        scheduledAt: data.scheduledAt,
        status: data.status,
        sentAt: data.sentAt,
        recipients: data.recipients,
        createdByEmployeeId: data.createdByEmployeeId,
      },
      include: { createdBy: { select: CREATOR_SELECT } },
    });
    const { createdBy, ...record } = row;
    return { ...toRecord(record), createdBy };
  }

  async findScheduled(): Promise<PromotionSendWithCreator[]> {
    const rows = await this.prisma.promotionSend.findMany({
      where: { status: 'SCHEDULED' },
      orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
      include: { createdBy: { select: CREATOR_SELECT } },
    });
    return rows.map(({ createdBy, ...record }) => ({ ...toRecord(record), createdBy }));
  }

  async lockById(id: number): Promise<PromotionSendRecord | null> {
    const locked = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM promotion_sends WHERE id = ${id} FOR UPDATE
    `;
    if (locked.length === 0) return null;
    const row = await this.prisma.promotionSend.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async markCancelled(id: number, at: Date): Promise<PromotionSendWithCreator> {
    const row = await this.prisma.promotionSend.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: at },
      include: { createdBy: { select: CREATOR_SELECT } },
    });
    const { createdBy, ...record } = row;
    return { ...toRecord(record), createdBy };
  }

  async lockDueForSending(now: Date): Promise<PromotionSendRecord[]> {
    const locked = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM promotion_sends
      WHERE status = 'SCHEDULED' AND scheduled_at <= ${now}
      ORDER BY scheduled_at, id
      FOR UPDATE SKIP LOCKED
    `;
    if (locked.length === 0) return [];
    const rows = await this.prisma.promotionSend.findMany({
      where: { id: { in: locked.map((row) => row.id) } },
      orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toRecord);
  }

  async markSent(id: number, sentAt: Date, recipients: number): Promise<void> {
    await this.prisma.promotionSend.update({ where: { id }, data: { status: 'SENT', sentAt, recipients } });
  }

  async countRecipients(level: PromotionLevel | null): Promise<number> {
    return await this.prisma.customer.count({ where: await this.recipientsWhere(level) });
  }

  async findRecipientIds(level: PromotionLevel | null): Promise<number[]> {
    const rows = await this.prisma.customer.findMany({
      where: await this.recipientsWhere(level),
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    return rows.map((row) => row.id);
  }

  // Los clientes activos y, si hay nivel, los que hoy están en él (§3.7.1: el nivel ACTUAL, con los umbrales
  // vigentes). Bronce: menos que Plata, o sin fila de puntos (todavía no tuvo movimientos). Plata: desde Plata y
  // menos que Oro. Oro: desde Oro.
  private async recipientsWhere(level: PromotionLevel | null): Promise<Prisma.CustomerWhereInput> {
    if (level === null) return { isActive: true };
    const config = await this.prisma.loyaltyProgramConfiguration.findFirst({
      where: { isActive: true },
      select: { silverMinPoints: true, goldMinPoints: true },
    });
    if (!config) {
      throw new Error('No hay una configuración del programa activa: no se pueden calcular los niveles');
    }
    const { silverMinPoints, goldMinPoints } = config;
    switch (level) {
      case 'BRONZE':
        return {
          isActive: true,
          OR: [{ points: { is: null } }, { points: { is: { lifetimePoints: { lt: silverMinPoints } } } }],
        };
      case 'SILVER':
        return {
          isActive: true,
          points: { is: { lifetimePoints: { gte: silverMinPoints, lt: goldMinPoints } } },
        };
      case 'GOLD':
        return { isActive: true, points: { is: { lifetimePoints: { gte: goldMinPoints } } } };
    }
  }
}
