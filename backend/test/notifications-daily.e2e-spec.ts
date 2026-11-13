import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { NotificationsDailyService } from '../src/notifications/application/notifications-daily.service.js';
import { argentinaDayOf } from '../src/notifications/domain/daily-notifications.js';
import {
  EmailSender,
  type EmailMessage,
  type EmailSendResult,
} from '../src/notifications/domain/port/email-sender.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { deleteNotifications } from './delete-notifications.js';
import { deletePointsMovements } from './delete-points-movements.js';

// Proveedor de correo de mentira: los e2e nunca llaman a Resend
class FakeEmailSender extends EmailSender {
  readonly sent: EmailMessage[] = [];
  readonly failing = new Set<string>();

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.sent.push(message);
    if (this.failing.has(message.to)) throw new Error('The to address is not valid.');
    return 'SENT';
  }
}

const DAY = 24 * 60 * 60 * 1000;

// US-47 y US-48 (contrato S5 §3.8): el proceso diario de avisos contra Postgres real.
describe('Proceso diario de avisos (e2e, US-47 y US-48)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let daily: NotificationsDailyService;
  let email: FakeEmailSender;
  // La auditoría es solo inserción: no se borra, se mira desde el último id
  let lastAuditId = 0;
  let documentCounter = 0;
  let templates: { type: 'POINTS_EXPIRING' | 'BIRTHDAY' | 'MISSION'; active: boolean; subject: string; body: string }[];

  beforeAll(async () => {
    email = new FakeEmailSender();
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailSender)
      .useValue(email)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    daily = app.get(NotificationsDailyService);
    templates = (await prisma.notificationTemplate.findMany()).map(({ type, active, subject, body }) => ({
      type: type as 'POINTS_EXPIRING' | 'BIRTHDAY' | 'MISSION',
      active,
      subject,
      body,
    }));
  });

  afterAll(async () => {
    await restoreConfiguration();
    await cleanDatabase();
    await app.close();
  });

  async function restoreConfiguration() {
    for (const template of templates) {
      await prisma.notificationTemplate.update({ where: { type: template.type }, data: template });
    }
    await prisma.notificationSettings.update({ where: { id: 1 }, data: { birthdayBonusPoints: 100 } });
  }

  async function cleanDatabase() {
    await deleteNotifications(prisma);
    await deletePointsMovements(prisma);
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.loyaltyProgramConfiguration.deleteMany();
  }

  beforeEach(async () => {
    await cleanDatabase();
    await restoreConfiguration();
    email.sent.length = 0;
    email.failing.clear();
    documentCounter = 0;
    await prisma.loyaltyProgramConfiguration.create({
      data: { version: 1, baseAmount: 1000, pointsAwarded: 10, silverMinPoints: 300, goldMinPoints: 800, isActive: true },
    });
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' }, select: { id: true } }))?.id ?? 0;
  });

  async function customer(key: string, dateOfBirth: Date | null, options: { isActive?: boolean; balance?: number } = {}) {
    const created = await prisma.customer.create({
      data: {
        firstName: `Nombre${key}`,
        lastName: 'Prueba',
        documentType: 'DNI',
        documentNumber: String(30_000_000 + documentCounter++),
        email: `${key}@vitto.club`,
        dateOfBirth,
        isActive: options.isActive ?? true,
      },
    });
    if (options.balance !== undefined) {
      await prisma.customerPoints.create({
        data: { customerId: created.id, balance: options.balance, lifetimePoints: options.balance },
      });
    }
    return created.id;
  }

  // Una fecha de nacimiento (columna DATE) con ese mes y día
  const born = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));

  const birthdayAudit = () =>
    prisma.auditLog.findMany({
      where: { id: { gt: lastAuditId }, actionCode: 'BIRTHDAY_BONUS_GRANTED' },
      orderBy: { id: 'asc' },
    });
  const sentTo = () => email.sent.map((message) => message.to).sort();

  // --- US-48: cumpleaños ---

  describe('cumpleaños (US-48)', () => {
    // Hoy en Argentina: el cumpleaños de "hoy" se calcula con el mismo día que usa el proceso
    const now = new Date();
    const today = argentinaDayOf(now);

    it('regala los puntos configurados, manda el correo con {puntos}, audita y no suma a los acumulados (CA-48.1 a CA-48.4)', async () => {
      const id = await customer('hoy', born(1990, today.month, today.day), { balance: 40 });

      const result = await daily.run(now);

      expect(result).toMatchObject({ birthdays: 1, birthdayGifts: 1, failures: 0 });
      expect(await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: id } })).toMatchObject({
        balance: 140,
        lifetimePoints: 40,
      });
      expect(await prisma.pointsMovement.findMany({ where: { customerId: id, type: 'BIRTHDAY_BONUS' } })).toEqual([
        expect.objectContaining({ points: 100, balanceAfter: 140, performedByName: 'Sistema', performedByAccountId: null }),
      ]);
      expect(await prisma.pointsLot.findMany({ where: { customerId: id } })).toEqual([
        expect.objectContaining({ initialPoints: 100, remainingPoints: 100, consumptionId: null, status: 'ACTIVE' }),
      ]);

      expect(email.sent).toHaveLength(1);
      expect(email.sent[0]).toMatchObject({ to: 'hoy@vitto.club', subject: '¡Feliz cumpleaños!' });
      expect(email.sent[0].text).toContain('¡Feliz cumpleaños, Nombrehoy! Te regalamos 100 pts para celebrar con nosotros.');
      expect(await prisma.notification.findMany({ where: { customerId: id } })).toEqual([
        expect.objectContaining({ type: 'BIRTHDAY', status: 'SENT', dedupeKey: `birthday:${today.year}` }),
      ]);

      const audit = await birthdayAudit();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        actorType: 'SYSTEM',
        module: 'POINTS',
        description: 'Regaló puntos de cumpleaños a Nombrehoy Prueba',
        affectedCustomerId: id,
        details: [
          { label: 'Puntos otorgados', value: '+100 pts' },
          { label: 'Saldo resultante', value: '140 pts' },
        ],
      });
    });

    it('un cliente sin fila de puntos también recibe el regalo', async () => {
      const id = await customer('nuevo', born(1985, today.month, today.day));

      await daily.run(now);

      expect(await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: id } })).toMatchObject({
        balance: 100,
        lifetimePoints: 0,
      });
    });

    it('usa la cantidad configurada en Notificaciones', async () => {
      await prisma.notificationSettings.update({ where: { id: 1 }, data: { birthdayBonusPoints: 250 } });
      const id = await customer('hoy', born(1990, today.month, today.day));

      await daily.run(now);

      expect((await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: id } })).balance).toBe(250);
      expect(email.sent[0].text).toContain('Te regalamos 250 pts');
      expect((await birthdayAudit())[0].details).toEqual([
        { label: 'Puntos otorgados', value: '+250 pts' },
        { label: 'Saldo resultante', value: '250 pts' },
      ]);
    });

    it('no toca a quien no cumple hoy ni a los dados de baja, ni a los que no cargaron su fecha', async () => {
      const otherDay = new Date(Date.UTC(1990, today.month - 1, today.day) + 2 * DAY);
      await customer('otro', born(1990, otherDay.getUTCMonth() + 1, otherDay.getUTCDate()));
      await customer('baja', born(1990, today.month, today.day), { isActive: false });
      await customer('sinfecha', null);

      const result = await daily.run(now);

      expect(result).toMatchObject({ birthdays: 0, birthdayGifts: 0 });
      expect(email.sent).toEqual([]);
      expect(await prisma.pointsMovement.count()).toBe(0);
      expect(await birthdayAudit()).toEqual([]);
    });

    it('es una vez por año: una segunda corrida no regala, no manda correo ni audita de nuevo (CA-48.5)', async () => {
      const id = await customer('hoy', born(1990, today.month, today.day), { balance: 40 });

      await daily.run(now);
      const second = await daily.run(now);

      expect(second.birthdayGifts).toBe(0);
      expect(email.sent).toHaveLength(1);
      expect((await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: id } })).balance).toBe(140);
      expect(await prisma.pointsMovement.count({ where: { type: 'BIRTHDAY_BONUS' } })).toBe(1);
      expect(await birthdayAudit()).toHaveLength(1);
      expect(await prisma.notification.count({ where: { customerId: id } })).toBe(1);
    });

    it('aunque el correo falle, el regalo queda y la notificación se registra FAILED (CA-48.3)', async () => {
      const id = await customer('hoy', born(1990, today.month, today.day), { balance: 40 });
      email.failing.add('hoy@vitto.club');

      const result = await daily.run(now);

      expect(result).toMatchObject({ birthdayGifts: 1, failures: 0 });
      expect((await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: id } })).balance).toBe(140);
      expect(await prisma.notification.findMany({ where: { customerId: id } })).toEqual([
        expect.objectContaining({ status: 'FAILED', error: 'The to address is not valid.' }),
      ]);
      // No se reintenta solo
      await daily.run(now);
      expect(email.sent).toHaveLength(1);
    });

    it('con 0 puntos no regala nada y el correo es solo el saludo, sin hablar de puntos', async () => {
      await prisma.notificationSettings.update({ where: { id: 1 }, data: { birthdayBonusPoints: 0 } });
      const id = await customer('hoy', born(1990, today.month, today.day), { balance: 40 });

      const result = await daily.run(now);

      expect(result).toMatchObject({ birthdays: 1, birthdayGifts: 0 });
      expect((await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: id } })).balance).toBe(40);
      expect(await prisma.pointsMovement.count()).toBe(0);
      expect(await birthdayAudit()).toEqual([]);
      expect(email.sent).toHaveLength(1);
      expect(email.sent[0]).toMatchObject({ subject: '¡Feliz cumpleaños!' });
      expect(email.sent[0].text).toContain('¡Feliz cumpleaños, Nombrehoy!');
      expect(email.sent[0].text).not.toContain('pts');
    });

    it('con el tipo desactivado no regala ni manda: queda el registro SKIPPED, una sola vez', async () => {
      await prisma.notificationTemplate.update({ where: { type: 'BIRTHDAY' }, data: { active: false } });
      const id = await customer('hoy', born(1990, today.month, today.day), { balance: 40 });

      await daily.run(now);
      await daily.run(now);

      expect((await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: id } })).balance).toBe(40);
      expect(await birthdayAudit()).toEqual([]);
      expect(email.sent).toEqual([]);
      expect(await prisma.notification.findMany({ where: { customerId: id } })).toEqual([
        expect.objectContaining({ type: 'BIRTHDAY', status: 'SKIPPED' }),
      ]);
    });

    it('si ya recibió el regalo este año (movimiento BIRTHDAY_BONUS), no se lo regala otra vez aunque no haya notificación', async () => {
      const id = await customer('hoy', born(1990, today.month, today.day), { balance: 140 });
      await prisma.pointsMovement.create({
        data: {
          customerId: id,
          type: 'BIRTHDAY_BONUS',
          points: 100,
          balanceAfter: 140,
          performedByName: 'Sistema',
        },
      });

      const result = await daily.run(now);

      expect(result.birthdayGifts).toBe(0);
      expect((await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: id } })).balance).toBe(140);
      expect(await prisma.pointsMovement.count({ where: { type: 'BIRTHDAY_BONUS' } })).toBe(1);
      expect(await birthdayAudit()).toEqual([]);
    });

    it('un cliente que falla no frena a los demás', async () => {
      const first = await customer('uno', born(1990, today.month, today.day));
      await customer('dos', born(1991, today.month, today.day));
      // Sin configuración activa el regalo no se puede acreditar: ambos fallan, pero el proceso termina y lo cuenta
      await prisma.loyaltyProgramConfiguration.deleteMany();

      const result = await daily.run(now);

      expect(result).toMatchObject({ birthdays: 2, birthdayGifts: 0, failures: 2 });
      expect(await prisma.pointsMovement.count({ where: { customerId: first } })).toBe(0);
    });

    describe('29 de febrero (contrato S5 §3.8.1)', () => {
      it('en un año que no es bisiesto cumple el 28/02, junto con los del 28/02', async () => {
        await customer('del28', born(1990, 2, 28));
        await customer('del29', born(2000, 2, 29));

        const result = await daily.run(new Date('2027-02-28T15:00:00.000Z'));

        expect(result.birthdayGifts).toBe(2);
        expect(sentTo()).toEqual(['del28@vitto.club', 'del29@vitto.club']);
      });

      it('en un año bisiesto, el 28/02 lo reciben solo los del 28/02 y el 29/02, los del 29/02', async () => {
        await customer('del28', born(1990, 2, 28));
        await customer('del29', born(2000, 2, 29));

        await daily.run(new Date('2028-02-28T15:00:00.000Z'));
        expect(sentTo()).toEqual(['del28@vitto.club']);

        email.sent.length = 0;
        await daily.run(new Date('2028-02-29T15:00:00.000Z'));
        expect(sentTo()).toEqual(['del29@vitto.club']);
      });
    });
  });

  // --- US-47: puntos por vencer ---

  describe('puntos por vencer (US-47)', () => {
    const now = new Date('2026-11-13T12:00:00.000Z');
    const lot = (customerId: number, remaining: number, expiresAt: Date, status: 'ACTIVE' | 'EXPIRED' = 'ACTIVE') =>
      prisma.pointsLot.create({
        data: {
          customerId,
          initialPoints: 2000,
          remainingPoints: remaining,
          accreditedAt: new Date(now.getTime() - 300 * DAY),
          expiresAt,
          status,
        },
      });

    it('manda UN correo por lote que vence en 7 días o menos, con sus puntos y su fecha (CA-47.1 a CA-47.3)', async () => {
      const id = await customer('ana', null);
      const first = await lot(id, 1250, new Date('2026-11-19T15:00:00.000Z'));

      const result = await daily.run(now);

      expect(result).toMatchObject({ expiringLots: 1, failures: 0 });
      expect(email.sent).toHaveLength(1);
      expect(email.sent[0]).toMatchObject({ to: 'ana@vitto.club', subject: 'Tus puntos están por vencer' });
      expect(email.sent[0].text).toContain('Hola Nombreana: tenés 1.250 pts que vencen el 19/11/2026.');
      expect(await prisma.notification.findMany({ where: { customerId: id } })).toEqual([
        expect.objectContaining({ type: 'POINTS_EXPIRING', status: 'SENT', dedupeKey: `lot:${first.id}` }),
      ]);
    });

    it('la fecha va en hora de Argentina', async () => {
      const id = await customer('ana', null);
      // 01:00 UTC del 20/11 es todavía el 19/11 en Argentina
      await lot(id, 10, new Date('2026-11-20T01:00:00.000Z'));

      await daily.run(now);

      expect(email.sent[0].text).toContain('vencen el 19/11/2026');
    });

    it('un cliente con dos lotes por vencer recibe dos correos, uno por lote', async () => {
      const id = await customer('ana', null);
      await lot(id, 100, new Date('2026-11-15T15:00:00.000Z'));
      await lot(id, 200, new Date('2026-11-18T15:00:00.000Z'));

      await daily.run(now);

      expect(email.sent.map((message) => message.text)).toEqual([
        expect.stringContaining('tenés 100 pts que vencen el 15/11/2026'),
        expect.stringContaining('tenés 200 pts que vencen el 18/11/2026'),
      ]);
    });

    it('manda solo con el saldo que le queda al lote, no con el inicial', async () => {
      const id = await customer('ana', null);
      await lot(id, 30, new Date('2026-11-15T15:00:00.000Z'));

      await daily.run(now);

      expect(email.sent[0].text).toContain('tenés 30 pts');
    });

    it('no avisa lotes que vencen más allá de 7 días, ya vencidos, sin saldo, ni de clientes dados de baja', async () => {
      const id = await customer('ana', null);
      const baja = await customer('baja', null, { isActive: false });
      await lot(id, 10, new Date(now.getTime() + 7 * DAY + 1));
      await lot(id, 10, new Date(now.getTime() - DAY));
      await lot(id, 0, new Date(now.getTime() + 2 * DAY));
      await lot(id, 10, new Date(now.getTime() + 2 * DAY), 'EXPIRED');
      await lot(baja, 10, new Date(now.getTime() + 2 * DAY));

      const result = await daily.run(now);

      expect(result.expiringLots).toBe(0);
      expect(email.sent).toEqual([]);
      expect(await prisma.notification.count()).toBe(0);
    });

    it('el borde: un lote que vence justo a los 7 días entra', async () => {
      const id = await customer('ana', null);
      await lot(id, 10, new Date(now.getTime() + 7 * DAY));

      expect((await daily.run(now)).expiringLots).toBe(1);
    });

    it('una vez por lote: correr el proceso otra vez no repite el correo (CA-47.4)', async () => {
      const id = await customer('ana', null);
      await lot(id, 10, new Date(now.getTime() + 2 * DAY));

      await daily.run(now);
      await daily.run(new Date(now.getTime() + DAY));

      expect(email.sent).toHaveLength(1);
      expect(await prisma.notification.count({ where: { customerId: id } })).toBe(1);
    });

    it('un correo que falla queda FAILED y no frena a los demás lotes', async () => {
      const ana = await customer('ana', null);
      const beto = await customer('beto', null);
      await lot(ana, 10, new Date(now.getTime() + 2 * DAY));
      await lot(beto, 10, new Date(now.getTime() + 3 * DAY));
      email.failing.add('ana@vitto.club');

      const result = await daily.run(now);

      expect(result).toMatchObject({ expiringLots: 2, failures: 0 });
      expect(await prisma.notification.findMany({ orderBy: { customerId: 'asc' } })).toEqual([
        expect.objectContaining({ customerId: ana, status: 'FAILED' }),
        expect.objectContaining({ customerId: beto, status: 'SENT' }),
      ]);
    });

    it('con el tipo desactivado no manda: queda SKIPPED, una sola vez por lote', async () => {
      await prisma.notificationTemplate.update({ where: { type: 'POINTS_EXPIRING' }, data: { active: false } });
      const id = await customer('ana', null);
      await lot(id, 10, new Date(now.getTime() + 2 * DAY));

      await daily.run(now);
      await daily.run(now);

      expect(email.sent).toEqual([]);
      expect(await prisma.notification.findMany({ where: { customerId: id } })).toEqual([
        expect.objectContaining({ type: 'POINTS_EXPIRING', status: 'SKIPPED' }),
      ]);
    });

    it('no toca puntos, lotes ni movimientos: solo avisa', async () => {
      const id = await customer('ana', null, { balance: 10 });
      const created = await lot(id, 10, new Date(now.getTime() + 2 * DAY));

      await daily.run(now);

      expect(await prisma.pointsLot.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({
        remainingPoints: 10,
        status: 'ACTIVE',
      });
      expect(await prisma.pointsMovement.count()).toBe(0);
    });
  });
});
