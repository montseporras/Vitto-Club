import { DomainError } from './errors/domain.error.js';
import {
  AUTOMATIC_NOTIFICATION_TYPES,
  NOTIFICATION_TYPES,
  type AutomaticNotificationType,
  type NotificationType,
} from './notification.js';
import { firstInvalidVariable } from './notification-variables.js';

// US-14 (contrato S5 §3.6.2): reglas del guardado de los mensajes automáticos.

export const PROMOTION_HAS_NO_MESSAGE = 'Las promociones no tienen mensaje automático.';
export const AUTOMATIC_MESSAGES_REQUIRED = 'Tienen que venir los tres mensajes automáticos.';
export const invalidVariableMessage = (variable: string): string =>
  `La variable {${variable}} no se puede usar en este mensaje.`;

// "Ingresá puntos enteros de 0 a 10.000.": para cualquier valor inválido (no entero, fuera de rango)
export const BIRTHDAY_POINTS_MESSAGE = 'Ingresá puntos enteros de 0 a 10.000.';
export const MAX_BIRTHDAY_POINTS = 10_000;

export type MessageInput = { type: NotificationType; active: boolean; subject: string; body: string };

// Textos del contrato S5 §3.6.2
export const SUBJECT_REQUIRED = 'El asunto es obligatorio.';
export const SUBJECT_TOO_LONG = 'El asunto no puede superar los 120 caracteres.';
export const BODY_REQUIRED = 'El mensaje es obligatorio.';
export const BODY_TOO_LONG = 'El mensaje no puede superar los 1.000 caracteres.';
export const MESSAGES_NOT_A_LIST = 'messages debe ser una lista';
export const MESSAGE_TYPE_INVALID = 'type no es un tipo de notificación válido';
export const MESSAGE_ACTIVE_INVALID = 'active debe ser verdadero o falso';
export const MAX_SUBJECT_LENGTH = 120;
export const MAX_BODY_LENGTH = 1000;

// Lee y valida la forma de cada mensaje del PUT: tipo conocido, `active` booleano, asunto de 1 a 120 y mensaje de 1
// a 1.000 caracteres (uno solo con espacios cuenta como vacío). Se hace acá y no con class-validator porque el
// ValidationPipe de Nest antepone la ruta ("messages.1.…") al texto de los errores de objetos anidados, y el contrato
// pide el texto exacto. El DomainError (400) lleva el campo en `details`, por ejemplo `messages.1.subject`.
export function parseMessageInput(raw: unknown): MessageInput[] {
  if (!Array.isArray(raw)) {
    throw new DomainError(MESSAGES_NOT_A_LIST, 'messages');
  }
  return raw.map((item: unknown, index) => {
    const message = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    const at = (field: string) => `messages.${index}.${field}`;

    if (!NOTIFICATION_TYPES.includes(message.type as NotificationType)) {
      throw new DomainError(MESSAGE_TYPE_INVALID, at('type'));
    }
    if (typeof message.active !== 'boolean') {
      throw new DomainError(MESSAGE_ACTIVE_INVALID, at('active'));
    }
    const subject = message.subject;
    if (typeof subject !== 'string' || subject.trim() === '') {
      throw new DomainError(SUBJECT_REQUIRED, at('subject'));
    }
    if (subject.length > MAX_SUBJECT_LENGTH) {
      throw new DomainError(SUBJECT_TOO_LONG, at('subject'));
    }
    const body = message.body;
    if (typeof body !== 'string' || body.trim() === '') {
      throw new DomainError(BODY_REQUIRED, at('body'));
    }
    if (body.length > MAX_BODY_LENGTH) {
      throw new DomainError(BODY_TOO_LONG, at('body'));
    }
    return { type: message.type as NotificationType, active: message.active, subject, body };
  });
}

// Los mensajes siempre se devuelven en este orden (contrato §3.6.1)
export function sortAutomaticMessages<T extends { type: NotificationType }>(messages: T[]): T[] {
  const order = (type: NotificationType) => AUTOMATIC_NOTIFICATION_TYPES.indexOf(type as AutomaticNotificationType);
  return [...messages].sort((a, b) => order(a.type) - order(b.type));
}

// Valida el guardado, en este orden: una PROMOTION (400 propio), los tres tipos automáticos exactamente una
// vez cada uno, y las variables del asunto y del mensaje de cada tipo. Lanza DomainError (400).
export function validateAutomaticMessages(messages: MessageInput[]): void {
  messages.forEach((message, index) => {
    if (message.type === 'PROMOTION') {
      throw new DomainError(PROMOTION_HAS_NO_MESSAGE, `messages.${index}.type`);
    }
  });

  const types = messages.map((message) => message.type);
  const complete =
    messages.length === AUTOMATIC_NOTIFICATION_TYPES.length &&
    AUTOMATIC_NOTIFICATION_TYPES.every((type) => types.filter((t) => t === type).length === 1);
  if (!complete) {
    throw new DomainError(AUTOMATIC_MESSAGES_REQUIRED, 'messages');
  }

  messages.forEach((message, index) => {
    for (const field of ['subject', 'body'] as const) {
      const variable = firstInvalidVariable(message.type, message[field]);
      if (variable !== undefined) {
        throw new DomainError(invalidVariableMessage(variable), `messages.${index}.${field}`);
      }
    }
  });
}
