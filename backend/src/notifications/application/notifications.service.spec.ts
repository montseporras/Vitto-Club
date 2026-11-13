import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { DomainError } from '../domain/errors/domain.error.js';
import type {
  AutomaticNotificationType,
  NotificationRecord,
  NotificationTemplateRecord,
} from '../domain/notification.js';
import type { EmailMessage, EmailSendResult } from '../domain/port/email-sender.js';
import { EmailSender } from '../domain/port/email-sender.js';
import { NotificationConfigRepository } from '../domain/port/notification-config.repository.js';
import {
  NotificationRepository,
  type NewNotification,
  type NotificationCustomer,
  type NotificationListFilters,
} from '../domain/port/notification.repository.js';
import { BackgroundTasks } from './background-tasks.js';
import { NotificationsService, type SendAutomaticInput } from './notifications.service.js';

// --- Dobles en memoria ---------------------------------------------------------------------------

class FakeNotificationRepository extends NotificationRepository {
  readonly rows: NotificationRecord[] = [];
  readonly customers = new Map<number, NotificationCustomer>();
  lastListFilters: NotificationListFilters | undefined;
  private nextId = 100;
  // Para simular que otra corrida registró lo mismo entre la revisión y el insert
  failNextCreateWithUniqueViolation = false;

  async create(data: NewNotification): Promise<NotificationRecord> {
    if (this.failNextCreateWithUniqueViolation) {
      this.failNextCreateWithUniqueViolation = false;
      throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    }
    const record: NotificationRecord = {
      id: data.id ?? this.nextId++,
      channel: 'EMAIL',
      createdAt: new Date('2026-11-12T12:00:00.000Z'),
      type: data.type,
      recipient: data.recipient,
      customerId: data.customerId,
      subject: data.subject,
      body: data.body,
      status: data.status,
      error: data.error,
      dedupeKey: data.dedupeKey,
      promotionSendId: data.promotionSendId,
      resentFromId: data.resentFromId,
    };
    this.rows.push(record);
    return record;
  }

  async findById(id: number) {
    return this.rows.find((row) => row.id === id) ?? null;
  }

  async existsForReason(type: string, customerId: number, dedupeKey: string) {
    return this.rows.some((row) => row.type === type && row.customerId === customerId && row.dedupeKey === dedupeKey);
  }

  async existsResendOf(id: number) {
    return this.rows.some((row) => row.resentFromId === id);
  }

  async reserveId() {
    return this.nextId++;
  }

  async findCustomer(customerId: number) {
    return this.customers.get(customerId) ?? null;
  }

  async list(filters: NotificationListFilters) {
    this.lastListFilters = filters;
    return { items: [], total: 0 };
  }
}

class FakeConfigRepository extends NotificationConfigRepository {
  readonly templates = new Map<AutomaticNotificationType, NotificationTemplateRecord>();

  async findTemplate(type: AutomaticNotificationType) {
    return this.templates.get(type) ?? null;
  }
  async findTemplates(): Promise<NotificationTemplateRecord[]> {
    throw new Error('no se usa en estos tests');
  }
  async findSettings(): Promise<{ birthdayBonusPoints: number }> {
    throw new Error('no se usa en estos tests');
  }
  async lockSettings(): Promise<{ birthdayBonusPoints: number }> {
    throw new Error('no se usa en estos tests');
  }
  async saveTemplate(): Promise<void> {
    throw new Error('no se usa en estos tests');
  }
  async saveBirthdayBonusPoints(): Promise<void> {
    throw new Error('no se usa en estos tests');
  }
}

class FakeEmailSender extends EmailSender {
  readonly sent: EmailMessage[] = [];
  result: EmailSendResult | Error = 'SENT';
  // Si hay una puerta, el envío espera a que se abra (para probar dos pedidos a la vez)
  gate: Promise<void> | undefined;

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.sent.push(message);
    if (this.gate) await this.gate;
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

const template = (type: AutomaticNotificationType, overrides: Partial<NotificationTemplateRecord> = {}) =>
  ({
    type,
    active: true,
    subject: 'Asunto',
    body: 'Cuerpo',
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
    ...overrides,
  }) satisfies NotificationTemplateRecord;

// --- Armado ---------------------------------------------------------------------------------------

function setup() {
  const notifications = new FakeNotificationRepository();
  const config = new FakeConfigRepository();
  const email = new FakeEmailSender();
  const background = new BackgroundTasks();
  notifications.customers.set(7, { id: 7, firstName: 'Carolina', email: 'carolina@vitto.club' });
  config.templates.set(
    'POINTS_EXPIRING',
    template('POINTS_EXPIRING', {
      subject: 'Tus puntos están por vencer',
      body: 'Hola {nombre}: tenés {puntos} pts que vencen el {fecha}.',
    }),
  );
  config.templates.set('BIRTHDAY', template('BIRTHDAY', { subject: '¡Feliz cumpleaños!', body: '¡Feliz cumpleaños, {nombre}! Te regalamos {puntos} pts.' }));
  config.templates.set('MISSION', template('MISSION', { subject: '¡Completaste una misión!', body: '¡Bien, {nombre}! Completaste la misión {mision}.' }));
  const service = new NotificationsService(notifications, config, email, background);
  return { service, notifications, config, email, background };
}

const expiring = (overrides: Partial<SendAutomaticInput> = {}): SendAutomaticInput => ({
  type: 'POINTS_EXPIRING',
  customerId: 7,
  reason: 'lot:5',
  variables: { puntos: '120', fecha: '20/11/2026' },
  ...overrides,
});

// --- enviar ---------------------------------------------------------------------------------------

describe('NotificationsService.enviar (CA-14.7, contrato S5 §3.8)', () => {
  it('manda el correo y lo registra SENT: variables reemplazadas, destinatario, canal y motivo', async () => {
    const { service, notifications, email } = setup();

    const record = await service.enviar(expiring());

    expect(record).toMatchObject({
      type: 'POINTS_EXPIRING',
      channel: 'EMAIL',
      recipient: 'carolina@vitto.club',
      customerId: 7,
      subject: 'Tus puntos están por vencer',
      body: 'Hola Carolina: tenés 120 pts que vencen el 20/11/2026.',
      status: 'SENT',
      error: null,
      dedupeKey: 'lot:5',
      promotionSendId: null,
      resentFromId: null,
    });
    expect(notifications.rows).toHaveLength(1);
    expect(email.sent).toEqual([
      {
        to: 'carolina@vitto.club',
        subject: 'Tus puntos están por vencer',
        text: 'Hola Carolina: tenés 120 pts que vencen el 20/11/2026.\n\nRecibís este correo porque sos parte de Vitto Club.',
      },
    ]);
  });

  it('{nombre} es siempre el nombre de pila del cliente: quien llama no lo puede pisar', async () => {
    const { service } = setup();

    const record = await service.enviar(expiring({ variables: { nombre: 'Otra', puntos: '1', fecha: 'hoy' } }));

    expect(record?.body).toContain('Hola Carolina');
    expect(record?.body).not.toContain('Otra');
  });

  it('con el envío apagado en el entorno el proveedor devuelve SKIPPED y se registra SKIPPED, sin error', async () => {
    const { service, email } = setup();
    email.result = 'SKIPPED';

    const record = await service.enviar(expiring());

    expect(record).toMatchObject({ status: 'SKIPPED', error: null });
  });

  it('con el tipo desactivado no se manda nada y se registra SKIPPED', async () => {
    const { service, config, email } = setup();
    config.templates.set('POINTS_EXPIRING', { ...config.templates.get('POINTS_EXPIRING')!, active: false });

    const record = await service.enviar(expiring());

    expect(email.sent).toEqual([]);
    expect(record).toMatchObject({ status: 'SKIPPED', error: null, body: 'Hola Carolina: tenés 120 pts que vencen el 20/11/2026.' });
  });

  it('si el proveedor falla se registra FAILED con el motivo y NO lanza', async () => {
    const { service, email } = setup();
    email.result = new Error('The to address is not valid.');

    const record = await service.enviar(expiring());

    expect(record).toMatchObject({ status: 'FAILED', error: 'The to address is not valid.' });
  });

  it('un fallo sin texto se registra con un motivo genérico, y uno muy largo se recorta a 500', async () => {
    const { service, email } = setup();
    email.result = new Error('');
    expect((await service.enviar(expiring({ reason: 'lot:1' })))?.error).toBe('No se pudo enviar el correo.');

    email.result = new Error('x'.repeat(900));
    expect((await service.enviar(expiring({ reason: 'lot:2' })))?.error).toHaveLength(500);
  });

  it('no se repite: el mismo tipo, cliente y motivo devuelve null, no manda otro correo y no registra otra fila', async () => {
    const { service, notifications, email } = setup();
    await service.enviar(expiring());

    const second = await service.enviar(expiring());

    expect(second).toBeNull();
    expect(email.sent).toHaveLength(1);
    expect(notifications.rows).toHaveLength(1);
  });

  it('otro motivo, otro tipo u otro cliente sí se manda', async () => {
    const { service, notifications } = setup();
    notifications.customers.set(8, { id: 8, firstName: 'José', email: 'jose@vitto.club' });
    await service.enviar(expiring());

    expect(await service.enviar(expiring({ reason: 'lot:6' }))).not.toBeNull();
    expect(await service.enviar({ type: 'BIRTHDAY', customerId: 7, reason: 'lot:5', variables: { puntos: '100' } })).not.toBeNull();
    expect(await service.enviar(expiring({ customerId: 8 }))).not.toBeNull();
    expect(notifications.rows).toHaveLength(4);
  });

  it('si otra corrida lo registró justo antes (índice único), devuelve null en vez de fallar', async () => {
    const { service, notifications } = setup();
    notifications.failNextCreateWithUniqueViolation = true;

    expect(await service.enviar(expiring())).toBeNull();
  });

  it('un error que no es de repetición se propaga', async () => {
    const { service, notifications } = setup();
    notifications.create = async () => {
      throw new Error('se cayó la base');
    };

    await expect(service.enviar(expiring())).rejects.toThrow('se cayó la base');
  });

  it('cumpleaños y misión usan sus propias variables', async () => {
    const { service } = setup();

    expect((await service.enviar({ type: 'BIRTHDAY', customerId: 7, reason: 'birthday:2026', variables: { puntos: '100' } }))?.body).toBe(
      '¡Feliz cumpleaños, Carolina! Te regalamos 100 pts.',
    );
    expect((await service.enviar({ type: 'MISSION', customerId: 7, reason: 'mission:9', variables: { mision: 'Brunch del finde' } }))?.body).toBe(
      '¡Bien, Carolina! Completaste la misión Brunch del finde.',
    );
  });

  it('si falta el valor de una variable lanza un error y no manda ni registra nada', async () => {
    const { service, notifications, email } = setup();

    await expect(service.enviar(expiring({ variables: { puntos: '120' } }))).rejects.toThrow(
      'Falta el valor de la variable {fecha}',
    );

    expect(email.sent).toEqual([]);
    expect(notifications.rows).toEqual([]);
  });

  it('lanza si el cliente no existe o si falta la plantilla', async () => {
    const { service, config } = setup();

    await expect(service.enviar(expiring({ customerId: 999 }))).rejects.toThrow('No existe el cliente 999');

    config.templates.delete('POINTS_EXPIRING');
    await expect(service.enviar(expiring())).rejects.toThrow('Falta la plantilla del mensaje POINTS_EXPIRING');
  });

  it('si una variable alarga el texto más que la columna, el correo sale completo y el registro se recorta', async () => {
    const { service, config, email } = setup();
    config.templates.set('MISSION', { ...config.templates.get('MISSION')!, subject: 'S'.repeat(115) + '{mision}', body: 'Hola {mision}' });

    const record = await service.enviar({ type: 'MISSION', customerId: 7, reason: 'mission:1', variables: { mision: 'M'.repeat(50) } });

    expect(email.sent[0].subject).toHaveLength(165);
    expect(record?.subject).toHaveLength(120);
    expect(record?.status).toBe('SENT');
  });

  describe('promociones (US-15 y US-49 lo usan)', () => {
    const promotion = (overrides = {}) => ({
      type: 'PROMOTION' as const,
      customerId: 7,
      reason: 'promotion-send:3',
      promotionSendId: 3,
      subject: '¡Este viernes, pizza libre!',
      body: 'Hola {nombre}: todos los viernes, pizza libre.',
      ...overrides,
    });

    it('usa el asunto y el mensaje que le pasan (no hay plantilla), reemplaza {nombre} y guarda el envío', async () => {
      const { service, email } = setup();

      const record = await service.enviar(promotion());

      expect(record).toMatchObject({
        type: 'PROMOTION',
        subject: '¡Este viernes, pizza libre!',
        body: 'Hola Carolina: todos los viernes, pizza libre.',
        status: 'SENT',
        dedupeKey: 'promotion-send:3',
        promotionSendId: 3,
      });
      expect(email.sent[0].text).toContain('Recibís este correo porque sos parte de Vitto Club.');
    });

    it('no tiene interruptor: se manda aunque los tres mensajes automáticos estén desactivados', async () => {
      const { service, config, email } = setup();
      for (const [type, value] of config.templates) config.templates.set(type, { ...value, active: false });

      const record = await service.enviar(promotion());

      expect(record?.status).toBe('SENT');
      expect(email.sent).toHaveLength(1);
    });

    it('solo admite {nombre}: otra variable es un error de programación', async () => {
      const { service } = setup();

      await expect(service.enviar(promotion({ body: 'Tenés {puntos}' }))).rejects.toThrow('Falta el valor de la variable {puntos}');
    });

    it('un cliente recibe una vez cada envío', async () => {
      const { service } = setup();
      await service.enviar(promotion());

      expect(await service.enviar(promotion())).toBeNull();
      expect(await service.enviar(promotion({ reason: 'promotion-send:4', promotionSendId: 4 }))).not.toBeNull();
    });
  });
});

// --- reenviar -------------------------------------------------------------------------------------

describe('NotificationsService.reenviar (CA-14.8, contrato S5 §3.8.5)', () => {
  // Deja una notificación FAILED lista para reenviar y devuelve su id
  async function failedNotification(ctx: ReturnType<typeof setup>, overrides: Partial<SendAutomaticInput> = {}) {
    ctx.email.result = new Error('Timeout');
    const failed = await ctx.service.enviar(expiring(overrides));
    ctx.email.result = 'SENT';
    ctx.email.sent.length = 0;
    return failed as NotificationRecord;
  }

  const conflictBody = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      return (error as ConflictException).getResponse() as { message: string; code: string };
    }
    throw new Error('Se esperaba un 409');
  };

  it('una notificación que no existe: 404 "No existe la notificación."', async () => {
    const { service } = setup();

    const error = await service.reenviar(999).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).message).toBe('No existe la notificación.');
  });

  it.each(['SENT', 'SKIPPED'] as const)('una %s no se reenvía: 409 NOTIFICATION_NOT_RESENDABLE', async (status) => {
    const ctx = setup();
    ctx.email.result = status;
    const original = (await ctx.service.enviar(expiring())) as NotificationRecord;

    expect(await conflictBody(ctx.service.reenviar(original.id))).toEqual({
      message: 'Solo se pueden reenviar los correos que fallaron.',
      code: 'NOTIFICATION_NOT_RESENDABLE',
    });
  });

  it('responde 202 con el id reservado y manda el correo después; la fila nueva queda SENT con resentFromId', async () => {
    const ctx = setup();
    const failed = await failedNotification(ctx);
    ctx.notifications.customers.set(7, { id: 7, firstName: 'Carolina', email: 'carolina.nueva@vitto.club' });

    const result = await ctx.service.reenviar(failed.id);
    await ctx.background.idle();

    expect(result.queued).toBe(1);
    const created = ctx.notifications.rows.find((row) => row.id === result.id)!;
    expect(created).toMatchObject({
      id: result.id,
      type: 'POINTS_EXPIRING',
      customerId: 7,
      // El email ACTUAL del cliente, no el que tenía cuando falló
      recipient: 'carolina.nueva@vitto.club',
      // El mismo texto que el original
      subject: failed.subject,
      body: failed.body,
      status: 'SENT',
      error: null,
      dedupeKey: `resend:${failed.id}`,
      resentFromId: failed.id,
    });
    expect(ctx.email.sent).toEqual([
      { to: 'carolina.nueva@vitto.club', subject: failed.subject, text: expect.stringContaining(failed.body) },
    ]);
    // El que falló queda como estaba (solo inserción)
    expect(ctx.notifications.rows.find((row) => row.id === failed.id)).toMatchObject({ status: 'FAILED', error: 'Timeout' });
  });

  it('no espera al correo para responder', async () => {
    const ctx = setup();
    const failed = await failedNotification(ctx);
    let open!: () => void;
    ctx.email.gate = new Promise<void>((resolve) => {
      open = resolve;
    });

    const result = await ctx.service.reenviar(failed.id);

    // Todavía no hay fila nueva: el correo sigue esperando
    expect(ctx.notifications.rows.find((row) => row.id === result.id)).toBeUndefined();
    open();
    await ctx.background.idle();
    expect(ctx.notifications.rows.find((row) => row.id === result.id)?.status).toBe('SENT');
  });

  it('puede quedar FAILED o SKIPPED', async () => {
    const ctx = setup();
    const failed = await failedNotification(ctx);
    ctx.email.result = new Error('Sigue fallando');
    const again = await ctx.service.reenviar(failed.id);
    await ctx.background.idle();
    expect(ctx.notifications.rows.find((row) => row.id === again.id)).toMatchObject({ status: 'FAILED', error: 'Sigue fallando' });

    const other = await failedNotification(ctx, { reason: 'lot:99' });
    ctx.email.result = 'SKIPPED';
    const skipped = await ctx.service.reenviar(other.id);
    await ctx.background.idle();
    expect(ctx.notifications.rows.find((row) => row.id === skipped.id)?.status).toBe('SKIPPED');
  });

  it('ya se reenvió: 409 "Este correo ya se reenvió."', async () => {
    const ctx = setup();
    const failed = await failedNotification(ctx);
    await ctx.service.reenviar(failed.id);
    await ctx.background.idle();

    expect(await conflictBody(ctx.service.reenviar(failed.id))).toEqual({
      message: 'Este correo ya se reenvió.',
      code: 'NOTIFICATION_NOT_RESENDABLE',
    });
  });

  it('un reenvío que también falló no se puede volver a reenviar', async () => {
    const ctx = setup();
    const failed = await failedNotification(ctx);
    ctx.email.result = new Error('Sigue fallando');
    const again = await ctx.service.reenviar(failed.id);
    await ctx.background.idle();

    expect(await conflictBody(ctx.service.reenviar(again.id))).toEqual({
      message: 'Este correo ya se reenvió.',
      code: 'NOTIFICATION_NOT_RESENDABLE',
    });
  });

  it('un doble clic: el segundo pedido mientras el primero se envía también recibe 409 y se manda un solo correo', async () => {
    const ctx = setup();
    const failed = await failedNotification(ctx);
    let open!: () => void;
    ctx.email.gate = new Promise<void>((resolve) => {
      open = resolve;
    });

    await ctx.service.reenviar(failed.id);
    const body = await conflictBody(ctx.service.reenviar(failed.id));
    open();
    await ctx.background.idle();

    expect(body.code).toBe('NOTIFICATION_NOT_RESENDABLE');
    expect(ctx.email.sent).toHaveLength(1);
    expect(ctx.notifications.rows.filter((row) => row.resentFromId === failed.id)).toHaveLength(1);
  });

  it.each([
    ['POINTS_EXPIRING', 'vencimiento de puntos'],
    ['BIRTHDAY', 'cumpleaños'],
    ['MISSION', 'misiones'],
  ] as const)('con %s desactivado: 409 NOTIFICATION_DISABLED', async (type, label) => {
    const ctx = setup();
    ctx.email.result = new Error('Timeout');
    const failed = (await ctx.service.enviar({
      type,
      customerId: 7,
      reason: 'x:1',
      variables: { puntos: '1', fecha: 'hoy', mision: 'M' },
    })) as NotificationRecord;
    ctx.config.templates.set(type, { ...ctx.config.templates.get(type)!, active: false });

    expect(await conflictBody(ctx.service.reenviar(failed.id))).toEqual({
      message: `Las notificaciones de ${label} están desactivadas.`,
      code: 'NOTIFICATION_DISABLED',
    });
  });

  it('una promoción fallida se puede reenviar: no tiene interruptor, y la fila nueva conserva su envío', async () => {
    const ctx = setup();
    ctx.email.result = new Error('Timeout');
    const failed = (await ctx.service.enviar({
      type: 'PROMOTION',
      customerId: 7,
      reason: 'promotion-send:3',
      promotionSendId: 3,
      subject: 'Promo',
      body: 'Hola {nombre}',
    })) as NotificationRecord;
    ctx.email.result = 'SENT';

    const result = await ctx.service.reenviar(failed.id);
    await ctx.background.idle();

    expect(ctx.notifications.rows.find((row) => row.id === result.id)).toMatchObject({
      type: 'PROMOTION',
      promotionSendId: 3,
      resentFromId: failed.id,
      status: 'SENT',
    });
  });

  it('si el trabajo en segundo plano falla, no se rompe nada: queda en el log y el candado se libera', async () => {
    const ctx = setup();
    const failed = await failedNotification(ctx);
    const create = ctx.notifications.create.bind(ctx.notifications);
    let first = true;
    ctx.notifications.create = async (data) => {
      if (first) {
        first = false;
        throw new Error('se cayó la base');
      }
      return create(data);
    };
    // El error queda en el log (esperado): no ensuciar la salida del test
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await ctx.service.reenviar(failed.id);
    await ctx.background.idle();

    // El candado se liberó: se puede volver a intentar
    await expect(ctx.service.reenviar(failed.id)).resolves.toMatchObject({ queued: 1 });
    jest.restoreAllMocks();
  });
});

// --- list -----------------------------------------------------------------------------------------

describe('NotificationsService.list (CA-14.6)', () => {
  it('normaliza el documento, usa DNI por defecto y arma el rango de fechas en hora de Argentina', async () => {
    const { service, notifications } = setup();

    const page = await service.list({
      type: 'BIRTHDAY',
      status: 'FAILED',
      documentNumber: '38.456.123',
      fromDate: '2026-11-10',
      toDate: '2026-11-10',
      page: 2,
      limit: 20,
    });

    expect(notifications.lastListFilters).toEqual({
      type: 'BIRTHDAY',
      status: 'FAILED',
      document: { type: 'DNI', number: '38456123' },
      range: {
        createdFrom: new Date('2026-11-10T03:00:00.000Z'),
        createdBefore: new Date('2026-11-11T03:00:00.000Z'),
      },
      page: 2,
      limit: 20,
    });
    expect(page).toEqual({ items: [], total: 0, page: 2, limit: 20 });
  });

  it('el tipo de documento solo se aplica si viene el número', async () => {
    const { service, notifications } = setup();

    await service.list({ documentType: 'PASSPORT', page: 1, limit: 20 });
    expect(notifications.lastListFilters?.document).toBeUndefined();

    await service.list({ documentType: 'PASSPORT', documentNumber: 'aab-123', page: 1, limit: 20 });
    expect(notifications.lastListFilters?.document).toEqual({ type: 'PASSPORT', number: 'AAB123' });
  });

  it('un número que queda vacío al normalizar no filtra', async () => {
    const { service, notifications } = setup();

    await service.list({ documentNumber: '...', page: 1, limit: 20 });

    expect(notifications.lastListFilters?.document).toBeUndefined();
  });

  it('un rango de fechas invertido es un DomainError (400)', async () => {
    const { service } = setup();

    await expect(service.list({ fromDate: '2026-11-11', toDate: '2026-11-10', page: 1, limit: 20 })).rejects.toThrow(DomainError);
  });
});
