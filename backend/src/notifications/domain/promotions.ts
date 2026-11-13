import { DomainError } from './errors/domain.error.js';
import { invalidVariableMessage } from './notification-messages.js';
import { firstInvalidVariable } from './notification-variables.js';

// US-15 y US-49 (contrato S5 §3.7): reglas puras del envío de promociones.

// Textos de los errores. Los de la fecha y el asunto son del contrato (§3.7.3); el del nivel y el de una fecha
// que no es una fecha no figuran en el contrato y los aprobó Montse el 12/11/2026.
export const PROMOTION_LEVEL_INVALID = 'level no es un nivel válido';
export const SCHEDULED_AT_INVALID = 'La fecha y hora no son válidas.';
export const SCHEDULED_AT_NOT_FUTURE = 'La fecha y hora tienen que ser posteriores a ahora.';
export const PROMOTION_SEND_NOT_FOUND = 'No existe el envío.';
export const PROMOTION_SEND_NOT_CANCELLABLE_MESSAGE = 'El envío ya salió o se canceló.';

// Una fecha y hora ISO 8601 con zona (`2026-11-20T21:30:00.000Z` o `…-03:00`). Sin zona no se sabría a qué hora
// de qué país se refiere, así que se rechaza.
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/;

// JavaScript acepta un 30 de febrero y lo corre al 2 de marzo sin avisar: se compara el día para rechazarlo
function isRealCalendarDay(year: number, month: number, day: number): boolean {
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

// `null` (o sin valor) = se envía ahora. Si viene, tiene que ser una fecha y hora válidas y **posteriores a ahora**
// (§3.7.3). Lanza DomainError (400).
export function parseScheduledAt(raw: string | null | undefined, now: Date): Date | null {
  if (raw === null || raw === undefined) return null;
  const match = ISO_DATE_TIME.exec(raw);
  const date =
    match && isRealCalendarDay(Number(match[1]), Number(match[2]), Number(match[3]))
      ? new Date(raw)
      : new Date(Number.NaN);
  if (Number.isNaN(date.getTime())) {
    throw new DomainError(SCHEDULED_AT_INVALID, 'scheduledAt');
  }
  if (date.getTime() <= now.getTime()) {
    throw new DomainError(SCHEDULED_AT_NOT_FUTURE, 'scheduledAt');
  }
  return date;
}

// En el asunto y el mensaje de una promoción solo se puede usar {nombre} (§3.7.3). Lanza DomainError (400) con la
// variable entre llaves y el campo en `details`.
export function validatePromotionVariables(subject: string, body: string): void {
  for (const [field, text] of [
    ['subject', subject],
    ['body', body],
  ] as const) {
    const variable = firstInvalidVariable('PROMOTION', text);
    if (variable !== undefined) {
      throw new DomainError(invalidVariableMessage(variable), field);
    }
  }
}
