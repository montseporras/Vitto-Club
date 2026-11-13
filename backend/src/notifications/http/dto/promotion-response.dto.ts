import type { PromotionSendView } from '../../application/promotions.service.js';

// Un envío de promoción con exactamente los campos del contrato S5 §3.7.1. No se devuelve `cancelledAt`.
export function toPromotionSendDto(send: PromotionSendView) {
  return {
    id: send.id,
    subject: send.subject,
    body: send.body,
    level: send.level,
    scheduledAt: send.scheduledAt,
    status: send.status,
    recipients: send.recipients,
    sentAt: send.sentAt,
    createdBy: { id: send.createdBy.id, firstName: send.createdBy.firstName, lastName: send.createdBy.lastName },
    createdAt: send.createdAt,
  };
}
