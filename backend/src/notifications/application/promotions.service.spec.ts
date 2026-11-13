import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { DomainError } from '../domain/errors/domain.error.js';
import type { PromotionLevel, PromotionSendRecord, PromotionSendWithCreator } from '../domain/notification.js';
import { PromotionSendRepository, type NewPromotionSend } from '../domain/port/promotion-send.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { BackgroundTasks } from './background-tasks.js';
import { PromotionDispatchService } from './promotion-dispatch.service.js';
import { PromotionsProcessService } from './promotions-process.service.js';
import { PromotionsService } from './promotions.service.js';
import type { NotificationsService } from './notifications.service.js';

// --- Dobles en memoria ---------------------------------------------------------------------------

const creator = { id: 3, firstName: 'Diego', lastName: 'Sosa' };

class FakePromotionRepository extends PromotionSendRepository {
  readonly rows: PromotionSendWithCreator[] = [];
  readonly calls: string[] = [];
  // Los clientes activos por nivel (null = todos)
  readonly recipients = new Map<PromotionLevel | null, number[]>([
    [null, [1, 2, 3, 4]],
    ['BRONZE', [1, 2]],
    ['SILVER', [3]],
    ['GOLD', [4]],
  ]);
  private nextId = 10;

  async create(data: NewPromotionSend) {
    this.calls.push('create');
    const row: PromotionSendWithCreator = {
      id: this.nextId++,
      subject: data.subject,
      body: data.body,
      level: data.level,
      scheduledAt: data.scheduledAt,
      status: data.status,
      sentAt: data.sentAt,
      cancelledAt: null,
      recipients: data.recipients,
      createdByEmployeeId: data.createdByEmployeeId,
      createdAt: new Date('2026-11-12T12:00:00.000Z'),
      createdBy: creator,
    };
    this.rows.push(row);
    return row;
  }

  async findScheduled() {
    return this.rows
      .filter((row) => row.status === 'SCHEDULED')
      .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime());
  }

  async lockById(id: number) {
    this.calls.push('lock');
    return this.rows.find((row) => row.id === id) ?? null;
  }

  async markCancelled(id: number, at: Date) {
    this.calls.push('cancel');
    const row = this.rows.find((candidate) => candidate.id === id)!;
    row.status = 'CANCELLED';
    row.cancelledAt = at;
    return row;
  }

  async lockDueForSending(now: Date): Promise<PromotionSendRecord[]> {
    this.calls.push('lockDue');
    return this.rows.filter((row) => row.status === 'SCHEDULED' && row.scheduledAt!.getTime() <= now.getTime());
  }

  async markSent(id: number, sentAt: Date, recipients: number) {
    this.calls.push(`markSent:${id}`);
    const row = this.rows.find((candidate) => candidate.id === id)!;
    row.status = 'SENT';
    row.sentAt = sentAt;
    row.recipients = recipients;
  }

  async countRecipients(level: PromotionLevel | null) {
    this.calls.push(`count:${level ?? 'ALL'}`);
    return this.recipients.get(level)!.length;
  }

  async findRecipientIds(level: PromotionLevel | null) {
    return this.recipients.get(level)!;
  }
}

class RecordingTransactionRunner extends TransactionRunner {
  depth = 0;
  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.depth++;
    try {
      return await fn();
    } finally {
      this.depth--;
    }
  }
}

type EnviarCall = { customerId: number; reason: string; promotionSendId: number; subject: string; body: string };

function setup() {
  const promotions = new FakePromotionRepository();
  const transactionRunner = new RecordingTransactionRunner();
  const enviarCalls: EnviarCall[] = [];
  const insideTransaction: boolean[] = [];
  let failFor: number | undefined;
  // Si hay una puerta, los correos esperan a que se abra (para probar que la respuesta no los espera)
  let gate: Promise<void> | undefined;
  const notifications = {
    enviar: jest.fn(async (input: EnviarCall & { type: string }) => {
      if (gate) await gate;
      insideTransaction.push(transactionRunner.depth > 0);
      if (input.customerId === failFor) throw new Error('error de programación');
      enviarCalls.push(input);
      return null;
    }),
  } as unknown as NotificationsService;
  const dispatcher = new PromotionDispatchService(notifications);
  const background = new BackgroundTasks();
  const service = new PromotionsService(promotions, dispatcher, background, transactionRunner);
  const process = new PromotionsProcessService(promotions, dispatcher, transactionRunner);
  return {
    promotions,
    service,
    process,
    dispatcher,
    background,
    enviarCalls,
    insideTransaction,
    failFor: (customerId: number) => {
      failFor = customerId;
    },
    // Detiene los correos hasta que se llame a lo que devuelve
    holdEmails: () => {
      let open!: () => void;
      gate = new Promise<void>((resolve) => {
        open = resolve;
      });
      return open;
    },
  };
}

const now = new Date('2026-11-12T15:00:00.000Z');
const actor = { employeeId: 3 };
const input = { subject: '¡Pizza libre!', body: 'Hola {nombre}: viernes de pizza libre.' };

// --- create: ahora --------------------------------------------------------------------------------

describe('PromotionsService.create, "ahora" (CA-15.4 y CA-49.3)', () => {
  it('guarda el envío SENT con la cuenta real, responde { id, queued } y manda a todos los clientes activos', async () => {
    const { service, promotions, background, enviarCalls } = setup();

    const result = await service.create(input, actor, now);
    await background.idle();

    expect(result).toEqual({ kind: 'NOW', id: 10, queued: 4 });
    expect(promotions.rows[0]).toMatchObject({
      status: 'SENT',
      scheduledAt: null,
      sentAt: now,
      recipients: 4,
      level: null,
      createdByEmployeeId: 3,
    });
    expect(enviarCalls.map((call) => call.customerId)).toEqual([1, 2, 3, 4]);
  });

  it('cada correo lleva su motivo, el envío y el texto sin reemplazar (enviar reemplaza {nombre})', async () => {
    const { service, background, enviarCalls } = setup();

    await service.create(input, actor, now);
    await background.idle();

    expect(enviarCalls[0]).toMatchObject({
      type: 'PROMOTION',
      customerId: 1,
      reason: 'promotion-send:10',
      promotionSendId: 10,
      subject: '¡Pizza libre!',
      body: 'Hola {nombre}: viernes de pizza libre.',
    });
  });

  it('a un nivel: solo los clientes de ese nivel', async () => {
    const { service, promotions, background, enviarCalls } = setup();

    const result = await service.create({ ...input, level: 'BRONZE' }, actor, now);
    await background.idle();

    expect(result).toEqual({ kind: 'NOW', id: 10, queued: 2 });
    expect(promotions.rows[0].level).toBe('BRONZE');
    expect(enviarCalls.map((call) => call.customerId)).toEqual([1, 2]);
  });

  it('no espera a los correos para responder', async () => {
    const { service, background, enviarCalls, holdEmails } = setup();
    const release = holdEmails();

    // Los correos siguen detenidos y la respuesta igual llega: no los espera
    const result = await service.create(input, actor, now);

    expect(result).toMatchObject({ kind: 'NOW', queued: 4 });
    expect(enviarCalls).toEqual([]);
    release();
    await background.idle();
    expect(enviarCalls).toHaveLength(4);
  });

  it('sin destinatarios se guarda igual, con 0, y no es un error', async () => {
    const { service, promotions, background, enviarCalls } = setup();
    promotions.recipients.set('GOLD', []);

    const result = await service.create({ ...input, level: 'GOLD' }, actor, now);
    await background.idle();

    expect(result).toEqual({ kind: 'NOW', id: 10, queued: 0 });
    expect(promotions.rows[0]).toMatchObject({ status: 'SENT', recipients: 0 });
    expect(enviarCalls).toEqual([]);
  });

  it('un error con un cliente se registra en el log y no frena a los demás', async () => {
    const { service, background, enviarCalls, failFor } = setup();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    failFor(2);

    await service.create(input, actor, now);
    await background.idle();

    expect(enviarCalls.map((call) => call.customerId)).toEqual([1, 3, 4]);
    jest.restoreAllMocks();
  });
});

// --- create: programado y validaciones ------------------------------------------------------------

describe('PromotionsService.create, programado (CA-15.4)', () => {
  it('guarda el envío SCHEDULED y responde el envío con la cuenta de ahora; no manda nada', async () => {
    const { service, promotions, background, enviarCalls } = setup();

    const result = await service.create({ ...input, level: 'SILVER', scheduledAt: '2026-11-20T21:30:00.000Z' }, actor, now);
    await background.idle();

    expect(result.kind).toBe('SCHEDULED');
    if (result.kind !== 'SCHEDULED') return;
    expect(result.send).toMatchObject({
      id: 10,
      status: 'SCHEDULED',
      level: 'SILVER',
      scheduledAt: new Date('2026-11-20T21:30:00.000Z'),
      sentAt: null,
      // La cuenta de ahora; en la base queda sin cuenta hasta que salga
      recipients: 1,
      createdBy: creator,
    });
    expect(promotions.rows[0].recipients).toBeNull();
    expect(enviarCalls).toEqual([]);
  });

  it('con el nivel sin valor son todos los clientes activos', async () => {
    const { service } = setup();

    const result = await service.create({ ...input, scheduledAt: '2026-11-20T21:30:00.000Z' }, actor, now);

    expect(result.kind === 'SCHEDULED' && result.send.recipients).toBe(4);
  });

  it('una fecha pasada: "La fecha y hora tienen que ser posteriores a ahora." y no guarda nada', async () => {
    const { service, promotions } = setup();

    const error = await service.create({ ...input, scheduledAt: '2026-11-12T14:00:00.000Z' }, actor, now).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).message).toBe('La fecha y hora tienen que ser posteriores a ahora.');
    expect(promotions.rows).toEqual([]);
  });

  it('una fecha que no es una fecha: "La fecha y hora no son válidas." y no guarda nada', async () => {
    const { service, promotions } = setup();

    await expect(service.create({ ...input, scheduledAt: 'mañana' }, actor, now)).rejects.toThrow(
      'La fecha y hora no son válidas.',
    );
    expect(promotions.rows).toEqual([]);
  });

  it('una variable que no es {nombre}: 400 con la variable entre llaves, sin guardar ni mandar nada', async () => {
    const { service, promotions, enviarCalls } = setup();

    await expect(service.create({ ...input, body: 'Tenés {puntos} pts' }, actor, now)).rejects.toThrow(
      'La variable {puntos} no se puede usar en este mensaje.',
    );
    expect(promotions.rows).toEqual([]);
    expect(enviarCalls).toEqual([]);
  });
});

// --- listScheduled y countRecipients --------------------------------------------------------------

describe('PromotionsService.listScheduled y countRecipients (CA-15.3 y CA-15.5)', () => {
  it('lista los programados por fecha ascendente, con la cuenta de ahora y sin los que ya salieron o se cancelaron', async () => {
    const { service, promotions } = setup();
    await service.create({ ...input, subject: 'B', level: 'GOLD', scheduledAt: '2026-11-22T10:00:00.000Z' }, actor, now);
    await service.create({ ...input, subject: 'A', scheduledAt: '2026-11-20T10:00:00.000Z' }, actor, now);
    await service.create({ ...input, subject: 'C', level: 'GOLD', scheduledAt: '2026-11-21T10:00:00.000Z' }, actor, now);
    await service.create({ ...input, subject: 'D' }, actor, now);
    await service.cancel(12, now);

    const list = await service.listScheduled();

    expect(list.map((send) => send.subject)).toEqual(['A', 'B']);
    expect(list.map((send) => send.recipients)).toEqual([4, 1]);
    expect(promotions.rows).toHaveLength(4);
  });

  it('hace una sola cuenta por cada nivel distinto', async () => {
    const { service, promotions } = setup();
    for (const day of [20, 21, 22]) {
      await service.create({ ...input, level: 'GOLD', scheduledAt: `2026-11-${day}T10:00:00.000Z` }, actor, now);
    }
    promotions.calls.length = 0;

    await service.listScheduled();

    expect(promotions.calls.filter((call) => call.startsWith('count:'))).toEqual(['count:GOLD']);
  });

  it('countRecipients devuelve { count } de todos o de un nivel', async () => {
    const { service } = setup();

    expect(await service.countRecipients(null)).toEqual({ count: 4 });
    expect(await service.countRecipients('SILVER')).toEqual({ count: 1 });
  });
});

// --- cancel ---------------------------------------------------------------------------------------

describe('PromotionsService.cancel (CA-15.5)', () => {
  it('pasa un programado a CANCELLED y devuelve el envío; ya no figura en los programados', async () => {
    const { service, promotions } = setup();
    await service.create({ ...input, scheduledAt: '2026-11-20T10:00:00.000Z' }, actor, now);

    const result = await service.cancel(10, now);

    expect(result).toMatchObject({ id: 10, status: 'CANCELLED', recipients: 4 });
    expect(promotions.rows[0].cancelledAt).toEqual(now);
    expect(await service.listScheduled()).toEqual([]);
  });

  it('un envío que no existe: 404 "No existe el envío."', async () => {
    const { service } = setup();

    const error = await service.cancel(999).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).message).toBe('No existe el envío.');
  });

  it.each(['SENT', 'CANCELLED'] as const)('uno %s: 409 PROMOTION_SEND_NOT_CANCELLABLE', async (status) => {
    const { service, promotions } = setup();
    await service.create({ ...input, scheduledAt: '2026-11-20T10:00:00.000Z' }, actor, now);
    promotions.rows[0].status = status;

    const error = await service.cancel(10).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual({
      message: 'El envío ya salió o se canceló.',
      code: 'PROMOTION_SEND_NOT_CANCELLABLE',
    });
  });

  it('se cancela con el envío bloqueado, dentro de una transacción', async () => {
    const { service, promotions } = setup();
    await service.create({ ...input, scheduledAt: '2026-11-20T10:00:00.000Z' }, actor, now);
    promotions.calls.length = 0;

    await service.cancel(10, now);

    expect(promotions.calls.slice(0, 2)).toEqual(['lock', 'cancel']);
  });
});

// --- proceso de programados -----------------------------------------------------------------------

describe('PromotionsProcessService.run (CA-15.6 y CA-49.3)', () => {
  async function withScheduled(ctx: ReturnType<typeof setup>, scheduledAt: string, extra = {}) {
    await ctx.service.create({ ...input, scheduledAt, ...extra }, actor, now);
  }

  it('saca los programados en hora: SENT con sentAt y la cuenta real, y manda a cada cliente', async () => {
    const ctx = setup();
    await withScheduled(ctx, '2026-11-12T15:30:00.000Z', { level: 'BRONZE' });
    const later = new Date('2026-11-12T15:31:00.000Z');

    const sent = await ctx.process.run(later);

    expect(sent).toBe(1);
    expect(ctx.promotions.rows[0]).toMatchObject({ status: 'SENT', sentAt: later, recipients: 2 });
    expect(ctx.enviarCalls.map((call) => call.customerId)).toEqual([1, 2]);
  });

  it('manda los correos DESPUÉS del commit, nunca dentro de la transacción', async () => {
    const ctx = setup();
    await withScheduled(ctx, '2026-11-12T15:30:00.000Z');

    await ctx.process.run(new Date('2026-11-12T16:00:00.000Z'));

    expect(ctx.insideTransaction.length).toBeGreaterThan(0);
    expect(ctx.insideTransaction.every((inside) => !inside)).toBe(true);
  });

  it('no saca los que todavía no están en hora', async () => {
    const ctx = setup();
    await withScheduled(ctx, '2026-11-20T10:00:00.000Z');

    expect(await ctx.process.run(new Date('2026-11-12T16:00:00.000Z'))).toBe(0);
    expect(ctx.promotions.rows[0].status).toBe('SCHEDULED');
    expect(ctx.enviarCalls).toEqual([]);
  });

  it('un envío cancelado antes no sale', async () => {
    const ctx = setup();
    await withScheduled(ctx, '2026-11-12T15:30:00.000Z');
    await ctx.service.cancel(10, now);

    expect(await ctx.process.run(new Date('2026-11-12T16:00:00.000Z'))).toBe(0);
    expect(ctx.enviarCalls).toEqual([]);
  });

  it('es idempotente: una segunda corrida no encuentra nada y no manda de nuevo', async () => {
    const ctx = setup();
    await withScheduled(ctx, '2026-11-12T15:30:00.000Z');
    const later = new Date('2026-11-12T16:00:00.000Z');

    expect(await ctx.process.run(later)).toBe(1);
    expect(await ctx.process.run(later)).toBe(0);

    expect(ctx.enviarCalls).toHaveLength(4);
  });

  it('saca varios envíos en la misma corrida, en orden de fecha', async () => {
    const ctx = setup();
    await withScheduled(ctx, '2026-11-12T15:40:00.000Z', { subject: 'Segundo', level: 'GOLD' });
    await withScheduled(ctx, '2026-11-12T15:20:00.000Z', { subject: 'Primero', level: 'SILVER' });

    expect(await ctx.process.run(new Date('2026-11-12T16:00:00.000Z'))).toBe(2);

    // lockDueForSending devuelve por orden de fecha en la base; el doble los entrega en el orden en que se crearon
    expect(ctx.enviarCalls.map((call) => call.customerId).sort()).toEqual([3, 4]);
    expect(ctx.promotions.rows.every((row) => row.status === 'SENT')).toBe(true);
  });

  it('la cuenta guardada es la de ese momento, no la que había al programarlo', async () => {
    const ctx = setup();
    await withScheduled(ctx, '2026-11-12T15:30:00.000Z');
    ctx.promotions.recipients.set(null, [1, 2, 3, 4, 5, 6]);

    await ctx.process.run(new Date('2026-11-12T16:00:00.000Z'));

    expect(ctx.promotions.rows[0].recipients).toBe(6);
    expect(ctx.enviarCalls).toHaveLength(6);
  });
});
