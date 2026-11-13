import { Injectable } from '@nestjs/common';
import type { PromotionSendRecord } from '../domain/notification.js';
import { PromotionSendRepository } from '../domain/port/promotion-send.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { PromotionDispatchService } from './promotion-dispatch.service.js';

// US-15 y US-49 (contrato S5 §3.7.4, CA-15.6): el proceso de los envíos programados. Corre cada minuto
// (PromotionsScheduler) y a demanda con `npm run promotions:send`.
@Injectable()
export class PromotionsProcessService {
  constructor(
    private readonly promotions: PromotionSendRepository,
    private readonly dispatcher: PromotionDispatchService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // Toma los SCHEDULED que ya están en hora (FOR UPDATE SKIP LOCKED), los pasa a SENT con `sentAt` y la cuenta real de
  // destinatarios, y **después del commit** manda los correos. Es idempotente: una segunda corrida no encuentra nada
  // (ya están SENT) y, aunque lo encontrara, la clave "promotion-send:{id}" evita correos repetidos. Un envío
  // cancelado antes no sale. Devuelve cuántos envíos sacó.
  async run(now: Date = new Date()): Promise<number> {
    const prepared = await this.transactionRunner.run(async () => {
      const due = await this.promotions.lockDueForSending(now);
      const result: { send: PromotionSendRecord; customerIds: number[] }[] = [];
      for (const send of due) {
        const customerIds = await this.promotions.findRecipientIds(send.level);
        await this.promotions.markSent(send.id, now, customerIds.length);
        result.push({ send, customerIds });
      }
      return result;
    });

    for (const { send, customerIds } of prepared) {
      await this.dispatcher.dispatch(send, customerIds);
    }
    return prepared.length;
  }
}
