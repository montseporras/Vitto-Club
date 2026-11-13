import type { AutomaticNotificationType, NotificationTemplateRecord } from '../notification.js';

// Fila única de notification_settings (id = 1)
export type NotificationSettingsRecord = { birthdayBonusPoints: number };

export type TemplateChange = { active: boolean; subject: string; body: string };

// BASE-5 (contrato S5 §8.4) y US-14: plantillas de los mensajes automáticos y puntos de cumpleaños.
export abstract class NotificationConfigRepository {
  // Las tres plantillas, en el orden del contrato: vencimiento, cumpleaños y misiones
  abstract findTemplates(): Promise<NotificationTemplateRecord[]>;

  abstract findTemplate(type: AutomaticNotificationType): Promise<NotificationTemplateRecord | null>;

  abstract findSettings(): Promise<NotificationSettingsRecord>;

  // Toma la fila única con FOR UPDATE: dos guardados a la vez se hacen uno después del otro, así la
  // auditoría (antes → después) siempre describe lo que de verdad cambió
  abstract lockSettings(): Promise<NotificationSettingsRecord>;

  abstract saveTemplate(type: AutomaticNotificationType, change: TemplateChange): Promise<void>;

  abstract saveBirthdayBonusPoints(points: number): Promise<void>;
}
