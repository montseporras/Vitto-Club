import { Logger } from '@nestjs/common';
import { EmailMessage, EmailSender, EmailSendResult } from '../domain/port/email-sender.js';

// BASE-5 (CA-B5.7): con NOTIFICATIONS_EMAIL_ENABLED=false no se llama a ningún proveedor: el envío solo
// queda en el log y devuelve SKIPPED (§3.8.3).
export class LogEmailSender extends EmailSender {
  private readonly logger = new Logger(LogEmailSender.name);

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.logger.log(`Envío de correos apagado: no se mandó "${message.subject}" a ${message.to}`);
    return 'SKIPPED';
  }
}
