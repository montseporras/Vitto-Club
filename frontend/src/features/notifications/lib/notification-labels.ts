// Textos de pantalla de las notificaciones: los de los enums del contrato S5 (§2.4 y §2.6) y los
// del prototipo (ConfigNotificaciones.html).
import type {
  AutomaticNotificationType,
  NotificationStatus,
  NotificationType,
} from '../types/notifications'

// §2.4
export const NOTIFICATION_TYPES: Record<NotificationType, string> = {
  POINTS_EXPIRING: 'Vencimiento de puntos',
  BIRTHDAY: 'Cumpleaños',
  PROMOTION: 'Promociones',
  MISSION: 'Misiones',
}

// Orden de las filas de "Mensajes automáticos" (§3.6.2: Promociones no está)
export const AUTOMATIC_TYPES: AutomaticNotificationType[] = ['POINTS_EXPIRING', 'BIRTHDAY', 'MISSION']

// Prototipo: cuándo sale cada mensaje automático (debajo del nombre de la fila)
export const AUTOMATIC_WHEN: Record<AutomaticNotificationType, string> = {
  POINTS_EXPIRING: 'Todos los días a las 09:00, a quienes tienen puntos que vencen en 7 días.',
  BIRTHDAY: 'Todos los días a las 09:00, el día del cumpleaños del cliente.',
  MISSION: 'Cuando el cliente completa una misión.',
}

// §2.6
export const NOTIFICATION_STATUSES: Record<NotificationStatus, string> = {
  SENT: 'Enviada',
  FAILED: 'Falló',
  SKIPPED: 'No enviada',
}

// Color del estado, como en el prototipo: enviada en verde, falló en terracota, no enviada neutro
export const STATUS_BADGE: Record<NotificationStatus, 'success' | 'danger' | 'neutral'> = {
  SENT: 'success',
  FAILED: 'danger',
  SKIPPED: 'neutral',
}
