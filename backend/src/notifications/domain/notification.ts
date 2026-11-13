// BASE-5 (contrato S5 §2.4 a §2.6.1 y §3.15): los tipos de las notificaciones y de los envíos de promoción.
// Solo tipos: las reglas de cada historia (US-14, US-15, US-47 a US-50) las agrega cada una.

// RF-050 a RF-053
export const NOTIFICATION_TYPES = ['POINTS_EXPIRING', 'BIRTHDAY', 'PROMOTION', 'MISSION'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Los mensajes AUTOMÁTICOS: PROMOTION no tiene plantilla ni interruptor, cada promoción se escribe
// desde cero al enviarla (S5-37)
export const AUTOMATIC_NOTIFICATION_TYPES = ['POINTS_EXPIRING', 'BIRTHDAY', 'MISSION'] as const;
export type AutomaticNotificationType = (typeof AUTOMATIC_NOTIFICATION_TYPES)[number];

// El único canal (S5-10)
export const NOTIFICATION_CHANNELS = ['EMAIL'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// SKIPPED: el tipo estaba desactivado o el envío de correos está apagado en el entorno
export const NOTIFICATION_STATUSES = ['SENT', 'FAILED', 'SKIPPED'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const PROMOTION_SEND_STATUSES = ['SCHEDULED', 'SENT', 'CANCELLED'] as const;
export type PromotionSendStatus = (typeof PROMOTION_SEND_STATUSES)[number];

// Nivel al que va una promoción; null = todos los clientes activos
export const PROMOTION_LEVELS = ['BRONZE', 'SILVER', 'GOLD'] as const;
export type PromotionLevel = (typeof PROMOTION_LEVELS)[number];

// Fila de notifications (§3.15). Solo inserción
export type NotificationRecord = {
  id: number;
  type: NotificationType;
  channel: NotificationChannel;
  // El correo al que se mandó, en ese momento
  recipient: string;
  customerId: number;
  subject: string;
  body: string;
  status: NotificationStatus;
  error: string | null;
  // "lot:{id}", "birthday:{año}", "mission:{customer_mission_id}", "promotion-send:{id}", "resend:{id}"
  dedupeKey: string;
  promotionSendId: number | null;
  resentFromId: number | null;
  createdAt: Date;
};

// Fila de notification_templates (§3.15): una por tipo automático
export type NotificationTemplateRecord = {
  type: AutomaticNotificationType;
  active: boolean;
  subject: string;
  body: string;
  updatedAt: Date;
};

// Fila de promotion_sends (§3.15)
export type PromotionSendRecord = {
  id: number;
  subject: string;
  body: string;
  level: PromotionLevel | null;
  scheduledAt: Date | null;
  status: PromotionSendStatus;
  sentAt: Date | null;
  cancelledAt: Date | null;
  recipients: number | null;
  createdByEmployeeId: number;
  createdAt: Date;
};

// Un envío de promoción con quién lo cargó, tal como lo devuelve la API (contrato S5 §3.7.1)
export type PromotionSendWithCreator = PromotionSendRecord & {
  createdBy: { id: number; firstName: string; lastName: string };
};
