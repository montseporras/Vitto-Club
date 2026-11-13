import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { BackgroundTasks } from '../src/notifications/application/background-tasks.js';
import { PromotionsProcessService } from '../src/notifications/application/promotions-process.service.js';
import {
  EmailSender,
  type EmailMessage,
  type EmailSendResult,
} from '../src/notifications/domain/port/email-sender.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { deleteNotifications } from './delete-notifications.js';
import { deletePointsMovements } from './delete-points-movements.js';

// Proveedor de correo de mentira: los e2e nunca llaman a Resend
class FakeEmailSender extends EmailSender {
  readonly sent: EmailMessage[] = [];
  // Direcciones a las que el proveedor responde con error
  readonly failing = new Set<string>();

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.sent.push(message);
    if (this.failing.has(message.to)) throw new Error('The to address is not valid.');
    return 'SENT';
  }
}

// US-15 y US-49 (contrato S5 §3.7 y §3.8): promociones contra Postgres real.
describe('Promociones (e2e, US-15 y US-49)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let background: BackgroundTasks;
  let process: PromotionsProcessService;
  let email: FakeEmailSender;
  let admin: Record<string, string>;
  let employeeId: number;
  // La auditoría es solo inserción: no se borra, se mira desde el último id
  let lastAuditId = 0;
  let ids: Record<'sinPuntos' | 'bronce' | 'plata1' | 'plata2' | 'oro' | 'baja', number>;

  beforeAll(async () => {
    email = new FakeEmailSender();
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailSender)
      .useValue(email)
      .compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    const issuer = moduleFixture.get(AccessTokenIssuer, { strict: false });
    app.use(async (req: Request, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-auth-role') as AuthRole | undefined;
      if (role) {
        const employeeIdHeader = req.header('x-test-employee-id');
        const customerIdHeader = req.header('x-test-customer-id');
        const token = await issuer.issue({
          accountId: Number(req.header('x-test-account-id') ?? 1),
          role,
          ...(employeeIdHeader ? { employeeId: Number(employeeIdHeader) } : {}),
          ...(customerIdHeader ? { customerId: Number(customerIdHeader) } : {}),
        });
        req.headers.authorization = `Bearer ${token}`;
      }
      next();
    });

    await app.init();
    prisma = app.get(PrismaService);
    background = app.get(BackgroundTasks);
    process = app.get(PromotionsProcessService);
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  async function cleanDatabase() {
    await deleteNotifications(prisma);
    await prisma.promotionSend.deleteMany();
    await deletePointsMovements(prisma);
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.loyaltyProgramConfiguration.deleteMany();
  }

  // Escenario (umbrales por defecto: Plata desde 300, Oro desde 800):
  //   sinPuntos  activo, sin fila de puntos        → Bronce
  //   bronce     activo, 299 acumulados            → Bronce (borde)
  //   plata1     activo, 300 acumulados            → Plata (borde)
  //   plata2     activo, 799 acumulados            → Plata (borde)
  //   oro        activo, 800 acumulados            → Oro (borde)
  //   baja       dado de baja, 1.000 acumulados    → no recibe nada
  beforeEach(async () => {
    await cleanDatabase();
    email.sent.length = 0;
    email.failing.clear();
    await prisma.loyaltyProgramConfiguration.create({
      data: { version: 1, baseAmount: 1000, pointsAwarded: 10, silverMinPoints: 300, goldMinPoints: 800, isActive: true },
    });
    const employee = await prisma.employee.create({
      data: { firstName: 'Diego', lastName: 'Sosa', phone: '3510000000', email: 'admin@vitto.club', role: 'ADMIN' },
    });
    employeeId = employee.id;
    const account = await prisma.account.create({
      data: { email: 'admin@vitto.club', passwordHash: 'hashed:x', role: 'ADMIN', employeeId: employee.id },
    });
    admin = {
      'x-test-auth-role': 'ADMIN',
      'x-test-account-id': String(account.id),
      'x-test-employee-id': String(employee.id),
    };
    const customer = async (key: keyof typeof ids, firstName: string, lifetime: number | null, isActive = true) => {
      const created = await prisma.customer.create({
        data: {
          firstName,
          lastName: 'Prueba',
          documentType: 'DNI',
          documentNumber: String(30_000_000 + documentCounter++),
          email: `${key}@vitto.club`,
          isActive,
        },
      });
      if (lifetime !== null) {
        await prisma.customerPoints.create({ data: { customerId: created.id, balance: lifetime, lifetimePoints: lifetime } });
      }
      return [key, created.id] as const;
    };
    documentCounter = 0;
    ids = Object.fromEntries([
      await customer('sinPuntos', 'Sofía', null),
      await customer('bronce', 'Bruno', 299),
      await customer('plata1', 'Paula', 300),
      await customer('plata2', 'Pedro', 799),
      await customer('oro', 'Olga', 800),
      await customer('baja', 'Baltasar', 1000, false),
    ]) as typeof ids;
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });
  let documentCounter = 0;

  const newAuditRows = () => prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } } });
  const post = (body: unknown, headers = admin) =>
    request(app.getHttpServer()).post('/api/promociones/envios').set(headers).send(body as object);
  const recipients = (query = '') => request(app.getHttpServer()).get(`/api/promociones/destinatarios${query}`).set(admin);
  const sentTo = () => email.sent.map((message) => message.to).sort();
  const futureIso = (days = 5) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const input = { subject: '¡Este viernes, pizza libre!', body: 'Hola {nombre}: viernes de pizza libre.' };

  // --- Destinatarios ---

  describe('GET /api/promociones/destinatarios (CA-15.3)', () => {
    it('todos los clientes activos: no cuenta al dado de baja', async () => {
      const response = await recipients();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 5 });
    });

    it('por nivel, con los bordes exactos de los umbrales: 299 Bronce, 300 Plata, 799 Plata, 800 Oro', async () => {
      expect((await recipients('?level=BRONZE')).body).toEqual({ count: 2 });
      expect((await recipients('?level=SILVER')).body).toEqual({ count: 2 });
      expect((await recipients('?level=GOLD')).body).toEqual({ count: 1 });
    });

    it('un cliente sin movimientos cuenta como Bronce', async () => {
      await prisma.customer.update({ where: { id: ids.bronce }, data: { isActive: false } });

      expect((await recipients('?level=BRONZE')).body).toEqual({ count: 1 });
    });

    it('usa los umbrales vigentes: si el Administrador los cambia, cambian los niveles', async () => {
      await prisma.loyaltyProgramConfiguration.updateMany({ data: { silverMinPoints: 100, goldMinPoints: 500 } });

      expect((await recipients('?level=BRONZE')).body).toEqual({ count: 1 });
      expect((await recipients('?level=SILVER')).body).toEqual({ count: 2 });
      expect((await recipients('?level=GOLD')).body).toEqual({ count: 2 });
    });

    it('?level= vacío cuenta como "sin valor": todos los clientes activos', async () => {
      expect((await recipients('?level=')).body).toEqual({ count: 5 });
    });

    it('un nivel inválido: 400 "level no es un nivel válido"', async () => {
      const response = await recipients('?level=PLATINO');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('level no es un nivel válido');
    });
  });

  // --- Enviar ahora ---

  describe('POST /api/promociones/envios, "ahora" (CA-15.4, CA-49.1 a CA-49.5)', () => {
    it('responde 202 { id, queued }, guarda el envío SENT y manda UN correo a cada cliente activo', async () => {
      const response = await post(input);
      await background.idle();

      expect(response.status).toBe(202);
      expect(response.body).toEqual({ id: expect.any(Number), queued: 5 });
      expect(await prisma.promotionSend.findUniqueOrThrow({ where: { id: response.body.id } })).toMatchObject({
        status: 'SENT',
        scheduledAt: null,
        level: null,
        recipients: 5,
        createdByEmployeeId: employeeId,
        sentAt: expect.any(Date),
        cancelledAt: null,
      });
      expect(sentTo()).toEqual(
        ['bronce', 'oro', 'plata1', 'plata2', 'sinPuntos'].map((key) => `${key}@vitto.club`).sort(),
      );
      expect(sentTo()).not.toContain('baja@vitto.club');
    });

    it('cada destinatario queda en el historial con su envío, {nombre} reemplazado y la clave del envío', async () => {
      const response = await post(input);
      await background.idle();

      const rows = await prisma.notification.findMany({ orderBy: { customerId: 'asc' } });
      expect(rows).toHaveLength(5);
      expect(rows.every((row) => row.type === 'PROMOTION' && row.status === 'SENT')).toBe(true);
      expect(rows.every((row) => row.promotionSendId === response.body.id)).toBe(true);
      expect(rows.every((row) => row.dedupeKey === `promotion-send:${response.body.id}`)).toBe(true);
      const sofia = rows.find((row) => row.customerId === ids.sinPuntos)!;
      expect(sofia).toMatchObject({
        recipient: 'sinPuntos@vitto.club',
        subject: '¡Este viernes, pizza libre!',
        body: 'Hola Sofía: viernes de pizza libre.',
      });
      expect(email.sent.find((message) => message.to === 'sinPuntos@vitto.club')?.text).toContain(
        'Hola Sofía: viernes de pizza libre.',
      );
    });

    it('a un nivel: solo le llega a los clientes de ese nivel, con su nivel actual', async () => {
      await post({ ...input, level: 'SILVER' });
      await background.idle();

      expect(sentTo()).toEqual(['plata1@vitto.club', 'plata2@vitto.club']);
      expect((await prisma.promotionSend.findFirstOrThrow()).level).toBe('SILVER');
    });

    it('sin destinatarios: se guarda igual, sale con 0 correos y no es un error', async () => {
      await prisma.customerPoints.update({ where: { customerId: ids.oro }, data: { lifetimePoints: 10 } });

      const response = await post({ ...input, level: 'GOLD' });
      await background.idle();

      expect(response.status).toBe(202);
      expect(response.body.queued).toBe(0);
      expect(await prisma.promotionSend.count()).toBe(1);
      expect(email.sent).toEqual([]);
    });

    it('un correo que falla queda FAILED con su motivo y no frena a los demás (CA-49.5)', async () => {
      email.failing.add('plata1@vitto.club');

      await post(input);
      await background.idle();

      const failed = await prisma.notification.findMany({ where: { status: 'FAILED' } });
      expect(failed).toHaveLength(1);
      expect(failed[0]).toMatchObject({ recipient: 'plata1@vitto.club', error: 'The to address is not valid.' });
      expect(await prisma.notification.count({ where: { status: 'SENT' } })).toBe(4);
      // El envío de la promoción sigue SENT
      expect((await prisma.promotionSend.findFirstOrThrow()).status).toBe('SENT');
    });

    it('PROMOTION no tiene interruptor: se manda aunque los mensajes automáticos estén desactivados (CA-49.4)', async () => {
      await prisma.notificationTemplate.updateMany({ data: { active: false } });
      try {
        await post(input);
        await background.idle();

        expect(email.sent).toHaveLength(5);
        expect(await prisma.notification.count({ where: { status: 'SKIPPED' } })).toBe(0);
      } finally {
        await prisma.notificationTemplate.updateMany({ data: { active: true } });
      }
    });

    it('un correo por cliente y por envío, aunque el mismo envío se vuelva a procesar (CA-49.1)', async () => {
      const response = await post(input);
      await background.idle();
      const send = await prisma.promotionSend.findUniqueOrThrow({ where: { id: response.body.id } });
      email.sent.length = 0;

      // Se vuelve a mandar el mismo envío: la clave del envío evita los correos repetidos
      const { PromotionDispatchService } = await import('../src/notifications/application/promotion-dispatch.service.js');
      // Los mismos clientes activos que recibieron el envío la primera vez (el dado de baja no)
      const activeIds = Object.entries(ids).filter(([key]) => key !== 'baja').map(([, id]) => id);
      await app.get(PromotionDispatchService).dispatch(send, activeIds);

      expect(email.sent).toEqual([]);
      expect(await prisma.notification.count()).toBe(5);
    });

    it('dos envíos distintos al mismo cliente son dos correos distintos', async () => {
      await post(input);
      await post({ ...input, subject: 'Otra promoción' });
      await background.idle();

      expect(await prisma.notification.count({ where: { customerId: ids.oro } })).toBe(2);
    });

    it('con el envío de correos apagado en el entorno, todo queda SKIPPED (CA-49.4)', async () => {
      // Sin reemplazar el proveedor (NOTIFICATIONS_EMAIL_ENABLED=false en los e2e) el adaptador solo deja el
      // envío en el log: el servicio `enviar` registra lo que devuelve el proveedor. Acá se simula con SKIPPED
      const spy = jest.spyOn(email, 'send').mockResolvedValue('SKIPPED');

      await post(input);
      await background.idle();

      expect(await prisma.notification.count({ where: { status: 'SKIPPED' } })).toBe(5);
      spy.mockRestore();
    });

    it('no se audita (S5-28): enviar queda solo en el historial', async () => {
      await post(input);
      await background.idle();

      expect(await newAuditRows()).toEqual([]);
    });
  });

  // --- Programar ---

  describe('POST /api/promociones/envios, programado (CA-15.4)', () => {
    it('responde 201 con el envío SCHEDULED, la cuenta de ahora y quién lo cargó; no manda nada todavía', async () => {
      const scheduledAt = futureIso();

      const response = await post({ ...input, level: 'SILVER', scheduledAt });
      await background.idle();

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(Number),
        subject: '¡Este viernes, pizza libre!',
        body: 'Hola {nombre}: viernes de pizza libre.',
        level: 'SILVER',
        scheduledAt,
        status: 'SCHEDULED',
        recipients: 2,
        sentAt: null,
        createdBy: { id: employeeId, firstName: 'Diego', lastName: 'Sosa' },
        createdAt: expect.any(String),
      });
      expect(Object.keys(response.body)).not.toContain('cancelledAt');
      expect(email.sent).toEqual([]);
      expect(await prisma.notification.count()).toBe(0);
      // En la base la cuenta queda sin valor hasta que salga
      expect((await prisma.promotionSend.findFirstOrThrow()).recipients).toBeNull();
    });

    it('acepta una fecha con offset de Argentina y la guarda en UTC', async () => {
      const when = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      when.setMilliseconds(0);
      const offset = `${when.toISOString().slice(0, 19)}-00:00`.replace('-00:00', 'Z');
      const argentina = new Date(when.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 19) + '-03:00';

      const response = await post({ ...input, scheduledAt: argentina });

      expect(response.status).toBe(201);
      expect(new Date(response.body.scheduledAt).toISOString()).toBe(new Date(offset).toISOString());
    });

    it('con el nivel sin valor o en null son todos los clientes activos', async () => {
      const response = await post({ ...input, level: null, scheduledAt: futureIso() });

      expect(response.status).toBe(201);
      expect(response.body.level).toBeNull();
      expect(response.body.recipients).toBe(5);
    });
  });

  // --- Validaciones ---

  describe('POST /api/promociones/envios: errores del contrato (CA-15.2 y CA-15.4)', () => {
    it.each([
      ['asunto vacío', { subject: '' }, 'El asunto es obligatorio.'],
      ['asunto solo con espacios', { subject: '   ' }, 'El asunto es obligatorio.'],
      ['asunto de 121 caracteres', { subject: 'a'.repeat(121) }, 'El asunto no puede superar los 120 caracteres.'],
      ['mensaje vacío', { body: '' }, 'El mensaje es obligatorio.'],
      ['mensaje solo con espacios', { body: ' \n ' }, 'El mensaje es obligatorio.'],
      ['mensaje de 1.001 caracteres', { body: 'a'.repeat(1001) }, 'El mensaje no puede superar los 1.000 caracteres.'],
      ['un nivel inválido', { level: 'PLATINO' }, 'level no es un nivel válido'],
      ['una fecha que no es una fecha', { scheduledAt: 'mañana' }, 'La fecha y hora no son válidas.'],
      ['una fecha sin zona horaria', { scheduledAt: '2030-01-01T10:00:00' }, 'La fecha y hora no son válidas.'],
      ['una fecha que no existe', { scheduledAt: '2030-02-30T10:00:00Z' }, 'La fecha y hora no son válidas.'],
      ['una fecha pasada', { scheduledAt: '2020-01-01T00:00:00.000Z' }, 'La fecha y hora tienen que ser posteriores a ahora.'],
    ])('%s: 400', async (_name, override, message) => {
      const response = await post({ ...input, ...override });

      expect(response.status).toBe(400);
      expect([response.body.message].flat()).toContain(message);
      expect(await prisma.promotionSend.count()).toBe(0);
      expect(email.sent).toEqual([]);
    });

    it('una variable que no es {nombre}: 400 con la variable entre llaves y el campo en details', async () => {
      const response = await post({ ...input, body: 'Tenés {puntos} pts' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('La variable {puntos} no se puede usar en este mensaje.');
      expect(response.body.details).toEqual([
        { field: 'body', message: 'La variable {puntos} no se puede usar en este mensaje.' },
      ]);
      expect(await prisma.promotionSend.count()).toBe(0);
    });

    it('la variable también se controla en el asunto', async () => {
      const response = await post({ ...input, subject: 'Hasta el {fecha}' });

      expect(response.status).toBe(400);
      expect(response.body.details[0].field).toBe('subject');
    });

    it('la fecha pasada trae su campo en details', async () => {
      const response = await post({ ...input, scheduledAt: '2020-01-01T00:00:00.000Z' });

      expect(response.body.details).toEqual([
        { field: 'scheduledAt', message: 'La fecha y hora tienen que ser posteriores a ahora.' },
      ]);
    });

    it('falta el asunto, el mensaje o hay un campo de más: 400', async () => {
      expect((await post({ body: input.body })).status).toBe(400);
      expect((await post({ subject: input.subject })).status).toBe(400);
      const extra = await post({ ...input, promotionId: 3 });
      expect(extra.status).toBe(400);
      expect(extra.body.message).toContain('property promotionId should not exist');
    });
  });

  // --- Programados y cancelar ---

  describe('GET /api/promociones/envios y PATCH …/cancelar (CA-15.5)', () => {
    it('lista solo los programados, por fecha ascendente, con la cuenta de ahora', async () => {
      const second = (await post({ ...input, subject: 'Segundo', level: 'GOLD', scheduledAt: futureIso(8) })).body;
      const first = (await post({ ...input, subject: 'Primero', scheduledAt: futureIso(2) })).body;
      await post({ ...input, subject: 'Ya salió' });
      await background.idle();

      const response = await request(app.getHttpServer()).get('/api/promociones/envios').set(admin);

      expect(response.status).toBe(200);
      expect(response.body.map((send: { id: number }) => send.id)).toEqual([first.id, second.id]);
      expect(response.body.map((send: { recipients: number }) => send.recipients)).toEqual([5, 1]);
      expect(response.body.every((send: { status: string }) => send.status === 'SCHEDULED')).toBe(true);
    });

    it('sin programados devuelve una lista vacía', async () => {
      const response = await request(app.getHttpServer()).get('/api/promociones/envios').set(admin);

      expect(response.body).toEqual([]);
    });

    it('cancelar pasa el envío a CANCELLED, responde 200 con el envío y ya no figura en los programados', async () => {
      const created = (await post({ ...input, scheduledAt: futureIso() })).body;

      const response = await request(app.getHttpServer()).patch(`/api/promociones/envios/${created.id}/cancelar`).set(admin);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: created.id, status: 'CANCELLED', recipients: 5 });
      expect((await prisma.promotionSend.findUniqueOrThrow({ where: { id: created.id } })).cancelledAt).toBeInstanceOf(Date);
      expect((await request(app.getHttpServer()).get('/api/promociones/envios').set(admin)).body).toEqual([]);
    });

    it('cancelar uno que ya se canceló: 409 PROMOTION_SEND_NOT_CANCELLABLE', async () => {
      const created = (await post({ ...input, scheduledAt: futureIso() })).body;
      await request(app.getHttpServer()).patch(`/api/promociones/envios/${created.id}/cancelar`).set(admin);

      const response = await request(app.getHttpServer()).patch(`/api/promociones/envios/${created.id}/cancelar`).set(admin);

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        code: 'PROMOTION_SEND_NOT_CANCELLABLE',
        message: 'El envío ya salió o se canceló.',
      });
    });

    it('cancelar uno que ya salió: 409 PROMOTION_SEND_NOT_CANCELLABLE', async () => {
      const sent = (await post(input)).body;
      await background.idle();

      const response = await request(app.getHttpServer()).patch(`/api/promociones/envios/${sent.id}/cancelar`).set(admin);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('PROMOTION_SEND_NOT_CANCELLABLE');
    });

    it('un envío que no existe: 404 "No existe el envío."; un id que no es un número: 400', async () => {
      const missing = await request(app.getHttpServer()).patch('/api/promociones/envios/999999/cancelar').set(admin);
      expect(missing.status).toBe(404);
      expect(missing.body.message).toBe('No existe el envío.');

      const invalid = await request(app.getHttpServer()).patch('/api/promociones/envios/abc/cancelar').set(admin);
      expect(invalid.status).toBe(400);
    });

    it('no se audita (S5-28): programar y cancelar quedan solo en el envío', async () => {
      const created = (await post({ ...input, scheduledAt: futureIso() })).body;
      await request(app.getHttpServer()).patch(`/api/promociones/envios/${created.id}/cancelar`).set(admin);

      expect(await newAuditRows()).toEqual([]);
    });
  });

  // --- Proceso de programados ---

  describe('proceso de los programados (CA-15.6)', () => {
    // La API no deja programar en el pasado: se inserta directo, como si el momento ya hubiera llegado
    const scheduleInPast = (overrides: Record<string, unknown> = {}) =>
      prisma.promotionSend.create({
        data: {
          subject: 'Programada',
          body: 'Hola {nombre}',
          status: 'SCHEDULED',
          scheduledAt: new Date(Date.now() - 60_000),
          createdByEmployeeId: employeeId,
          ...overrides,
        },
      });

    it('saca los programados en hora: SENT con sentAt y la cuenta real, y manda a cada cliente', async () => {
      const due = await scheduleInPast({ level: 'SILVER' });

      const sent = await process.run();

      expect(sent).toBe(1);
      expect(await prisma.promotionSend.findUniqueOrThrow({ where: { id: due.id } })).toMatchObject({
        status: 'SENT',
        recipients: 2,
        sentAt: expect.any(Date),
      });
      expect(sentTo()).toEqual(['plata1@vitto.club', 'plata2@vitto.club']);
      expect(await prisma.notification.count({ where: { promotionSendId: due.id } })).toBe(2);
    });

    it('no saca los que todavía no están en hora', async () => {
      await scheduleInPast({ scheduledAt: new Date(Date.now() + 60 * 60 * 1000) });

      expect(await process.run()).toBe(0);
      expect(email.sent).toEqual([]);
      expect((await prisma.promotionSend.findFirstOrThrow()).status).toBe('SCHEDULED');
    });

    it('un envío cancelado antes no sale', async () => {
      await scheduleInPast({ status: 'CANCELLED', cancelledAt: new Date() });

      expect(await process.run()).toBe(0);
      expect(email.sent).toEqual([]);
    });

    it('es idempotente: correrlo dos veces seguidas no repite ni un correo', async () => {
      await scheduleInPast();

      expect(await process.run()).toBe(1);
      const afterFirst = email.sent.length;
      expect(await process.run()).toBe(0);

      expect(afterFirst).toBe(5);
      expect(email.sent).toHaveLength(5);
      expect(await prisma.notification.count()).toBe(5);
    });

    it('dos corridas a la vez no mandan el envío dos veces (FOR UPDATE SKIP LOCKED)', async () => {
      await scheduleInPast();

      const [a, b] = await Promise.all([process.run(), process.run()]);

      expect(a + b).toBe(1);
      expect(email.sent).toHaveLength(5);
      expect(await prisma.notification.count()).toBe(5);
    });

    it('saca varios envíos en la misma corrida', async () => {
      await scheduleInPast({ subject: 'Uno', level: 'GOLD' });
      await scheduleInPast({ subject: 'Dos', level: 'BRONZE' });

      expect(await process.run()).toBe(2);
      expect(await prisma.promotionSend.count({ where: { status: 'SENT' } })).toBe(2);
      expect(email.sent).toHaveLength(3);
    });

    it('un envío sin destinatarios sale igual, con 0', async () => {
      await prisma.customerPoints.update({ where: { customerId: ids.oro }, data: { lifetimePoints: 10 } });
      const due = await scheduleInPast({ level: 'GOLD' });

      expect(await process.run()).toBe(1);
      expect(await prisma.promotionSend.findUniqueOrThrow({ where: { id: due.id } })).toMatchObject({
        status: 'SENT',
        recipients: 0,
      });
    });

    it('cancelar y el proceso a la vez: gana uno solo', async () => {
      const due = await scheduleInPast();

      const [cancel] = await Promise.all([
        request(app.getHttpServer()).patch(`/api/promociones/envios/${due.id}/cancelar`).set(admin),
        process.run(),
      ]);

      const final = await prisma.promotionSend.findUniqueOrThrow({ where: { id: due.id } });
      if (final.status === 'CANCELLED') {
        expect(cancel.status).toBe(200);
        expect(email.sent).toEqual([]);
      } else {
        expect(final.status).toBe('SENT');
        expect(cancel.status).toBe(409);
        expect(email.sent).toHaveLength(5);
      }
    });
  });

  // --- Rutas que ya no existen y permisos ---

  describe('rutas que ya no existen (CA-15.9) y permisos (CA-15.8)', () => {
    const cashier = { 'x-test-auth-role': 'CASHIER', 'x-test-account-id': '900', 'x-test-employee-id': '900' };
    const customer = { 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '901', 'x-test-customer-id': '901' };

    it('GET /customers/me/promociones y el ABM de /promociones responden 404', async () => {
      expect((await request(app.getHttpServer()).get('/api/customers/me/promociones').set(customer)).status).toBe(404);
      expect((await request(app.getHttpServer()).get('/api/promociones').set(admin)).status).toBe(404);
      expect((await request(app.getHttpServer()).post('/api/promociones').set(admin).send(input)).status).toBe(404);
      expect((await request(app.getHttpServer()).post('/api/promociones/1/enviar').set(admin)).status).toBe(404);
    });

    it.each([
      ['Cajero', cashier],
      ['Cliente', customer],
    ])('%s recibe 403 FORBIDDEN en los cuatro endpoints, y no se guarda ni se manda nada', async (_role, headers) => {
      const responses = [
        await request(app.getHttpServer()).get('/api/promociones/destinatarios').set(headers),
        await request(app.getHttpServer()).post('/api/promociones/envios').set(headers).send(input),
        await request(app.getHttpServer()).get('/api/promociones/envios').set(headers),
        await request(app.getHttpServer()).patch('/api/promociones/envios/1/cancelar').set(headers),
      ];
      await background.idle();

      for (const response of responses) {
        expect(response.status).toBe(403);
        expect(response.body.code).toBe('FORBIDDEN');
      }
      expect(await prisma.promotionSend.count()).toBe(0);
      expect(email.sent).toEqual([]);
    });

    it('sin token: 401 en los cuatro endpoints', async () => {
      expect((await request(app.getHttpServer()).get('/api/promociones/destinatarios')).status).toBe(401);
      expect((await request(app.getHttpServer()).post('/api/promociones/envios').send(input)).status).toBe(401);
      expect((await request(app.getHttpServer()).get('/api/promociones/envios')).status).toBe(401);
      expect((await request(app.getHttpServer()).patch('/api/promociones/envios/1/cancelar')).status).toBe(401);
    });
  });
});
