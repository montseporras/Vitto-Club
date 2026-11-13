import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AuditService } from '../src/audit/application/audit.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';

// US-14 (CA-14.1, 14.1b, 14.2, 14.3, 14.5 y 14.9, contrato S5 §3.6): GET y PUT /configuracion/mensajes contra
// Postgres real. Las plantillas y los puntos de cumpleaños son filas de la migración de BASE-5: cada test las
// deja como las encontró.
describe('Mensajes automáticos (e2e, US-14)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: Record<string, string>;
  // La auditoría es solo inserción: no se borra, se mira desde el último id
  let lastAuditId = 0;

  // Los valores por defecto de la migración (contrato S5 §3.6.1)
  const DEFAULT_MESSAGES = [
    {
      type: 'POINTS_EXPIRING',
      active: true,
      subject: 'Tus puntos están por vencer',
      body: 'Hola {nombre}: tenés {puntos} pts que vencen el {fecha}. ¡Usalos antes de que caduquen!',
    },
    {
      type: 'BIRTHDAY',
      active: true,
      subject: '¡Feliz cumpleaños!',
      body: '¡Feliz cumpleaños, {nombre}! Te regalamos {puntos} pts para celebrar con nosotros.',
    },
    {
      type: 'MISSION',
      active: true,
      subject: '¡Completaste una misión!',
      body: '¡Bien, {nombre}! Completaste la misión {mision}. Entrá a Vitto Club para ver tu recompensa.',
    },
  ];
  const defaults = () => ({ birthdayBonusPoints: 100, messages: DEFAULT_MESSAGES.map((message) => ({ ...message })) });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    // Mismo mecanismo que los demás e2e: headers de prueba -> token real
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
  });

  afterAll(async () => {
    await restoreDefaults();
    await cleanAccounts();
    await app.close();
  });

  async function restoreDefaults() {
    for (const message of DEFAULT_MESSAGES) {
      await prisma.notificationTemplate.update({
        where: { type: message.type as 'POINTS_EXPIRING' | 'BIRTHDAY' | 'MISSION' },
        data: { active: message.active, subject: message.subject, body: message.body },
      });
    }
    await prisma.notificationSettings.update({ where: { id: 1 }, data: { birthdayBonusPoints: 100 } });
  }

  async function cleanAccounts() {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
  }

  beforeEach(async () => {
    await restoreDefaults();
    await cleanAccounts();
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
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  const put = (body: unknown) => request(app.getHttpServer()).put('/api/configuracion/mensajes').set(admin).send(body as object);

  // --- GET ---

  describe('GET /api/configuracion/mensajes (CA-14.1)', () => {
    it('devuelve los puntos de cumpleaños y los tres mensajes automáticos, en orden y sin PROMOTION', async () => {
      const response = await request(app.getHttpServer()).get('/api/configuracion/mensajes').set(admin);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(defaults());
      expect(response.body.messages.map((message: { type: string }) => message.type)).toEqual([
        'POINTS_EXPIRING',
        'BIRTHDAY',
        'MISSION',
      ]);
    });

    it('refleja lo guardado en la base', async () => {
      await prisma.notificationSettings.update({ where: { id: 1 }, data: { birthdayBonusPoints: 250 } });
      await prisma.notificationTemplate.update({ where: { type: 'MISSION' }, data: { active: false } });

      const response = await request(app.getHttpServer()).get('/api/configuracion/mensajes').set(admin);

      expect(response.body.birthdayBonusPoints).toBe(250);
      expect(response.body.messages[2]).toMatchObject({ type: 'MISSION', active: false });
    });

    it('no existe un endpoint de logo (S5-35): GET /configuracion/logo responde 404 (CA-14.4)', async () => {
      const response = await request(app.getHttpServer()).get('/api/configuracion/logo').set(admin);

      expect(response.status).toBe(404);
    });
  });

  // --- PUT: éxito, auditoría y rollback ---

  describe('PUT /api/configuracion/mensajes: guardar (CA-14.1b, 14.2, 14.3 y 14.5)', () => {
    it('guarda puntos, mensajes y activación; responde 200 con el mismo cuerpo que el GET', async () => {
      const body = defaults();
      body.birthdayBonusPoints = 150;
      body.messages[0].active = false;
      body.messages[1].subject = '¡Feliz día!';
      body.messages[1].body = '¡Que cumplas muchos, {nombre}! Te regalamos {puntos} pts.';

      const response = await put(body);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(body);
      const get = await request(app.getHttpServer()).get('/api/configuracion/mensajes').set(admin);
      expect(get.body).toEqual(body);
      expect((await prisma.notificationSettings.findUniqueOrThrow({ where: { id: 1 } })).birthdayBonusPoints).toBe(150);
    });

    it('audita UNA entrada LOGO_AND_MESSAGES_UPDATED con una fila por cambio, a nombre del Administrador', async () => {
      const body = defaults();
      body.birthdayBonusPoints = 150;
      body.messages[1].body = '¡Que cumplas muchos, {nombre}! {puntos} pts.';
      body.messages[0].active = false;

      await put(body).expect(200);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        performedBy: 'Diego Sosa',
        module: 'CONFIGURATION',
        actionCode: 'LOGO_AND_MESSAGES_UPDATED',
        description: 'Modificó los mensajes automáticos',
        affectedCustomerId: null,
        operationCode: null,
      });
      expect(rows[0].details).toEqual([
        { label: 'Puntos de cumpleaños', value: '100 → 150' },
        { label: 'Vencimiento de puntos', value: 'Activado → Desactivado' },
        { label: 'Mensaje de cumpleaños', value: 'Modificado' },
      ]);
    });

    it('sin cambios: guarda igual y audita "Cambios: Se guardó sin modificar valores"', async () => {
      await put(defaults()).expect(200);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].details).toEqual([{ label: 'Cambios', value: 'Se guardó sin modificar valores' }]);
    });

    it('acepta 0 y 10.000 puntos de cumpleaños (0 = no regala)', async () => {
      await put({ ...defaults(), birthdayBonusPoints: 0 }).expect(200);
      await put({ ...defaults(), birthdayBonusPoints: 10000 }).expect(200);

      expect((await prisma.notificationSettings.findUniqueOrThrow({ where: { id: 1 } })).birthdayBonusPoints).toBe(10000);
    });

    it('acepta el asunto de 120 y el mensaje de 1.000 caracteres', async () => {
      const body = defaults();
      body.messages[0].subject = 'a'.repeat(120);
      body.messages[0].body = 'b'.repeat(1000);

      await put(body).expect(200);
    });

    it('los tres mensajes pueden venir en cualquier orden y se devuelven en el del contrato', async () => {
      const body = defaults();
      body.messages.reverse();

      const response = await put(body);

      expect(response.status).toBe(200);
      expect(response.body.messages.map((message: { type: string }) => message.type)).toEqual([
        'POINTS_EXPIRING',
        'BIRTHDAY',
        'MISSION',
      ]);
    });

    it('si la auditoría falla, no queda nada guardado (rollback)', async () => {
      jest.spyOn(app.get(AuditService), 'record').mockRejectedValueOnce(new Error('falla la auditoría'));
      const body = defaults();
      body.birthdayBonusPoints = 999;
      body.messages[2].active = false;

      const response = await put(body);

      expect(response.status).toBe(500);
      expect((await prisma.notificationSettings.findUniqueOrThrow({ where: { id: 1 } })).birthdayBonusPoints).toBe(100);
      expect((await prisma.notificationTemplate.findUniqueOrThrow({ where: { type: 'MISSION' } })).active).toBe(true);
      expect(await newAuditRows()).toEqual([]);
      jest.restoreAllMocks();
    });
  });

  // --- PUT: validaciones ---

  describe('PUT /api/configuracion/mensajes: errores del contrato (CA-14.1b y CA-14.2)', () => {
    const POINTS_ERROR = 'Ingresá puntos enteros de 0 a 10.000.';

    it.each([
      ['negativos', -1],
      ['más de 10.000', 10001],
      ['con decimales', 1.5],
      ['un texto', 'cien'],
      ['nulos', null],
    ])('puntos de cumpleaños %s: 400 "Ingresá puntos enteros de 0 a 10.000."', async (_name, value) => {
      const response = await put({ ...defaults(), birthdayBonusPoints: value });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(POINTS_ERROR);
    });

    it('sin birthdayBonusPoints: 400 con el mismo mensaje', async () => {
      const { messages } = defaults();

      const response = await put({ messages });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(POINTS_ERROR);
    });

    it.each([
      ['vacío', '', 'El asunto es obligatorio.'],
      ['solo espacios', '   ', 'El asunto es obligatorio.'],
      ['de 121 caracteres', 'a'.repeat(121), 'El asunto no puede superar los 120 caracteres.'],
    ])('asunto %s: 400 "%s"', async (_name, subject, message) => {
      const body = defaults();
      body.messages[1].subject = subject;

      const response = await put(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(message);
      expect(response.body.details).toEqual([{ field: 'messages.1.subject', message }]);
    });

    it.each([
      ['vacío', '', 'El mensaje es obligatorio.'],
      ['solo espacios', '  \n ', 'El mensaje es obligatorio.'],
      ['de 1.001 caracteres', 'a'.repeat(1001), 'El mensaje no puede superar los 1.000 caracteres.'],
    ])('mensaje %s: 400 "%s"', async (_name, text, message) => {
      const body = defaults();
      body.messages[2].body = text;

      const response = await put(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(message);
      expect(response.body.details).toEqual([{ field: 'messages.2.body', message }]);
    });

    it('un mensaje PROMOTION: 400 "Las promociones no tienen mensaje automático."', async () => {
      const body = defaults();
      body.messages.push({ type: 'PROMOTION', active: true, subject: 'Promo', body: 'Hola {nombre}' });

      const response = await put(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Las promociones no tienen mensaje automático.');
      expect(response.body.details).toEqual([{ field: 'messages.3.type', message: 'Las promociones no tienen mensaje automático.' }]);
    });

    it.each([
      ['falta uno', () => defaults().messages.slice(0, 2)],
      ['no viene ninguno', () => []],
      ['uno viene repetido', () => [defaults().messages[0], defaults().messages[0], defaults().messages[1]]],
    ])('%s: 400 "Tienen que venir los tres mensajes automáticos."', async (_name, build) => {
      const response = await put({ birthdayBonusPoints: 100, messages: build() });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Tienen que venir los tres mensajes automáticos.');
    });

    it('una variable que no corresponde al tipo: 400 con la variable entre llaves y el campo en details', async () => {
      const body = defaults();
      body.messages[1].body = '¡Feliz cumpleaños, {nombre}! Vence el {fecha}.';

      const response = await put(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('La variable {fecha} no se puede usar en este mensaje.');
      expect(response.body.details).toEqual([
        { field: 'messages.1.body', message: 'La variable {fecha} no se puede usar en este mensaje.' },
      ]);
    });

    it('la variable también se controla en el asunto', async () => {
      const body = defaults();
      body.messages[2].subject = 'Completaste {mision} y ganaste {puntos}';

      const response = await put(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('La variable {puntos} no se puede usar en este mensaje.');
      expect(response.body.details[0].field).toBe('messages.2.subject');
    });

    it('un tipo desconocido, un active que no es booleano y un campo de más: 400', async () => {
      const unknownType = defaults();
      (unknownType.messages[0] as { type: string }).type = 'FOO';
      expect((await put(unknownType)).status).toBe(400);

      const badActive = defaults();
      (badActive.messages[0] as { active: unknown }).active = 'si';
      expect((await put(badActive)).status).toBe(400);

      const response = await put({ ...defaults(), logo: 'logo.png' });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('property logo should not exist');
    });

    it('ningún pedido inválido guarda ni audita nada', async () => {
      const body = defaults();
      body.birthdayBonusPoints = 999;
      body.messages[0].subject = '';

      await put(body).expect(400);

      expect(await newAuditRows()).toEqual([]);
      expect((await prisma.notificationSettings.findUniqueOrThrow({ where: { id: 1 } })).birthdayBonusPoints).toBe(100);
    });
  });

  // --- Roles ---

  describe('Permisos (CA-14.9, contrato S5 §4)', () => {
    const cashier = { 'x-test-auth-role': 'CASHIER', 'x-test-account-id': '900', 'x-test-employee-id': '900' };
    const customer = { 'x-test-auth-role': 'CUSTOMER', 'x-test-account-id': '901', 'x-test-customer-id': '901' };

    it.each([
      ['Cajero', cashier],
      ['Cliente', customer],
    ])('%s recibe 403 FORBIDDEN en GET y en PUT, y no se guarda nada', async (_role, headers) => {
      const get = await request(app.getHttpServer()).get('/api/configuracion/mensajes').set(headers);
      const putResponse = await request(app.getHttpServer())
        .put('/api/configuracion/mensajes')
        .set(headers)
        .send({ ...defaults(), birthdayBonusPoints: 777 });

      expect(get.status).toBe(403);
      expect(get.body.code).toBe('FORBIDDEN');
      expect(putResponse.status).toBe(403);
      expect((await prisma.notificationSettings.findUniqueOrThrow({ where: { id: 1 } })).birthdayBonusPoints).toBe(100);
      expect(await newAuditRows()).toEqual([]);
    });

    it('sin token: 401', async () => {
      expect((await request(app.getHttpServer()).get('/api/configuracion/mensajes')).status).toBe(401);
      expect((await request(app.getHttpServer()).put('/api/configuracion/mensajes').send(defaults())).status).toBe(401);
    });
  });
});
