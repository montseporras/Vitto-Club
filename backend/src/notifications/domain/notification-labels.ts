import type { NotificationType } from './notification.js';

// Nombres de pantalla de cada tipo de notificación (contrato S5 §2.4)
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  POINTS_EXPIRING: 'Vencimiento de puntos',
  BIRTHDAY: 'Cumpleaños',
  PROMOTION: 'Promociones',
  MISSION: 'Misiones',
};

// En minúscula, para dentro de una frase: "Las notificaciones de vencimiento de puntos están desactivadas."
export const notificationTypeInSentence = (type: NotificationType): string =>
  NOTIFICATION_TYPE_LABELS[type].toLowerCase();
