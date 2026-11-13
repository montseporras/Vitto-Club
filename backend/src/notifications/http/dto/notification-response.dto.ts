import type { NotificationListItem } from '../../domain/port/notification.repository.js';

// Una fila del historial, con exactamente los campos del contrato S5 §3.8.4. No se devuelven el mensaje, el
// motivo ("dedupe_key") ni el envío de promoción: la pantalla no los usa.
export function toNotificationDto(item: NotificationListItem) {
  return {
    id: item.id,
    createdAt: item.createdAt,
    type: item.type,
    channel: item.channel,
    recipient: item.recipient,
    customer: {
      id: item.customer.id,
      firstName: item.customer.firstName,
      lastName: item.customer.lastName,
      documentType: item.customer.documentType,
      documentNumber: item.customer.documentNumber,
    },
    subject: item.subject,
    status: item.status,
    error: item.error,
    // Si este registro es el reenvío de otro, el id del que había fallado
    resentFromId: item.resentFromId,
    // true si este registro FAILED ya se reenvió
    resent: item.resent,
  };
}
