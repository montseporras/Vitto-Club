import type {
  PromotionLevel,
  PromotionSendRecord,
  PromotionSendWithCreator,
} from '../notification.js';

// Lo que se guarda al cargar un envío (contrato S5 §3.7.3 y §3.15)
export type NewPromotionSend = {
  subject: string;
  body: string;
  level: PromotionLevel | null;
  // null = se envía en el momento
  scheduledAt: Date | null;
  status: 'SCHEDULED' | 'SENT';
  sentAt: Date | null;
  // Solo los que ya salieron: la cuenta real al salir
  recipients: number | null;
  createdByEmployeeId: number;
};

// BASE-5 (contrato S5 §8.4), US-15 y US-49: envíos de promociones (tabla promotion_sends) y sus destinatarios.
// No hay catálogo de promociones: solo se guarda cada envío (S5-36).
export abstract class PromotionSendRepository {
  abstract create(data: NewPromotionSend): Promise<PromotionSendWithCreator>;

  // Los SCHEDULED, por fecha programada ascendente (contrato §3.7.4)
  abstract findScheduled(): Promise<PromotionSendWithCreator[]>;

  // Toma el envío con FOR UPDATE: cancelar y el proceso de programados no se pisan. null si no existe
  abstract lockById(id: number): Promise<PromotionSendRecord | null>;

  abstract markCancelled(id: number, at: Date): Promise<PromotionSendWithCreator>;

  // Los SCHEDULED que ya están en hora, con FOR UPDATE SKIP LOCKED: si otra corrida los tiene tomados, se saltean
  abstract lockDueForSending(now: Date): Promise<PromotionSendRecord[]>;

  abstract markSent(id: number, sentAt: Date, recipients: number): Promise<void>;

  // Clientes ACTIVOS: todos (`null`) o los que hoy están en ese nivel. El nivel sale de los puntos acumulados y
  // los umbrales vigentes; un cliente sin movimientos cuenta como Bronce
  abstract countRecipients(level: PromotionLevel | null): Promise<number>;

  abstract findRecipientIds(level: PromotionLevel | null): Promise<number[]>;
}
