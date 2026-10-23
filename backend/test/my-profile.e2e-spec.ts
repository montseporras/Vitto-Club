import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/application/auth.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const ADMIN = { email: 'admin@test.com', password: 'clave-del-admin' };
const CASHIER = { email: 'cajero@test.com', password: 'clave-del-cajero' };

const MARCOS = {
  email: 'marcos.peralta@test.com',
  password: 'ClaveDeMarcos1',
  documentNumber: '30111222',
};

// PERFIL: Mi perfil, cambio de contraseña y cierre de otras sesiones del Cliente (contrato §3.10 y
// §3.11.1). De punta a punta, con base real, hashes reales y login real.
describe('Mi perfil y cambio de contraseña (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerId: number;
  let accountId: number;

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
  const tokenOf = async (credentials: { email: string; password: string }) =>
    (await login(credentials.email, credentials.password).expect(200)).body.accessToken as string;

  // "refresh_token=valor", listo para mandar en el encabezado Cookie
  const cookieOf = (res: request.Response): string => {
    const raw = res.headers['set-cookie'] as string[] | string | undefined;
    const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.find((c) => c.startsWith('refresh_token=') && !c.startsWith('refresh_token=;'))!.split(';')[0];
  };

  // Un ingreso completo: token y cookie de esa sesión
  const session = async (email: string, password: string) => {
    const res = await login(email, password).expect(200);
    return { token: res.body.accessToken as string, cookie: cookieOf(res) };
  };
  const refresh = (cookie: string) => request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', cookie);

  const getMe = (token: string) => request(app.getHttpServer()).get('/api/customers/me').set(as(token));
  const patchMe = (token: string, body: object) =>
    request(app.getHttpServer()).patch('/api/customers/me').set(as(token)).send(body);
  const changePassword = (token: string, body: object, cookie?: string) => {
    const req = request(app.getHttpServer()).patch('/api/mi-cuenta/password').set(as(token));
    return (cookie ? req.set('Cookie', cookie) : req).send(body);
  };

  const createEmployeeWithAccount = async (email: string, role: 'ADMIN' | 'CASHIER', password: string) => {
    const employee = await prisma.employee.create({
      data: { firstName: 'Test', lastName: role, phone: '3510000000', email, role },
    });
    await prisma.account.create({
      data: { email, passwordHash: await bcrypt.hash(password, 4), role, employeeId: employee.id },
    });
  };

  const createCustomerWithAccount = async (data: {
    email: string;
    documentNumber: string;
    password: string;
    mustChangePassword?: boolean;
    active?: boolean;
  }) => {
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Marcos',
        lastName: 'Peralta',
        documentType: 'DNI',
        documentNumber: data.documentNumber,
        email: data.email,
        phone: '3547-555123',
        dateOfBirth: new Date('1990-05-14T00:00:00.000Z'),
        isActive: data.active ?? true,
      },
    });
    const account = await prisma.account.create({
      data: {
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 4),
        role: 'CUSTOMER',
        customerId: customer.id,
        isActive: data.active ?? true,
        mustChangePassword: data.mustChangePassword ?? false,
      },
    });
    return { customer, account };
  };

  const countAudit = () => prisma.auditLog.count();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleFixture.createNestApplication();
    // Igual que main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  // En orden de claves foráneas
  const cleanDatabase = async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.customerStatusChange.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.employee.deleteMany();
  };

  beforeEach(async () => {
    await cleanDatabase();

    await createEmployeeWithAccount(ADMIN.email, 'ADMIN', ADMIN.password);
    await createEmployeeWithAccount(CASHIER.email, 'CASHIER', CASHIER.password);
    const { customer, account } = await createCustomerWithAccount(MARCOS);
    customerId = customer.id;
    accountId = account.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  describe('GET /api/customers/me (CA-PER.1)', () => {
    it('el Cliente recibe su perfil con la forma del contrato, campo por campo', async () => {
      const token = await tokenOf(MARCOS);

      const res = await getMe(token).expect(200);

      expect(res.body).toEqual({
        id: customerId,
        firstName: 'Marcos',
        lastName: 'Peralta',
        documentType: 'DNI',
        documentNumber: '30111222',
        email: 'marcos.peralta@test.com',
        phone: '3547-555123',
        dateOfBirth: '1990-05-14',
        createdAt: expect.any(String),
      });
    });

    it('devuelve null en el teléfono y la fecha si no los tiene', async () => {
      await prisma.customer.update({ where: { id: customerId }, data: { phone: null, dateOfBirth: null } });
      const token = await tokenOf(MARCOS);

      const res = await getMe(token).expect(200);

      expect(res.body.phone).toBeNull();
      expect(res.body.dateOfBirth).toBeNull();
    });

    it('el cliente sale del token: otro cliente ve el suyo', async () => {
      await createCustomerWithAccount({
        email: 'otra@test.com',
        documentNumber: '40222333',
        password: 'ClaveDeOtra1',
      });

      const res = await getMe(await tokenOf({ email: 'otra@test.com', password: 'ClaveDeOtra1' })).expect(200);

      expect(res.body.documentNumber).toBe('40222333');
    });

    it('el Administrador y el Cajero reciben 403', async () => {
      await getMe(await tokenOf(ADMIN)).expect(403);
      await getMe(await tokenOf(CASHIER)).expect(403);
    });

    it('sin token recibe 401', async () => {
      await request(app.getHttpServer()).get('/api/customers/me').expect(401);
    });
  });

  describe('PATCH /api/customers/me (CA-PER.3 a CA-PER.5)', () => {
    it('solo con el teléfono: 200 con el perfil actualizado, sin pedir contraseña', async () => {
      const token = await tokenOf(MARCOS);

      const res = await patchMe(token, { phone: '+54 351 555-0000' }).expect(200);

      expect(res.body).toEqual({
        id: customerId,
        firstName: 'Marcos',
        lastName: 'Peralta',
        documentType: 'DNI',
        documentNumber: '30111222',
        email: 'marcos.peralta@test.com',
        phone: '+54 351 555-0000',
        dateOfBirth: '1990-05-14',
        createdAt: expect.any(String),
      });
      expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).phone).toBe('+54 351 555-0000');
    });

    it('con null borra el teléfono y la fecha de nacimiento', async () => {
      const token = await tokenOf(MARCOS);

      const res = await patchMe(token, { phone: null, dateOfBirth: null }).expect(200);

      expect(res.body.phone).toBeNull();
      expect(res.body.dateOfBirth).toBeNull();
    });

    it('cambia la fecha de nacimiento', async () => {
      const token = await tokenOf(MARCOS);

      const res = await patchMe(token, { dateOfBirth: '1985-12-01' }).expect(200);

      expect(res.body.dateOfBirth).toBe('1985-12-01');
    });

    it('el Administrador y el Cajero reciben 403; sin token, 401', async () => {
      await patchMe(await tokenOf(ADMIN), { phone: '3547-555123' }).expect(403);
      await patchMe(await tokenOf(CASHIER), { phone: '3547-555123' }).expect(403);
      await request(app.getHttpServer()).patch('/api/customers/me').send({ phone: '3547-555123' }).expect(401);
    });

    describe('campos que no se editan (CA-PER.4)', () => {
      it.each(['firstName', 'lastName', 'documentType', 'documentNumber'])(
        '%s: 400 "property %s should not exist"',
        async (field) => {
          const token = await tokenOf(MARCOS);

          const res = await patchMe(token, { phone: '3547-555123', [field]: 'X' }).expect(400);

          expect(JSON.stringify(res.body.message)).toContain(`property ${field} should not exist`);
        },
      );

      it('y no se cambió nada', async () => {
        const token = await tokenOf(MARCOS);

        await patchMe(token, { firstName: 'Otro', phone: '3547-000000' }).expect(400);

        const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
        expect(customer.firstName).toBe('Marcos');
        expect(customer.phone).toBe('3547-555123');
      });
    });

    describe('validaciones', () => {
      it('un body sin ningún dato es 400', async () => {
        await patchMe(await tokenOf(MARCOS), {}).expect(400);
      });

      it('currentPassword solo, sin ningún dato, también es 400', async () => {
        await patchMe(await tokenOf(MARCOS), { currentPassword: MARCOS.password }).expect(400);
      });

      it('teléfono inválido: 400 con el mensaje del contrato', async () => {
        const res = await patchMe(await tokenOf(MARCOS), { phone: '123' }).expect(400);

        expect(res.body.message).toBe('El teléfono tiene que tener entre 8 y 15 números');
      });

      it('correo vacío: 400 "Este campo es obligatorio"', async () => {
        const res = await patchMe(await tokenOf(MARCOS), { email: '' }).expect(400);

        expect(res.body.message).toContain('Este campo es obligatorio');
      });

      it('correo con formato inválido: 400 con el mensaje del contrato', async () => {
        const res = await patchMe(await tokenOf(MARCOS), { email: 'no-es-un-mail' }).expect(400);

        expect(res.body.message).toContain('Ingresá un correo válido, por ejemplo nombre@mail.com');
      });

      it('fecha futura: 400 "La fecha no puede ser futura"', async () => {
        const res = await patchMe(await tokenOf(MARCOS), { dateOfBirth: '2999-01-01' }).expect(400);

        expect(res.body.message).toBe('La fecha no puede ser futura');
      });

      it('fecha inexistente o anterior a 1900: 400 "Esa fecha no existe"', async () => {
        const token = await tokenOf(MARCOS);

        expect((await patchMe(token, { dateOfBirth: '1990-02-31' }).expect(400)).body.message).toBe(
          'Esa fecha no existe',
        );
        expect((await patchMe(token, { dateOfBirth: '1899-12-31' }).expect(400)).body.message).toBe(
          'Esa fecha no existe',
        );
      });
    });

    describe('cambiar el correo (CA-PER.5)', () => {
      it('sin contraseña actual: 400 y no se guarda nada, tampoco el teléfono', async () => {
        const token = await tokenOf(MARCOS);

        const res = await patchMe(token, { email: 'nuevo@test.com', phone: '3547-000000' }).expect(400);

        expect(res.body.message).toBe('Ingresá tu contraseña actual para cambiar el correo');
        expect(res.body.code).toBeUndefined();
        const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
        expect(customer.email).toBe('marcos.peralta@test.com');
        expect(customer.phone).toBe('3547-555123');
      });

      it('con la contraseña incorrecta: 400 CURRENT_PASSWORD_INCORRECT y no se guarda nada (ni teléfono ni fecha)', async () => {
        const token = await tokenOf(MARCOS);

        const res = await patchMe(token, {
          email: 'nuevo@test.com',
          currentPassword: 'equivocada',
          phone: '3547-000000',
          dateOfBirth: '1985-12-01',
        }).expect(400);

        expect(res.body).toMatchObject({
          statusCode: 400,
          code: 'CURRENT_PASSWORD_INCORRECT',
          message: 'La contraseña actual es incorrecta',
        });
        const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
        expect(customer).toMatchObject({ email: 'marcos.peralta@test.com', phone: '3547-555123' });
        expect(customer.dateOfBirth?.toISOString().slice(0, 10)).toBe('1990-05-14');
        expect((await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).email).toBe(
          'marcos.peralta@test.com',
        );
      });

      it('con la contraseña correcta: cambia el correo del cliente y el de acceso, y la sesión sigue abierta', async () => {
        const { token, cookie } = await session(MARCOS.email, MARCOS.password);

        const res = await patchMe(token, { email: ' Nuevo@Test.com ', currentPassword: MARCOS.password }).expect(200);

        expect(res.body.email).toBe('nuevo@test.com');
        expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).email).toBe('nuevo@test.com');
        expect((await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).email).toBe('nuevo@test.com');
        // La sesión actual sigue abierta: el access token sirve y la cookie renueva
        await getMe(token).expect(200);
        const renewed = await refresh(cookie).expect(200);
        expect(renewed.body.user.email).toBe('nuevo@test.com');
        // Entra con el correo nuevo y ya no con el viejo
        await login('nuevo@test.com', MARCOS.password).expect(200);
        await login(MARCOS.email, MARCOS.password).expect(401);
      });

      it('cambia el correo junto con el teléfono y la fecha', async () => {
        const token = await tokenOf(MARCOS);

        const res = await patchMe(token, {
          email: 'nuevo@test.com',
          currentPassword: MARCOS.password,
          phone: '3547-000000',
          dateOfBirth: '1985-12-01',
        }).expect(200);

        expect(res.body).toMatchObject({ email: 'nuevo@test.com', phone: '3547-000000', dateOfBirth: '1985-12-01' });
      });

      it('el mismo correo con otras mayúsculas o espacios no es un cambio: no pide contraseña', async () => {
        const token = await tokenOf(MARCOS);

        const res = await patchMe(token, { email: '  MARCOS.Peralta@Test.com ', phone: '3547-000000' }).expect(200);

        expect(res.body).toMatchObject({ email: 'marcos.peralta@test.com', phone: '3547-000000' });
      });

      it('con el correo sin cambios, un currentPassword incorrecto se ignora', async () => {
        const token = await tokenOf(MARCOS);

        await patchMe(token, {
          email: 'marcos.peralta@test.com',
          currentPassword: 'equivocada',
          phone: '3547-000000',
        }).expect(200);
      });

      it('correo de otro cliente activo: 409 EMAIL_IN_USE', async () => {
        await createCustomerWithAccount({ email: 'ocupado@test.com', documentNumber: '40222333', password: 'ClaveDeOtro1' });
        const token = await tokenOf(MARCOS);

        const res = await patchMe(token, { email: 'ocupado@test.com', currentPassword: MARCOS.password }).expect(409);

        expect(res.body).toMatchObject({ statusCode: 409, code: 'EMAIL_IN_USE', message: 'Ese correo ya está registrado' });
        expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).email).toBe(
          'marcos.peralta@test.com',
        );
      });

      it('correo de un empleado activo: 409 EMAIL_IN_USE', async () => {
        const token = await tokenOf(MARCOS);

        const res = await patchMe(token, { email: CASHIER.email, currentPassword: MARCOS.password }).expect(409);

        expect(res.body.code).toBe('EMAIL_IN_USE');
      });

      it('el correo de un cliente dado de baja (cuenta inactiva) se puede usar', async () => {
        await createCustomerWithAccount({
          email: 'baja@test.com',
          documentNumber: '40222333',
          password: 'ClaveDeBaja1',
          active: false,
        });
        const token = await tokenOf(MARCOS);

        const res = await patchMe(token, { email: 'baja@test.com', currentPassword: MARCOS.password }).expect(200);

        expect(res.body.email).toBe('baja@test.com');
      });
    });

    describe('límite de intentos (CA-PER.6)', () => {
      it('al sexto intento con la contraseña incorrecta responde 429 TOO_MANY_ATTEMPTS', async () => {
        const token = await tokenOf(MARCOS);
        const wrong = { email: 'nuevo@test.com', currentPassword: 'equivocada' };

        for (let i = 0; i < 5; i++) {
          const res = await patchMe(token, wrong).expect(400);
          expect(res.body.code).toBe('CURRENT_PASSWORD_INCORRECT');
        }
        const res = await patchMe(token, wrong).expect(429);

        expect(res.body).toMatchObject({
          statusCode: 429,
          code: 'TOO_MANY_ATTEMPTS',
          message: 'Hiciste demasiados intentos. Probá de nuevo en unos minutos.',
        });
      });

      it('estando bloqueado, ni la contraseña correcta pasa', async () => {
        const token = await tokenOf(MARCOS);
        for (let i = 0; i < 5; i++) {
          await patchMe(token, { email: 'nuevo@test.com', currentPassword: 'equivocada' }).expect(400);
        }

        await patchMe(token, { email: 'nuevo@test.com', currentPassword: MARCOS.password }).expect(429);
      });

      it('el contador se comparte con el cambio de contraseña', async () => {
        const token = await tokenOf(MARCOS);
        for (let i = 0; i < 3; i++) {
          await patchMe(token, { email: 'nuevo@test.com', currentPassword: 'equivocada' }).expect(400);
        }
        for (let i = 0; i < 2; i++) {
          await changePassword(token, { currentPassword: 'equivocada', newPassword: 'OtraClave2026' }).expect(400);
        }

        await changePassword(token, { currentPassword: MARCOS.password, newPassword: 'OtraClave2026' }).expect(429);
        await patchMe(token, { email: 'nuevo@test.com', currentPassword: MARCOS.password }).expect(429);
      });

      it('el contador es por cuenta: otro cliente no queda bloqueado', async () => {
        await createCustomerWithAccount({ email: 'otra@test.com', documentNumber: '40222333', password: 'ClaveDeOtra1' });
        const token = await tokenOf(MARCOS);
        for (let i = 0; i < 5; i++) {
          await patchMe(token, { email: 'nuevo@test.com', currentPassword: 'equivocada' }).expect(400);
        }

        const otra = await tokenOf({ email: 'otra@test.com', password: 'ClaveDeOtra1' });
        await patchMe(otra, { email: 'nueva@test.com', currentPassword: 'ClaveDeOtra1' }).expect(200);
      });
    });

    it('no se audita (CA-PER.13)', async () => {
      const token = await tokenOf(MARCOS);
      const before = await countAudit();

      await patchMe(token, { email: 'nuevo@test.com', currentPassword: MARCOS.password, phone: '3547-000000' }).expect(200);

      expect(await countAudit()).toBe(before);
    });
  });

  describe('PATCH /api/mi-cuenta/password (CA-PER.8 y CA-PER.9)', () => {
    const NEW_PASSWORD = 'NuevaClave2026';

    it('sin token recibe 401', async () => {
      await request(app.getHttpServer())
        .patch('/api/mi-cuenta/password')
        .send({ currentPassword: MARCOS.password, newPassword: NEW_PASSWORD })
        .expect(401);
    });

    it('204 sin cuerpo: guarda el hash nuevo y mustChangePassword pasa a false', async () => {
      await prisma.account.update({
        where: { id: accountId },
        data: { mustChangePassword: true, passwordHash: await bcrypt.hash(MARCOS.documentNumber, 4) },
      });
      const { token, cookie } = await session(MARCOS.email, MARCOS.documentNumber);

      const res = await changePassword(
        token,
        { currentPassword: MARCOS.documentNumber, newPassword: NEW_PASSWORD },
        cookie,
      ).expect(204);

      expect(res.body).toEqual({});
      const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
      expect(account.mustChangePassword).toBe(false);
      expect(await bcrypt.compare(NEW_PASSWORD, account.passwordHash)).toBe(true);
      expect(account.passwordHash).not.toContain(NEW_PASSWORD);
      // Entra con la nueva, y la vieja ya no sirve
      const relogin = await login(MARCOS.email, NEW_PASSWORD).expect(200);
      expect(relogin.body.user.mustChangePassword).toBe(false);
      await login(MARCOS.email, MARCOS.documentNumber).expect(401);
    });

    it('cierra todas las otras sesiones y deja abierta la actual, identificada por la cookie', async () => {
      const first = await session(MARCOS.email, MARCOS.password);
      const current = await session(MARCOS.email, MARCOS.password);
      const third = await session(MARCOS.email, MARCOS.password);

      await changePassword(
        current.token,
        { currentPassword: MARCOS.password, newPassword: NEW_PASSWORD },
        current.cookie,
      ).expect(204);

      await refresh(first.cookie).expect(401);
      await refresh(third.cookie).expect(401);
      await refresh(current.cookie).expect(200);
    });

    it('no cierra las sesiones de otra cuenta', async () => {
      const mine = await session(MARCOS.email, MARCOS.password);
      const admin = await session(ADMIN.email, ADMIN.password);

      await changePassword(
        mine.token,
        { currentPassword: MARCOS.password, newPassword: NEW_PASSWORD },
        mine.cookie,
      ).expect(204);

      await refresh(admin.cookie).expect(200);
    });

    it('la cookie del login llega a este endpoint: se emite con Path=/api (Opción A)', async () => {
      const res = await login(MARCOS.email, MARCOS.password).expect(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      const issued = cookies.find((c) => c.startsWith('refresh_token=') && !c.startsWith('refresh_token=;'));

      expect(issued).toContain('Path=/api;');
      expect(issued).toContain('HttpOnly');
      // Además se borra la cookie con el path viejo, para que no tape a la nueva
      const legacy = cookies.find((c) => c.startsWith('refresh_token=;') && c.includes('Path=/api/auth'));
      expect(legacy).toBeDefined();
    });

    it('sin cookie se cierran todas las sesiones de la cuenta, incluida la actual', async () => {
      const only = await session(MARCOS.email, MARCOS.password);

      await changePassword(only.token, { currentPassword: MARCOS.password, newPassword: NEW_PASSWORD }).expect(204);

      await refresh(only.cookie).expect(401);
    });

    it('con la actual incorrecta: 400 CURRENT_PASSWORD_INCORRECT (400, no 401) y no cambia nada', async () => {
      const { token, cookie } = await session(MARCOS.email, MARCOS.password);

      const res = await changePassword(token, { currentPassword: 'equivocada', newPassword: NEW_PASSWORD }, cookie).expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'CURRENT_PASSWORD_INCORRECT',
        message: 'La contraseña actual es incorrecta',
      });
      await login(MARCOS.email, MARCOS.password).expect(200);
      await refresh(cookie).expect(200);
    });

    it('con la actual incorrecta y la nueva inválida gana CURRENT_PASSWORD_INCORRECT', async () => {
      const { token } = await session(MARCOS.email, MARCOS.password);

      const res = await changePassword(token, { currentPassword: 'equivocada', newPassword: 'corta' }).expect(400);

      expect(res.body.code).toBe('CURRENT_PASSWORD_INCORRECT');
    });

    it('nueva igual a la actual: 400 PASSWORD_SAME_AS_CURRENT', async () => {
      const { token } = await session(MARCOS.email, MARCOS.password);

      const res = await changePassword(token, { currentPassword: MARCOS.password, newPassword: MARCOS.password }).expect(400);

      expect(res.body).toMatchObject({
        code: 'PASSWORD_SAME_AS_CURRENT',
        message: 'La nueva contraseña no puede ser igual a la actual',
      });
    });

    it('nueva igual al documento: 400 PASSWORD_SAME_AS_DOCUMENT', async () => {
      const { token } = await session(MARCOS.email, MARCOS.password);

      const res = await changePassword(token, {
        currentPassword: MARCOS.password,
        newPassword: MARCOS.documentNumber,
      }).expect(400);

      expect(res.body).toMatchObject({
        code: 'PASSWORD_SAME_AS_DOCUMENT',
        message: 'La contraseña no puede ser tu número de documento',
      });
    });

    it('nueva igual al mail: 400', async () => {
      const { token } = await session(MARCOS.email, MARCOS.password);

      const res = await changePassword(token, { currentPassword: MARCOS.password, newPassword: MARCOS.email }).expect(400);

      expect(res.body.message).toBe('La contraseña no puede ser igual al mail');
    });

    it('nueva demasiado corta o larga: 400 con el mensaje de la regla', async () => {
      const { token } = await session(MARCOS.email, MARCOS.password);

      expect(
        (await changePassword(token, { currentPassword: MARCOS.password, newPassword: 'corta' }).expect(400)).body.message,
      ).toBe('Tiene que tener entre 8 y 64 caracteres');
      expect(
        (await changePassword(token, { currentPassword: MARCOS.password, newPassword: 'a'.repeat(65) }).expect(400)).body.message,
      ).toBe('Tiene que tener entre 8 y 64 caracteres');
    });

    it('nueva de más de 72 bytes aunque tenga menos de 64 caracteres: 400', async () => {
      const { token } = await session(MARCOS.email, MARCOS.password);

      const res = await changePassword(token, { currentPassword: MARCOS.password, newPassword: 'é'.repeat(40) }).expect(400);

      expect(res.body.message).toBe('La contraseña es demasiado larga');
    });

    it('rechaza campos de más (la confirmación no viaja) y campos faltantes', async () => {
      const { token } = await session(MARCOS.email, MARCOS.password);

      await changePassword(token, {
        currentPassword: MARCOS.password,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }).expect(400);
      await changePassword(token, { currentPassword: MARCOS.password }).expect(400);
      await changePassword(token, { newPassword: NEW_PASSWORD }).expect(400);
      await changePassword(token, { currentPassword: '', newPassword: NEW_PASSWORD }).expect(400);
    });

    it('al sexto intento con la actual incorrecta: 429 TOO_MANY_ATTEMPTS', async () => {
      const { token } = await session(MARCOS.email, MARCOS.password);
      const wrong = { currentPassword: 'equivocada', newPassword: NEW_PASSWORD };

      for (let i = 0; i < 5; i++) {
        await changePassword(token, wrong).expect(400);
      }
      const res = await changePassword(token, wrong).expect(429);

      expect(res.body).toMatchObject({
        statusCode: 429,
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Hiciste demasiados intentos. Probá de nuevo en unos minutos.',
      });
      // Bloqueado: ni la correcta pasa
      await changePassword(token, { currentPassword: MARCOS.password, newPassword: NEW_PASSWORD }).expect(429);
    });

    it('cualquier rol puede cambiar la suya: el Cajero también', async () => {
      const { token } = await session(CASHIER.email, CASHIER.password);

      await changePassword(token, { currentPassword: CASHIER.password, newPassword: 'OtraClaveCajero1' }).expect(204);

      await login(CASHIER.email, 'OtraClaveCajero1').expect(200);
    });

    it('el cambio de una cuenta de cliente no se audita (CA-PER.13)', async () => {
      const { token } = await session(MARCOS.email, MARCOS.password);
      const before = await countAudit();

      await changePassword(token, { currentPassword: MARCOS.password, newPassword: NEW_PASSWORD }).expect(204);

      expect(await countAudit()).toBe(before);
    });

    it('rollback: si cerrar las otras sesiones falla, la contraseña no cambia', async () => {
      const { token } = await session(MARCOS.email, MARCOS.password);
      const authService = app.get(AuthService);
      const spy = jest.spyOn(authService, 'revokeOtherSessionsOfAccount').mockRejectedValueOnce(new Error('falló'));
      const before = (await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).passwordHash;

      await changePassword(token, { currentPassword: MARCOS.password, newPassword: NEW_PASSWORD }).expect(500);

      expect((await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).passwordHash).toBe(before);
      spy.mockRestore();
    });
  });
});
