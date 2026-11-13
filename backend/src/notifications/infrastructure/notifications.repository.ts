import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import type { MovementDateRange } from '../../points/domain/movement-filters.js';
import {
  NotificationRepository,
  type NewNotification,
  type NotificationCustomer,
  type NotificationListFilters,
  type NotificationListItem,
} from '../domain/port/notification.repository.js';
import type { NotificationRecord, NotificationType } from '../domain/notification.js';

const CUSTOMER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  documentType: true,
  documentNumber: true,
} as const;

// Por createdAt, con el mismo criterio que los demás listados (toDate inclusivo ya viene resuelto)
function createdAtWhere(range: MovementDateRange): Prisma.NotificationWhereInput {
  const { createdFrom, createdBefore } = range;
  if (!createdFrom && !createdBefore) return {};
  return {
    createdAt: {
      ...(createdFrom ? { gte: createdFrom } : {}),
      ...(createdBefore ? { lt: createdBefore } : {}),
    },
  };
}

const toRecord = (row: {
  id: number;
  type: string;
  channel: string;
  recipient: string;
  customerId: number;
  subject: string;
  body: string;
  status: string;
  error: string | null;
  dedupeKey: string;
  promotionSendId: number | null;
  resentFromId: number | null;
  createdAt: Date;
}): NotificationRecord => ({
  ...row,
  type: row.type as NotificationRecord['type'],
  channel: row.channel as NotificationRecord['channel'],
  status: row.status as NotificationRecord['status'],
});

// BASE-5 y US-14: implementación de Prisma de NotificationRepository. Usa el client de
// PrismaTransactionRunner para participar de la transacción ambiente, igual que los demás módulos.
@Injectable()
export class NotificationsPrismaRepository implements NotificationRepository {
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async create(data: NewNotification): Promise<NotificationRecord> {
    const row = await this.prisma.notification.create({
      data: {
        ...(data.id === undefined ? {} : { id: data.id }),
        type: data.type,
        // El único canal (S5-10)
        channel: 'EMAIL',
        recipient: data.recipient,
        customerId: data.customerId,
        subject: data.subject,
        body: data.body,
        status: data.status,
        error: data.error,
        dedupeKey: data.dedupeKey,
        promotionSendId: data.promotionSendId,
        resentFromId: data.resentFromId,
      },
    });
    return toRecord(row);
  }

  async findById(id: number): Promise<NotificationRecord | null> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async existsForReason(type: NotificationType, customerId: number, dedupeKey: string): Promise<boolean> {
    const row = await this.prisma.notification.findUnique({
      where: { type_customerId_dedupeKey: { type, customerId, dedupeKey } },
      select: { id: true },
    });
    return row !== null;
  }

  async existsResendOf(id: number): Promise<boolean> {
    const row = await this.prisma.notification.findUnique({ where: { resentFromId: id }, select: { id: true } });
    return row !== null;
  }

  async reserveId(): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ id: bigint }[]>`
      SELECT nextval(pg_get_serial_sequence('notifications', 'id')) AS id
    `;
    return Number(rows[0].id);
  }

  async findCustomer(customerId: number): Promise<NotificationCustomer | null> {
    return await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, firstName: true, email: true },
    });
  }

  async list(filters: NotificationListFilters): Promise<{ items: NotificationListItem[]; total: number }> {
    const where: Prisma.NotificationWhereInput = {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.document
        ? { customer: { documentType: filters.document.type, documentNumber: { contains: filters.document.number } } }
        : {}),
      ...createdAtWhere(filters.range),
    };
    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        // Por fecha descendente y, a igual fecha, por id, para que el paginado sea estable
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          customer: { select: CUSTOMER_SELECT },
          // Si hay una fila que apunta a esta, ya se reenvió
          resends: { select: { id: true }, take: 1 },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      items: rows.map(({ customer, resends, ...row }) => ({ ...toRecord(row), customer, resent: resends.length > 0 })),
      total,
    };
  }
}
