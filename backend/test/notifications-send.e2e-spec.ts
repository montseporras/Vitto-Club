import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { BackgroundTasks } from '../src/notifications/application/background-tasks.js';
import { NotificationsService } from '../src/notifications/application/notifications.service.js';
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

// Proveedor de correo de mentira: los e2e nunca llaman a Resend. Se puede hacer fallar o devolver SKIPPED.
class FakeEmailSender extends EmailSender {
  readonly sent: EmailMessage[] = [];
  result: EmailSendResult | Error = 'SENT';

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.sent.push(message);
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

const FOOTER = 'Recibís este correo porque sos parte de Vitto Club.';

// US-14 (CA-14.7 y CA-14.8, contrato S5 §3.8): enviar, registrar y reenviar notificaciones contra Postgres real.
describe('Envío y reenvío de notificaciones (e2e, US-14)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let service: NotificationsService;
  let background: BackgroundTasks;
  let email: FakeEmailSender;
  let admin: Record<string, string>;
  let customerId: number;
  // La auditoría es solo inserción: no se borra, se mira desde el último id
  let lastAuditId = 0;

  const DEFAULT_TEMPLATES = {
    POINTS_EXPIRING: {
      subject: 'Tus puntos están por vencer',
      body: 'Hola {nombre}: tenés {puntos} pts que vencen el {fecha}. ¡Usalos antes de que caduquen!',
    },
    BIRTHDAY: { subject: '¡Feliz cumpleaños!', body: '¡Feliz cumpleaños, {nombre}! Te regalamos {puntos} pts para celebrar con nosotros.' },
    MISSION: { subject: '¡Completaste una misión!', body: '¡Bien, {nombre}! Completaste la misión {mision}. Entrá a Vitto Club para ver tu recompensa.' },
  } as const;

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
    service = app.get(NotificationsService);
    background = app.get(BackgroundTasks);
  });

  afterAll(async () => {
    await restoreTemplates();
    await cleanDatabase();
    await app.close();
  });

  async function restoreTemplates() {
    for (const [type, text] of Object.entries(DEFAULT_TEMPLATES)) {
      await prisma.notificationTemplate.update({
        where: { type: type as keyof typeof DEFAULT_TEMPLATES },
        data: { active: true, subject: text.subject, body: text.body },
      });
    }
  }

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
  }

  beforeEach(async () => {
    await restoreTemplates();
    await cleanDatabase();
    email.sent.length = 0;
    email.result = 'SENT';
    const employee = await prisma.employee.create({
      data: { firstName: 'Diego', lastName: 'Sosa', phone: '3510000000', email: 'admin@vitto.club', role: 'ADMIN' },
    });
    const account = await prisma.account.create({
      data: { email: 'admin@vitto.club', passwordHash: 'hashed:x', role: 'ADMIN', employeeId: employee.id },
    });
    admin = {
      'x-test-auth-role': 'ADMIN',
      'x-test-account-id': String(account.id),
      'x-test-employee-id': String(employee.id),
    };
    customerId = (
      await prisma.customer.create({
        data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456123', email: 'carolina@vitto.club' },
      })
    ).id;
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  const newAuditRows = () => prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } } });
  const expiring = (reason = 'lot:5') => ({
    type: 'POINTS_EXPIRING' as const,
    customerId,
    reason,
    variables: { puntos: '120', fecha: '20/11/2026' },
  });

  // --- enviar ---

  describe('enviar (CA-14.7)', () => {
    it('manda el correo y registra una fila SENT con todas sus columnas', async () => {
      const record = await service.enviar(expiring());

      const stored = await prisma.notification.findUniqueOrThrow({ where: { id: record!.id } });
      expect(stored).toMatchObject({
        type: 'POINTS_EXPIRING',
        channel: 'EMAIL',
        recipient: 'carolina@vitto.club',
        customerId,
        subject: 'Tus puntos están por vencer',
        body: 'Hola Carolina: tenés 120 pts que vencen el 20/11/2026. ¡Usalos antes de que caduquen!',
        status: 'SENT',
        error: null,
        dedupeKey: 'lot:5',
        promotionSendId: null,
        resentFromId: null,
      });
      expect(stored.createdAt).toBeInstanceOf(Date);
      expect(email.sent).toEqual([
        {
          to: 'carolina@vitto.club',
          subject: 'Tus puntos están por vencer',
          text: `Hola Carolina: tenés 120 pts que vencen el 20/11/2026. ¡Usalos antes de que caduquen!\n\n${FOOTER}`,
        },
      ]);
    });

    it('usa el mensaje guardado: si el Administrador lo edita, el correo sale con el texto nuevo', async () => {
      await prisma.notificationTemplate.update({
        where: { type: 'BIRTHDAY' },
        data: { subject: '¡Feliz día!', body: 'Chau {nombre}, tomá {puntos} pts' },
      });

      const record = await service.enviar({ type: 'BIRTHDAY', customerId, reason: 'birthday:2026', variables: { puntos: '100' } });

      expect(record).toMatchObject({ subject: '¡Feliz día!', body: 'Chau Carolina, tomá 100 pts' });
    });

    it('con el tipo desactivado no manda nada y registra SKIPPED', async () => {
      await prisma.notificationTemplate.update({ where: { type: 'POINTS_EXPIRING' }, data: { active: false } });

      const record = await service.enviar(expiring());

      expect(email.sent).toEqual([]);
      expect(record).toMatchObject({ status: 'SKIPPED', error: null });
      expect(await prisma.notification.count()).toBe(1);
    });

    it('si el proveedor falla registra FAILED con el motivo y no lanza', async () => {
      email.result = new Error('The to address is not valid.');

      const record = await service.enviar(expiring());

      expect(record).toMatchObject({ status: 'FAILED', error: 'The to address is not valid.' });
      const stored = await prisma.notification.findUniqueOrThrow({ where: { id: record!.id } });
      expect(stored).toMatchObject({ status: 'FAILED', error: 'The to address is not valid.' });
    });

    it('un motivo muy largo del proveedor se recorta a 500 y igual se registra', async () => {
      email.result = new Error('x'.repeat(2000));

      const record = await service.enviar(expiring());

      expect(record?.status).toBe('FAILED');
      expect(record?.error).toHaveLength(500);
    });

    it('no se repite: el mismo motivo devuelve null, no manda otro correo y no suma una fila', async () => {
      await service.enviar(expiring());

      const second = await service.enviar(expiring());

      expect(second).toBeNull();
      expect(email.sent).toHaveLength(1);
      expect(await prisma.notification.count()).toBe(1);
    });

    it('dos envíos a la vez por el mismo motivo dejan una sola fila (el índice único)', async () => {
      const results = await Promise.all([service.enviar(expiring('lot:9')), service.enviar(expiring('lot:9'))]);

      expect(results.filter((result) => result !== null)).toHaveLength(1);
      expect(await prisma.notification.count()).toBe(1);
    });

    it('un tipo desactivado que se vuelve a activar no reenvía lo que ya se registró como omitido', async () => {
      await prisma.notificationTemplate.update({ where: { type: 'POINTS_EXPIRING' }, data: { active: false } });
      await service.enviar(expiring());
      await prisma.notificationTemplate.update({ where: { type: 'POINTS_EXPIRING' }, data: { active: true } });

      expect(await service.enviar(expiring())).toBeNull();
      expect(email.sent).toEqual([]);
    });

    it('una promoción usa su propio asunto y mensaje, guarda su envío y no tiene interruptor', async () => {
      await prisma.notificationTemplate.updateMany({ data: { active: false } });
      const employee = await prisma.employee.findFirstOrThrow();
      const send = await prisma.promotionSend.create({
        data: { subject: '¡Pizza libre!', body: 'Hola {nombre}', status: 'SENT', sentAt: new Date(), createdByEmployeeId: employee.id },
      });

      const record = await service.enviar({
        type: 'PROMOTION',
        customerId,
        reason: `promotion-send:${send.id}`,
        promotionSendId: send.id,
        subject: '¡Pizza libre!',
        body: 'Hola {nombre}',
      });

      expect(record).toMatchObject({ type: 'PROMOTION', status: 'SENT', body: 'Hola Carolina', promotionSendId: send.id });
      expect(email.sent[0].text).toBe(`Hola Carolina\n\n${FOOTER}`);
    });

    it('no se audita (S5-28): enviar queda solo en el historial', async () => {
      await service.enviar(expiring());

      expect(await newAuditRows()).toEqual([]);
    });
  });

  // --- reenviar ---

  describe('POST /api/notificaciones/:id/reenviar (CA-14.8)', () => {
    const reenviar = (id: number | string, headers = admin) =>
      request(app.getHttpServer()).post(`/api/notificaciones/${id}/reenviar`).set(headers);

    async function failedNotification(reason = 'lot:5') {
      email.result = new Error('Timeout');
      const failed = await service.enviar(expiring(reason));
      email.result = 'SENT';
      email.sent.length = 0;
      return failed!;
    }

    it('responde 202 { id, queued: 1 }, manda el correo y registra una fila nueva con resentFromId', async () => {
      const failed = await failedNotification();
      await prisma.customer.update({ where: { id: customerId }, data: { email: 'carolina.nueva@vitto.club' } });

      const response = await reenviar(failed.id);
      await background.idle();

      expect(response.status).toBe(202);
      expect(response.body).toEqual({ id: expect.any(Number), queued: 1 });
      const created = await prisma.notification.findUniqueOrThrow({ where: { id: response.body.id } });
      expect(created).toMatchObject({
        type: 'POINTS_EXPIRING',
        customerId,
        // El email actual del cliente
        recipient: 'carolina.nueva@vitto.club',
        subject: failed.subject,
        body: failed.body,
        status: 'SENT',
        error: null,
        dedupeKey: `resend:${failed.id}`,
        resentFromId: failed.id,
      });
      expect(email.sent).toEqual([
        { to: 'carolina.nueva@vitto.club', subject: failed.subject, text: `${failed.body}\n\n${FOOTER}` },
      ]);
      // El que falló queda como estaba (solo inserción)
      expect(await prisma.notification.findUniqueOrThrow({ where: { id: failed.id } })).toMatchObject({
        status: 'FAILED',
        error: 'Timeout',
        recipient: 'carolina@vitto.club',
      });
    });

    it('el historial refleja el reenvío: el original resent = true y el nuevo con resentFromId', async () => {
      const failed = await failedNotification();

      const { body } = await reenviar(failed.id);
      await background.idle();
      const list = await request(app.getHttpServer()).get('/api/notificaciones').set(admin);

      const byId = Object.fromEntries(list.body.items.map((item: { id: number }) => [item.id, item]));
      expect(byId[failed.id]).toMatchObject({ status: 'FAILED', resent: true });
      expect(byId[body.id]).toMatchObject({ status: 'SENT', resent: false, resentFromId: failed.id });
    });

    it('el reenvío puede volver a fallar: queda FAILED con su motivo y ya no se puede reenviar de nuevo', async () => {
      const failed = await failedNotification();
      email.result = new Error('Sigue fallando');

      const first = await reenviar(failed.id);
      await background.idle();

      expect(await prisma.notification.findUniqueOrThrow({ where: { id: first.body.id } })).toMatchObject({
        status: 'FAILED',
        error: 'Sigue fallando',
        resentFromId: failed.id,
      });
      const again = await reenviar(first.body.id);
      expect(again.status).toBe(409);
      expect(again.body.code).toBe('NOTIFICATION_NOT_RESENDABLE');
      expect(again.body.message).toBe('Este correo ya se reenvió.');
    });

    it('con el envío apagado en el entorno el reenvío queda SKIPPED', async () => {
      const failed = await failedNotification();
      email.result = 'SKIPPED';

      const response = await reenviar(failed.id);
      await background.idle();

      expect((await prisma.notification.findUniqueOrThrow({ where: { id: response.body.id } })).status).toBe('SKIPPED');
    });

    it('un correo que no existe: 404 "No existe la notificación."', async () => {
      const response = await reenviar(999999);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No existe la notificación.');
    });

    it('un id que no es un número: 400', async () => {
      expect((await reenviar('abc')).status).toBe(400);
    });

    it.each(['SENT', 'SKIPPED'] as const)('una %s no se reenvía: 409 NOTIFICATION_NOT_RESENDABLE', async (status) => {
      email.result = status;
      const original = (await service.enviar(expiring()))!;

      const response = await reenviar(original.id);

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('NOTIFICATION_NOT_RESENDABLE');
      expect(response.body.message).toBe('Solo se pueden reenviar los correos que fallaron.');
      expect(await prisma.notification.count()).toBe(1);
    });

    it('ya se reenvió: 409 "Este correo ya se reenvió." y no se manda otro', async () => {
      const failed = await failedNotification();
      await reenviar(failed.id);
      await background.idle();
      email.sent.length = 0;

      const response = await reenviar(failed.id);

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'NOTIFICATION_NOT_RESENDABLE', message: 'Este correo ya se reenvió.' });
      expect(email.sent).toEqual([]);
      expect(await prisma.notification.count({ where: { resentFromId: failed.id } })).toBe(1);
    });

    it('dos pedidos a la vez: uno responde 202 y el otro 409, y se manda un solo correo', async () => {
      const failed = await failedNotification();

      const [a, b] = await Promise.all([reenviar(failed.id), reenviar(failed.id)]);
      await background.idle();

      expect([a.status, b.status].sort()).toEqual([202, 409]);
      expect(email.sent).toHaveLength(1);
      expect(await prisma.notification.count({ where: { resentFromId: failed.id } })).toBe(1);
    });

    it.each([
      ['POINTS_EXPIRING', 'vencimiento de puntos'],
      ['BIRTHDAY', 'cumpleaños'],
      ['MISSION', 'misiones'],
    ] as const)('con %s desactivado: 409 NOTIFICATION_DISABLED', async (type, label) => {
      email.result = new Error('Timeout');
      const failed = (await service.enviar({
        type,
        customerId,
        reason: 'x:1',
        variables: { puntos: '1', fecha: 'hoy', mision: 'M' },
      }))!;
      email.result = 'SENT';
      await prisma.notificationTemplate.update({ where: { type }, data: { active: false } });

      const response = await reenviar(failed.id);

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        code: 'NOTIFICATION_DISABLED',
        message: `Las notificaciones de ${label} están desactivadas.`,
      });
      expect(await prisma.notification.count()).toBe(1);
    });

    it('una promoción que falló se puede reenviar y conserva su envío', async () => {
      const employee = await prisma.employee.findFirstOrThrow();
      const send = await prisma.promotionSend.create({
        data: { subject: 'Promo', body: 'Hola {nombre}', status: 'SENT', sentAt: new Date(), createdByEmployeeId: employee.id },
      });
      email.result = new Error('Timeout');
      const failed = (await service.enviar({
        type: 'PROMOTION',
        customerId,
        reason: `promotion-send:${send.id}`,
        promotionSendId: send.id,
        subject: 'Promo',
        body: 'Hola {nombre}',
      }))!;
      email.result = 'SENT';

      const response = await reenviar(failed.id);
      await background.idle();

      expect(response.status).toBe(202);
      expect(await prisma.notification.findUniqueOrThrow({ where: { id: response.body.id } })).toMatchObject({
        type: 'PROMOTION',
        promotionSendId: send.id,
        resentFromId: failed.id,
        status: 'SENT',
      });
    });

    it('no se audita (S5-28): el reenvío queda solo en el historial', async () => {
      const failed = await failedNotification();

      await reenviar(failed.id);
      await background.idle();

      expect(await newAuditRows()).toEqual([]);
    });

    describe('permisos (CA-14.9)', () => {
      const cashier = { 'x-test-auth-role': 'CASHIER', 'x-test-account-id': '900', 'x-test-employee-id': '900' };
      const customer = { 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '901', 'x-test-customer-id': '901' };

      it.each([
        ['Cajero', cashier],
        ['Cliente', customer],
      ])('%s recibe 403 FORBIDDEN y no se manda nada', async (_role, headers) => {
        const failed = await failedNotification();

        const response = await reenviar(failed.id, headers);
        await background.idle();

        expect(response.status).toBe(403);
        expect(response.body.code).toBe('FORBIDDEN');
        expect(email.sent).toEqual([]);
        expect(await prisma.notification.count()).toBe(1);
      });

      it('sin token: 401', async () => {
        const failed = await failedNotification();

        expect((await request(app.getHttpServer()).post(`/api/notificaciones/${failed.id}/reenviar`)).status).toBe(401);
      });
    });
  });
});

// Sin sobreescribir el proveedor: en los e2e NOTIFICATIONS_EMAIL_ENABLED es false, así que se usa el adaptador que
// solo deja el envío en el log (CA-B5.7). Todo se registra como SKIPPED y nunca se llama a Resend.
describe('Con el envío de correos apagado (e2e, US-14)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let service: NotificationsService;
  let customerId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    service = app.get(NotificationsService);
  });

  afterAll(async () => {
    await deleteNotifications(prisma);
    await prisma.customer.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await deleteNotifications(prisma);
    await prisma.customer.deleteMany();
    customerId = (
      await prisma.customer.create({
        data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456123', email: 'carolina@vitto.club' },
      })
    ).id;
  });

  it('enviar registra SKIPPED, sin error, con el texto ya armado', async () => {
    const record = await service.enviar({
      type: 'POINTS_EXPIRING',
      customerId,
      reason: 'lot:1',
      variables: { puntos: '120', fecha: '20/11/2026' },
    });

    expect(record).toMatchObject({
      status: 'SKIPPED',
      error: null,
      recipient: 'carolina@vitto.club',
      body: expect.stringContaining('Hola Carolina: tenés 120 pts'),
    });
    expect(await prisma.notification.count()).toBe(1);
  });
});
