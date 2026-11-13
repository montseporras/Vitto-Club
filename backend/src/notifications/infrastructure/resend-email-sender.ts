import { EmailMessage, EmailSender, EmailSendResult } from '../domain/port/email-sender.js';

// Lo único que se usa del SDK de Resend. Se declara acá para poder probar el adaptador con un cliente
// de mentira: los tests nunca llaman a Resend. El SDK no lanza: devuelve { data, error }.
export type ResendClient = {
  emails: {
    send(payload: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html?: string;
    }): Promise<{ data: { id: string } | null; error: { message: string } | null }>;
  };
};

// Resend admite 10 pedidos por segundo por equipo (https://resend.com/docs/api-reference/rate-limit): el
// pedido número 11 en el mismo segundo se rechaza con 429 y el correo quedaría FAILED sin necesidad. Una pausa
// de 150 ms entre envíos deja unos 6 por segundo, con margen. Aprobada por Montse el 12/11/2026. No ayuda con el
// tope diario del plan gratuito (100 correos por día), que es del plan y no se arregla desde el código.
export const RESEND_MIN_INTERVAL_MS = 150;

export type ResendEmailSenderOptions = {
  minIntervalMs?: number;
  // Se pueden reemplazar en los tests para no esperar de verdad
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// BASE-5 (contrato S5 §3.8.3, CA-B5.7). `from` es el remitente (NOTIFICATIONS_FROM).
export class ResendEmailSender extends EmailSender {
  private readonly minIntervalMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  // Cuándo puede salir el próximo correo. Cada envío reserva su turno de forma síncrona, así que varios envíos
  // a la vez (por ejemplo, dos reenvíos) igual quedan separados por la pausa.
  private nextSlot = 0;

  constructor(
    private readonly resend: ResendClient,
    private readonly from: string,
    options: ResendEmailSenderOptions = {},
  ) {
    super();
    this.minIntervalMs = options.minIntervalMs ?? RESEND_MIN_INTERVAL_MS;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? realSleep;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    await this.waitForTurn();
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html === undefined ? {} : { html: message.html }),
    });
    if (error) {
      // El motivo queda en notifications.error (FAILED)
      throw new Error(error.message);
    }
    return 'SENT';
  }

  private async waitForTurn(): Promise<void> {
    const now = this.now();
    const slot = Math.max(now, this.nextSlot);
    this.nextSlot = slot + this.minIntervalMs;
    if (slot > now) {
      await this.sleep(slot - now);
    }
  }
}
