import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { DocumentType } from '../../customers/domain/customer.js';
import {
  fitColumn,
  NOTIFICATION_BODY_MAX,
  NOTIFICATION_ERROR_MAX,
  NOTIFICATION_SUBJECT_MAX,
  withFooter,
} from '../domain/notification-email.js';
import { buildNotificationDateRange, normalizeDocumentFilter } from '../domain/notification-filters.js';
import { notificationTypeInSentence } from '../domain/notification-labels.js';
import { replaceVariables } from '../domain/notification-variables.js';
import type {
  AutomaticNotificationType,
  NotificationRecord,
  NotificationStatus,
  NotificationType,
} from '../domain/notification.js';
import { EmailSender } from '../domain/port/email-sender.js';
import { NotificationConfigRepository } from '../domain/port/notification-config.repository.js';
import {
  NotificationRepository,
  type NotificationListItem,
} from '../domain/port/notification.repository.js';
import { BackgroundTasks } from './background-tasks.js';

// Códigos de error del contrato S5 §5 y §3.8.5
export const NOTIFICATION_NOT_RESENDABLE = 'NOTIFICATION_NOT_RESENDABLE';
export const NOTIFICATION_DISABLED = 'NOTIFICATION_DISABLED';

// Un mensaje automático: el texto sale de la plantilla guardada (la que edita el Administrador) y quien llama solo
// pone el motivo y los valores de las variables. {nombre} lo pone `enviar` con el nombre de pila del cliente.
export type SendAutomaticInput = {
  type: AutomaticNotificationType;
  customerId: number;
  // Por qué se manda; no se repite el mismo tipo al mismo cliente por el mismo motivo: "lot:{id}",
  // "birthday:{año}", "mission:{customer_mission_id}" (contrato S5 §3.15)
  reason: string;
  // Los valores de las variables del tipo, sin {nombre}: { puntos, fecha } o { puntos } o { mision }
  variables?: Record<string, string>;
};

// Una promoción no tiene plantilla ni interruptor: cada una se escribe desde cero (S5-37). Solo admite {nombre}.
export type SendPromotionInput = {
  type: 'PROMOTION';
  customerId: number;
  // "promotion-send:{id del envío}"
  reason: string;
  promotionSendId: number;
  subject: string;
  body: string;
};

export type SendNotificationInput = SendAutomaticInput | SendPromotionInput;

export type ListNotificationsInput = {
  type?: NotificationType;
  status?: NotificationStatus;
  documentType?: DocumentType;
  documentNumber?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
};

export type NotificationPage = { items: NotificationListItem[]; total: number; page: number; limit: number };

type Delivery = { status: NotificationStatus; error: string | null };

// Prisma tira P2002 cuando se viola un índice único
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';

// US-14 (contrato S5 §3.8): el envío común de las notificaciones, su reenvío y el historial. US-15 y US-47 a US-50
// usan `enviar`.
@Injectable()
export class NotificationsService {
  // Originales que se están reenviando en este momento. El índice único de la base lo respalda, pero la fila
  // nueva recién se inserta cuando termina el envío: esto evita mandar dos correos con un doble clic.
  private readonly resending = new Set<number>();

  constructor(
    private readonly notifications: NotificationRepository,
    private readonly config: NotificationConfigRepository,
    private readonly emailSender: EmailSender,
    private readonly background: BackgroundTasks,
  ) {}

  // CA-14.7. Manda el correo y lo registra, siempre: enviado (`SENT`), fallido (`FAILED`, con el motivo) u omitido
  // (`SKIPPED`: el tipo está desactivado, o el envío de correos está apagado en el entorno).
  // Devuelve la notificación registrada, o `null` si ya se había mandado por ese motivo (no se repite).
  //
  // **Quien lo llama lo hace DESPUÉS del commit** de su operación: un correo nunca va dentro de una transacción de
  // negocio ni deshace un consumo, un reclamo o un regalo de cumpleaños (contrato S5 §3.8.3). Un fallo del correo
  // NO lanza: queda registrado como FAILED. Lanza un Error solo por un error de programación (cliente que no
  // existe, plantilla que falta o una variable del texto sin valor).
  async enviar(input: SendNotificationInput): Promise<NotificationRecord | null> {
    if (await this.notifications.existsForReason(input.type, input.customerId, input.reason)) {
      return null;
    }

    const customer = await this.notifications.findCustomer(input.customerId);
    if (!customer) {
      throw new Error(`No existe el cliente ${input.customerId}`);
    }

    // De dónde sale el texto y si el tipo está prendido
    let source: { active: boolean; subject: string; body: string };
    let promotionSendId: number | null = null;
    if (input.type === 'PROMOTION') {
      source = { active: true, subject: input.subject, body: input.body };
      promotionSendId = input.promotionSendId;
    } else {
      const template = await this.config.findTemplate(input.type);
      if (!template) {
        throw new Error(`Falta la plantilla del mensaje ${input.type}`);
      }
      source = template;
    }

    // {nombre} siempre es el nombre de pila del cliente; quien llama no lo puede pisar
    const values = { ...(input.type === 'PROMOTION' ? {} : input.variables), nombre: customer.firstName };
    const subject = replaceVariables(source.subject, values);
    const body = replaceVariables(source.body, values);

    const delivery: Delivery = source.active
      ? await this.deliver(customer.email, subject, body)
      : { status: 'SKIPPED', error: null };

    try {
      return await this.notifications.create({
        type: input.type,
        recipient: customer.email,
        customerId: customer.id,
        subject: fitColumn(subject, NOTIFICATION_SUBJECT_MAX),
        body: fitColumn(body, NOTIFICATION_BODY_MAX),
        status: delivery.status,
        error: delivery.error,
        dedupeKey: input.reason,
        promotionSendId,
        resentFromId: null,
      });
    } catch (error) {
      // Otra corrida lo registró entre la revisión y ahora: ya está, no se repite
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  // POST /api/notificaciones/:id/reenviar (CA-14.8, contrato S5 §3.8.5). Responde enseguida con el número que va a
  // tener el registro nuevo; el correo se manda en segundo plano y ahí se inserta la fila, con su estado final
  // (`SENT`, `FAILED` o `SKIPPED`): la tabla es solo inserción, no se puede actualizar después.
  // No se audita (S5-28): queda en el historial.
  async reenviar(id: number): Promise<{ id: number; queued: number }> {
    const original = await this.notifications.findById(id);
    if (!original) {
      throw new NotFoundException('No existe la notificación.');
    }
    if (original.status !== 'FAILED') {
      throw new ConflictException({
        message: 'Solo se pueden reenviar los correos que fallaron.',
        code: NOTIFICATION_NOT_RESENDABLE,
      });
    }
    // Se reenvía una sola vez (§3.8.5): ni un original que ya se reenvió, ni un reenvío que también falló. Para este
    // segundo caso el contrato dice "no se puede volver a reenviar" pero no da el texto: se usa el mismo mensaje
    // (decisión por confirmar, ver docs/seguimiento/notificaciones-pendientes.md).
    if (original.resentFromId !== null || this.resending.has(id) || (await this.notifications.existsResendOf(id))) {
      throw this.alreadyResent();
    }
    if (original.type !== 'PROMOTION') {
      // PROMOTION no tiene interruptor: solo los tres tipos automáticos se pueden desactivar
      const template = await this.config.findTemplate(original.type);
      if (!template?.active) {
        throw new ConflictException({
          message: `Las notificaciones de ${notificationTypeInSentence(original.type)} están desactivadas.`,
          code: NOTIFICATION_DISABLED,
        });
      }
    }

    // Desde acá nada espera: si hay un segundo pedido por el mismo original, ve el candado
    if (this.resending.has(id)) {
      throw this.alreadyResent();
    }
    this.resending.add(id);

    let newId: number;
    let email: string;
    try {
      const customer = await this.notifications.findCustomer(original.customerId);
      if (!customer) {
        throw new Error(`No existe el cliente ${original.customerId}`);
      }
      // El email ACTUAL del cliente, no el que tenía cuando falló
      email = customer.email;
      newId = await this.notifications.reserveId();
    } catch (error) {
      this.resending.delete(id);
      throw error;
    }

    this.background.run(async () => {
      try {
        // El mismo texto que el original (ya con las variables reemplazadas)
        const delivery = await this.deliver(email, original.subject, original.body);
        await this.notifications.create({
          id: newId,
          type: original.type,
          recipient: email,
          customerId: original.customerId,
          subject: original.subject,
          body: original.body,
          status: delivery.status,
          error: delivery.error,
          dedupeKey: `resend:${original.id}`,
          promotionSendId: original.promotionSendId,
          resentFromId: original.id,
        });
      } finally {
        this.resending.delete(id);
      }
    });

    return { id: newId, queued: 1 };
  }

  // GET /api/notificaciones (CA-14.6, contrato S5 §3.8.4). `documentType` (DNI por defecto) solo se aplica si viene
  // `documentNumber`.
  async list(input: ListNotificationsInput): Promise<NotificationPage> {
    const range = buildNotificationDateRange(input.fromDate, input.toDate);
    const documentNumber = normalizeDocumentFilter(input.documentNumber);
    const result = await this.notifications.list({
      type: input.type,
      status: input.status,
      document: documentNumber ? { type: input.documentType ?? 'DNI', number: documentNumber } : undefined,
      range,
      page: input.page,
      limit: input.limit,
    });
    return { ...result, page: input.page, limit: input.limit };
  }

  // Manda el correo. Un fallo del proveedor no se propaga: queda como FAILED con su motivo (§2.6)
  private async deliver(to: string, subject: string, body: string): Promise<Delivery> {
    try {
      const result = await this.emailSender.send({ to, subject, text: withFooter(body) });
      return { status: result, error: null };
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : 'No se pudo enviar el correo.';
      return { status: 'FAILED', error: fitColumn(reason, NOTIFICATION_ERROR_MAX) };
    }
  }

  private alreadyResent(): ConflictException {
    return new ConflictException({ message: 'Este correo ya se reenvió.', code: NOTIFICATION_NOT_RESENDABLE });
  }
}
