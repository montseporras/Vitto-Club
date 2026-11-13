import { Injectable } from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import { messagesUpdatedEntry, type MessagesConfigSnapshot } from '../../audit/domain/audit-entries.js';
import type { AuditActor } from '../../audit/domain/audit-entry.js';
import type { AutomaticNotificationType } from '../domain/notification.js';
import { parseMessageInput, validateAutomaticMessages } from '../domain/notification-messages.js';
import { NotificationConfigRepository } from '../domain/port/notification-config.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';

// Lo que devuelve GET y PUT /configuracion/mensajes (contrato S5 §3.6.1): los puntos de regalo por cumpleaños y los
// tres mensajes automáticos, en el orden del contrato. PROMOTION no está: se escribe desde cero en cada envío.
export type MessagesConfig = {
  birthdayBonusPoints: number;
  messages: { type: AutomaticNotificationType; active: boolean; subject: string; body: string }[];
};

// `messages` llega sin validar (lo que mandó el cliente): el servicio lo lee y lo valida con las reglas del dominio
export type SaveMessagesInput = { birthdayBonusPoints: number; messages: unknown };

// US-14 (contrato S5 §3.6 y §3.14): mensajes automáticos y puntos de regalo por cumpleaños.
@Injectable()
export class NotificationMessagesService {
  constructor(
    private readonly config: NotificationConfigRepository,
    private readonly auditService: AuditService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // GET /api/configuracion/mensajes (CA-14.1)
  async get(): Promise<MessagesConfig> {
    return await this.read();
  }

  // PUT /api/configuracion/mensajes (CA-14.1b, CA-14.2, CA-14.3 y CA-14.5). Valida antes de abrir la transacción;
  // después, el guardado y la auditoría van juntos: si la auditoría falla, no queda nada guardado.
  async save(input: SaveMessagesInput, actor: AuditActor): Promise<MessagesConfig> {
    const messages = parseMessageInput(input.messages);
    validateAutomaticMessages(messages);

    return await this.transactionRunner.run(async () => {
      // Dos guardados a la vez se hacen uno después del otro, así el antes → después de la auditoría es verdadero
      await this.config.lockSettings();
      const before = await this.read();

      for (const message of messages) {
        const current = before.messages.find((existing) => existing.type === message.type);
        const changed =
          !current ||
          current.active !== message.active ||
          current.subject !== message.subject ||
          current.body !== message.body;
        if (changed) {
          await this.config.saveTemplate(message.type as AutomaticNotificationType, {
            active: message.active,
            subject: message.subject,
            body: message.body,
          });
        }
      }
      if (before.birthdayBonusPoints !== input.birthdayBonusPoints) {
        await this.config.saveBirthdayBonusPoints(input.birthdayBonusPoints);
      }

      const after = await this.read();
      await this.auditService.record(messagesUpdatedEntry(actor, toSnapshot(before), toSnapshot(after)));
      return after;
    });
  }

  private async read(): Promise<MessagesConfig> {
    const [settings, templates] = await Promise.all([this.config.findSettings(), this.config.findTemplates()]);
    return {
      birthdayBonusPoints: settings.birthdayBonusPoints,
      messages: templates.map(({ type, active, subject, body }) => ({ type, active, subject, body })),
    };
  }
}

const toSnapshot = (config: MessagesConfig): MessagesConfigSnapshot => ({
  birthdayBonusPoints: config.birthdayBonusPoints,
  messages: config.messages,
});
