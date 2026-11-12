// BASE-5 (contrato S5 §3.8.3, CA-B5.7): Resend se usa solo a través de este puerto, con dos
// adaptadores: el de Resend y uno que solo deja el envío en el log (NOTIFICATIONS_EMAIL_ENABLED=false,
// que es lo que usan el desarrollo y los e2e).

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  // El cuerpo con el logo fijo y el pie lo arma US-14 al enviar (§3.8.3)
  html?: string;
};

// SENT: el proveedor aceptó el correo. SKIPPED: el envío está apagado en el entorno y no se mandó nada
export type EmailSendResult = 'SENT' | 'SKIPPED';

export abstract class EmailSender {
  // Si el proveedor responde con error, rechaza con un Error cuyo mensaje es el motivo: quien lo llama
  // registra la notificación como FAILED con ese motivo (§2.6). Nunca va dentro de una transacción de
  // negocio: un correo que falla no deshace un consumo, un reclamo ni un regalo de cumpleaños
  abstract send(message: EmailMessage): Promise<EmailSendResult>;
}
