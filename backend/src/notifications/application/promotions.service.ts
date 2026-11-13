import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PromotionLevel, PromotionSendWithCreator } from '../domain/notification.js';
import { PromotionSendRepository } from '../domain/port/promotion-send.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import {
  parseScheduledAt,
  PROMOTION_SEND_NOT_CANCELLABLE_MESSAGE,
  PROMOTION_SEND_NOT_FOUND,
  validatePromotionVariables,
} from '../domain/promotions.js';
import { BackgroundTasks } from './background-tasks.js';
import { PromotionDispatchService } from './promotion-dispatch.service.js';

// Código de error del contrato S5 §5 y §3.7.4
export const PROMOTION_SEND_NOT_CANCELLABLE = 'PROMOTION_SEND_NOT_CANCELLABLE';

export type CreatePromotionInput = {
  subject: string;
  body: string;
  // null o sin valor = todos los clientes activos
  level?: PromotionLevel | null;
  // ISO 8601 con zona. null o sin valor = se envía ahora
  scheduledAt?: string | null;
};

// Un envío tal como lo devuelve la API: `recipients` de un SCHEDULED es la cuenta al momento de la consulta; la de
// uno que ya salió es la cuenta real (contrato §3.7.1)
export type PromotionSendView = PromotionSendWithCreator & { recipients: number };

export type CreatePromotionResult =
  // "Ahora": 202 { id, queued }
  | { kind: 'NOW'; id: number; queued: number }
  // Programado: 201 PromotionSend
  | { kind: 'SCHEDULED'; send: PromotionSendView };

// US-15 (contrato S5 §3.7): enviar una promoción ahora o programarla, ver los programados y cancelarlos. Una promoción NO
// se guarda como catálogo (S5-36): solo queda el envío. No se audita (S5-28): los envíos quedan en el historial de
// notificaciones.
@Injectable()
export class PromotionsService {
  constructor(
    private readonly promotions: PromotionSendRepository,
    private readonly dispatcher: PromotionDispatchService,
    private readonly background: BackgroundTasks,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // GET /api/promociones/destinatarios (§3.7.2): "Le llega a {n} clientes activos."
  async countRecipients(level: PromotionLevel | null): Promise<{ count: number }> {
    return { count: await this.promotions.countRecipients(level) };
  }

  // POST /api/promociones/envios (§3.7.3, CA-15.2 a CA-15.4)
  async create(
    input: CreatePromotionInput,
    actor: { employeeId: number },
    now: Date = new Date(),
  ): Promise<CreatePromotionResult> {
    validatePromotionVariables(input.subject, input.body);
    const scheduledAt = parseScheduledAt(input.scheduledAt, now);
    const level = input.level ?? null;

    if (scheduledAt) {
      // Programado: se guarda SCHEDULED y sale con el proceso de cada minuto. Si no hay destinatarios, igual se guarda
      const send = await this.promotions.create({
        subject: input.subject,
        body: input.body,
        level,
        scheduledAt,
        status: 'SCHEDULED',
        sentAt: null,
        recipients: null,
        createdByEmployeeId: actor.employeeId,
      });
      return { kind: 'SCHEDULED', send: { ...send, recipients: await this.promotions.countRecipients(level) } };
    }

    // Ahora: se guarda SENT con la cuenta real y los correos salen en segundo plano, de a uno: la respuesta no espera
    // a los correos (CA-49.3). Sin destinatarios, igual se guarda y sale con 0 correos (no es un error)
    const customerIds = await this.promotions.findRecipientIds(level);
    const send = await this.promotions.create({
      subject: input.subject,
      body: input.body,
      level,
      scheduledAt: null,
      status: 'SENT',
      sentAt: now,
      recipients: customerIds.length,
      createdByEmployeeId: actor.employeeId,
    });
    this.background.run(() => this.dispatcher.dispatch(send, customerIds));
    return { kind: 'NOW', id: send.id, queued: customerIds.length };
  }

  // GET /api/promociones/envios (§3.7.4, CA-15.5): los SCHEDULED, por fecha programada ascendente, sin paginado
  async listScheduled(): Promise<PromotionSendView[]> {
    const sends = await this.promotions.findScheduled();
    // Una sola cuenta por nivel distinto, no una por envío
    const counts = new Map<PromotionLevel | null, number>();
    const views: PromotionSendView[] = [];
    for (const send of sends) {
      if (!counts.has(send.level)) {
        counts.set(send.level, await this.promotions.countRecipients(send.level));
      }
      views.push({ ...send, recipients: counts.get(send.level) as number });
    }
    return views;
  }

  // PATCH /api/promociones/envios/:id/cancelar (§3.7.4, CA-15.5). Con el envío bloqueado: si el proceso de programados
  // lo está sacando a la vez, uno espera al otro y solo uno gana.
  async cancel(id: number, now: Date = new Date()): Promise<PromotionSendView> {
    const cancelled = await this.transactionRunner.run(async () => {
      const send = await this.promotions.lockById(id);
      if (!send) {
        throw new NotFoundException(PROMOTION_SEND_NOT_FOUND);
      }
      if (send.status !== 'SCHEDULED') {
        throw new ConflictException({
          message: PROMOTION_SEND_NOT_CANCELLABLE_MESSAGE,
          code: PROMOTION_SEND_NOT_CANCELLABLE,
        });
      }
      return await this.promotions.markCancelled(id, now);
    });
    return { ...cancelled, recipients: await this.promotions.countRecipients(cancelled.level) };
  }
}
