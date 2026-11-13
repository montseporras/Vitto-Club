// US-14 (contrato S5 §3.8.3): lo que lleva todo correo además del mensaje.

// El pie fijo de todos los correos
export const EMAIL_FOOTER = 'Recibís este correo porque sos parte de Vitto Club.';

// El correo sale en texto plano (el logo queda pendiente: docs/seguimiento/notificaciones-pendientes.md, N-1):
// el mensaje y, después de una línea en blanco, el pie fijo
export const withFooter = (body: string): string => `${body}\n\n${EMAIL_FOOTER}`;

// Largos de las columnas de `notifications` (contrato S5 §3.15). El correo se manda con el texto completo, pero
// lo que se registra tiene que entrar en la columna: si una variable alargara el texto más de la cuenta, el
// registro igual se guarda (recortado) en vez de fallar después de haber mandado el correo.
export const NOTIFICATION_SUBJECT_MAX = 120;
export const NOTIFICATION_BODY_MAX = 1000;
export const NOTIFICATION_ERROR_MAX = 500;

export const fitColumn = (text: string, max: number): string => (text.length > max ? text.slice(0, max) : text);
