import type { AuditService } from '../../audit/application/audit.service.js';
import type { AuditActor, AuditEntryInput } from '../../audit/domain/audit-entry.js';
import { DomainError } from '../domain/errors/domain.error.js';
import type { AutomaticNotificationType, NotificationTemplateRecord } from '../domain/notification.js';
import type { MessageInput } from '../domain/notification-messages.js';
import {
  NotificationConfigRepository,
  type TemplateChange,
} from '../domain/port/notification-config.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { NotificationMessagesService } from './notification-messages.service.js';

// --- Dobles en memoria ---------------------------------------------------------------------------

class FakeConfigRepository extends NotificationConfigRepository {
  readonly calls: string[] = [];
  birthdayBonusPoints = 100;
  readonly templates = new Map<AutomaticNotificationType, NotificationTemplateRecord>();

  async findTemplates() {
    // Desordenadas a propósito: el servicio devuelve lo que el repositorio entrega en el orden del contrato
    return (['POINTS_EXPIRING', 'BIRTHDAY', 'MISSION'] as const).map((type) => this.templates.get(type)!);
  }
  async findTemplate(type: AutomaticNotificationType) {
    return this.templates.get(type) ?? null;
  }
  async findSettings() {
    return { birthdayBonusPoints: this.birthdayBonusPoints };
  }
  async lockSettings() {
    this.calls.push('lock');
    return await this.findSettings();
  }
  async saveTemplate(type: AutomaticNotificationType, change: TemplateChange) {
    this.calls.push(`save:${type}`);
    this.templates.set(type, { ...this.templates.get(type)!, ...change });
  }
  async saveBirthdayBonusPoints(points: number) {
    this.calls.push('save:birthday');
    this.birthdayBonusPoints = points;
  }
}

class PassthroughTransactionRunner extends TransactionRunner {
  inTransaction = false;
  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.inTransaction = true;
    try {
      return await fn();
    } finally {
      this.inTransaction = false;
    }
  }
}

const actor: AuditActor = { type: 'EMPLOYEE', accountId: 3 };

const template = (type: AutomaticNotificationType, subject: string, body: string): NotificationTemplateRecord => ({
  type,
  active: true,
  subject,
  body,
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
});

const currentMessages = (): MessageInput[] => [
  { type: 'POINTS_EXPIRING', active: true, subject: 'Tus puntos están por vencer', body: 'Hola {nombre}: {puntos} pts el {fecha}.' },
  { type: 'BIRTHDAY', active: true, subject: '¡Feliz cumpleaños!', body: '¡Feliz cumpleaños, {nombre}! {puntos} pts.' },
  { type: 'MISSION', active: true, subject: '¡Completaste una misión!', body: '¡Bien, {nombre}! Completaste {mision}.' },
];

function setup() {
  const config = new FakeConfigRepository();
  for (const message of currentMessages()) {
    config.templates.set(message.type as AutomaticNotificationType, template(message.type as AutomaticNotificationType, message.subject, message.body));
  }
  const recorded: AuditEntryInput[] = [];
  const transactionRunner = new PassthroughTransactionRunner();
  const auditService = {
    record: jest.fn(async (entry: AuditEntryInput) => {
      // La auditoría se escribe DENTRO de la transacción del guardado
      expect(transactionRunner.inTransaction).toBe(true);
      recorded.push(entry);
    }),
  } as unknown as AuditService;
  const service = new NotificationMessagesService(config, auditService, transactionRunner);
  return { service, config, recorded, auditService };
}

// --- Tests ----------------------------------------------------------------------------------------

describe('NotificationMessagesService.get (CA-14.1, contrato S5 §3.6.1)', () => {
  it('devuelve los puntos de cumpleaños y los tres mensajes en el orden del contrato, sin PROMOTION', async () => {
    const { service } = setup();

    const config = await service.get();

    expect(config.birthdayBonusPoints).toBe(100);
    expect(config.messages.map((message) => message.type)).toEqual(['POINTS_EXPIRING', 'BIRTHDAY', 'MISSION']);
    expect(config.messages[0]).toEqual({
      type: 'POINTS_EXPIRING',
      active: true,
      subject: 'Tus puntos están por vencer',
      body: 'Hola {nombre}: {puntos} pts el {fecha}.',
    });
  });

  it('cada mensaje trae solo type, active, subject y body', async () => {
    const { service } = setup();

    const { messages } = await service.get();

    expect(Object.keys(messages[0]).sort()).toEqual(['active', 'body', 'subject', 'type']);
  });
});

describe('NotificationMessagesService.save (CA-14.1b, 14.2, 14.3 y 14.5)', () => {
  it('guarda lo que cambió, devuelve el mismo cuerpo que el GET y audita una sola entrada', async () => {
    const { service, config, recorded } = setup();
    const messages = currentMessages();
    messages[1].body = '¡Que cumplas muchos, {nombre}! {puntos} pts.';
    messages[2].active = false;

    const result = await service.save({ birthdayBonusPoints: 150, messages }, actor);

    expect(result).toEqual(await service.get());
    expect(result.birthdayBonusPoints).toBe(150);
    expect(result.messages[1].body).toBe('¡Que cumplas muchos, {nombre}! {puntos} pts.');
    expect(result.messages[2].active).toBe(false);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      actor,
      module: 'CONFIGURATION',
      action: 'LOGO_AND_MESSAGES_UPDATED',
      description: 'Modificó los mensajes automáticos',
    });
    expect(recorded[0].details).toEqual([
      { label: 'Puntos de cumpleaños', value: '100 → 150' },
      { label: 'Mensaje de cumpleaños', value: 'Modificado' },
      { label: 'Misiones', value: 'Activado → Desactivado' },
    ]);
    expect(config.calls).toEqual(['lock', 'save:BIRTHDAY', 'save:MISSION', 'save:birthday']);
  });

  it('solo guarda lo que cambió: lo que no cambió no se toca', async () => {
    const { service, config } = setup();

    await service.save({ birthdayBonusPoints: 100, messages: currentMessages() }, actor);

    expect(config.calls).toEqual(['lock']);
  });

  it('sin cambios audita igual, con "Cambios: Se guardó sin modificar valores"', async () => {
    const { service, recorded } = setup();

    await service.save({ birthdayBonusPoints: 100, messages: currentMessages() }, actor);

    expect(recorded).toHaveLength(1);
    expect(recorded[0].details).toEqual([{ label: 'Cambios', value: 'Se guardó sin modificar valores' }]);
  });

  it('acepta los tres mensajes en cualquier orden y 0 puntos de cumpleaños (no regala)', async () => {
    const { service } = setup();

    const result = await service.save({ birthdayBonusPoints: 0, messages: currentMessages().reverse() }, actor);

    expect(result.birthdayBonusPoints).toBe(0);
    expect(result.messages.map((message) => message.type)).toEqual(['POINTS_EXPIRING', 'BIRTHDAY', 'MISSION']);
  });

  it('un mensaje PROMOTION se rechaza sin guardar ni auditar nada', async () => {
    const { service, config, recorded } = setup();
    const messages = [...currentMessages(), { type: 'PROMOTION' as const, active: true, subject: 'Promo', body: 'Hola {nombre}' }];

    const error = await service.save({ birthdayBonusPoints: 100, messages }, actor).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).message).toBe('Las promociones no tienen mensaje automático.');
    expect(config.calls).toEqual([]);
    expect(recorded).toEqual([]);
  });

  it('una variable que no corresponde se rechaza sin guardar ni auditar nada', async () => {
    const { service, config, recorded } = setup();
    const messages = currentMessages();
    messages[1].body = 'Vence el {fecha}';

    await expect(service.save({ birthdayBonusPoints: 100, messages }, actor)).rejects.toThrow(
      'La variable {fecha} no se puede usar en este mensaje.',
    );

    expect(config.calls).toEqual([]);
    expect(recorded).toEqual([]);
  });

  it('faltan tipos: se rechaza con el mensaje de los tres mensajes', async () => {
    const { service } = setup();

    await expect(service.save({ birthdayBonusPoints: 100, messages: currentMessages().slice(0, 2) }, actor)).rejects.toThrow(
      'Tienen que venir los tres mensajes automáticos.',
    );
  });

  it('si la auditoría falla, el error se propaga (en la base se deshace todo el guardado)', async () => {
    const { service, auditService } = setup();
    (auditService.record as jest.Mock).mockRejectedValueOnce(new Error('falla la auditoría'));

    await expect(service.save({ birthdayBonusPoints: 150, messages: currentMessages() }, actor)).rejects.toThrow(
      'falla la auditoría',
    );
  });
});
