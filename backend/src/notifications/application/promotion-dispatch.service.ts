import { Injectable, Logger } from '@nestjs/common';
import type { PromotionSendRecord } from '../domain/notification.js';
import { NotificationsService } from './notifications.service.js';

// US-49 (contrato S5 §3.7.3, §3.7.4 y §3.8): manda una promoción a sus destinatarios, de a uno.
@Injectable()
export class PromotionDispatchService {
  private readonly logger = new Logger(PromotionDispatchService.name);

  constructor(private readonly notifications: NotificationsService) {}

  // Cada cliente recibe UN correo PROMOTION por envío (CA-49.1): la clave "promotion-send:{id}" hace que, si esto
  // corre dos veces (o el proceso se repite), `enviar` no mande otro. Un correo que falla queda FAILED y no frena a los
  // demás (CA-49.5); un error de programación con un cliente se registra en el log y se sigue con el resto.
  // Siempre se llama DESPUÉS del commit (CA-49.3): un correo nunca va dentro de una transacción.
  // El Resend real separa los envíos con una pausa (ResendEmailSender), por eso se manda de a uno.
  async dispatch(send: Pick<PromotionSendRecord, 'id' | 'subject' | 'body'>, customerIds: number[]): Promise<void> {
    for (const customerId of customerIds) {
      try {
        await this.notifications.enviar({
          type: 'PROMOTION',
          customerId,
          reason: `promotion-send:${send.id}`,
          promotionSendId: send.id,
          subject: send.subject,
          body: send.body,
        });
      } catch (error) {
        this.logger.error(
          `No se pudo registrar la promoción ${send.id} para el cliente ${customerId}: ${
            error instanceof Error ? (error.stack ?? error.message) : String(error)
          }`,
        );
      }
    }
  }
}
