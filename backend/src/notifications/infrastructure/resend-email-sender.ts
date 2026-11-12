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

// BASE-5 (contrato S5 §3.8.3, CA-B5.7). `from` es el remitente (NOTIFICATIONS_FROM).
export class ResendEmailSender extends EmailSender {
  constructor(
    private readonly resend: ResendClient,
    private readonly from: string,
  ) {
    super();
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
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
}
