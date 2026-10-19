import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const ADMIN = { email: 'admin@test.com', password: 'clave-del-admin' };
const CASHIER = { email: 'cajero@test.com', password: 'clave-del-cajero' };

const SOFIA = {
  firstName: 'Sofía',
  lastName: 'Ríos',
  documentType: 'DNI',
  documentNumber: '38.456.123',
  email: 'Sofia.Rios@Test.com',
};

// US-17-AJ: el Cajero o el Administrador dan de alta un cliente y se crea también su cuenta,
// con el documento como contraseña inicial y mustChangePassword = true. De punta a punta, con
// base real, hashes reales y login real.
describe('Alta de cliente con cuenta y contraseña inicial (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
  const tokenOf = async (credentials: { email: string; password: string }) =>
    (await login(credentials.email, credentials.password).expect(200)).body.accessToken as string;
  const createCustomer = (token: string, body: object) =>
    request(app.getHttpServer()).post('/api/customers').set(as(token)).send(body);

  const createEmployeeWithAccount = async (email: string, role: 'ADMIN' | 'CASHIER', password: string) => {
    const employee = await prisma.employee.create({
      data: { firstName: 'Test', lastName: role, phone: '3510000000', email, role },
    });
    await prisma.account.create({
      data: { email, passwordHash: await bcrypt.hash(password, 4), role, employeeId: employee.id },
    });
  };

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
    await prisma.customer.deleteMany();
    await prisma.employee.deleteMany();
  };

  beforeEach(async () => {
    await cleanDatabase();

    await createEmployeeWithAccount(ADMIN.email, 'ADMIN', ADMIN.password);
    await createEmployeeWithAccount(CASHIER.email, 'CASHIER', CASHIER.password);
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  describe('alta válida', () => {
    it('el Cajero da de alta un cliente: 201 con el Customer, sin contraseña, y queda su cuenta (CA-17AJ.1, CA-17AJ.4)', async () => {
      const cashier = await tokenOf(CASHIER);

      const res = await createCustomer(cashier, SOFIA).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        firstName: 'Sofía',
        lastName: 'Ríos',
        documentType: 'DNI',
        documentNumber: '38456123',
        email: 'sofia.rios@test.com',
        phone: null,
        dateOfBirth: null,
        active: true,
        deactivatedAt: null,
        createdAt: expect.any(String),
      });
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');

      const account = await prisma.account.findFirstOrThrow({ where: { customerId: res.body.id } });
      expect(account).toMatchObject({
        email: 'sofia.rios@test.com',
        role: 'CUSTOMER',
        isActive: true,
        mustChangePassword: true,
        employeeId: null,
      });
      // El hash es el del documento NORMALIZADO, y el documento en claro no está guardado
      expect(await bcrypt.compare('38456123', account.passwordHash)).toBe(true);
      expect(account.passwordHash).not.toContain('38456123');
    });

    it('el Administrador también puede darlo de alta', async () => {
      const admin = await tokenOf(ADMIN);

      const res = await createCustomer(admin, SOFIA).expect(201);

      const account = await prisma.account.findFirstOrThrow({ where: { customerId: res.body.id } });
      expect(account.mustChangePassword).toBe(true);
    });

    it('cliente y cuenta se crean juntos (CA-17AJ.1)', async () => {
      const cashier = await tokenOf(CASHIER);

      await createCustomer(cashier, SOFIA).expect(201);

      expect(await prisma.customer.count()).toBe(1);
      expect(await prisma.account.count({ where: { role: 'CUSTOMER' } })).toBe(1);
    });
  });

  describe('login con la contraseña inicial (CA-17AJ.5)', () => {
    it('con su email y su documento accede y mustChangePassword es true', async () => {
      const cashier = await tokenOf(CASHIER);
      const created = await createCustomer(cashier, SOFIA).expect(201);

      // El documento se escribe como lo devuelve la API (sin puntos)
      const res = await login('Sofia.Rios@Test.com', '38456123').expect(200);

      expect(res.body.user).toEqual({
        accountId: expect.any(Number),
        role: 'CUSTOMER',
        customerId: created.body.id,
        email: 'sofia.rios@test.com',
        firstName: 'Sofía',
        lastName: 'Ríos',
        mustChangePassword: true,
      });
    });

    it('la renovación (refresh) también devuelve mustChangePassword = true', async () => {
      const cashier = await tokenOf(CASHIER);
      await createCustomer(cashier, SOFIA).expect(201);
      const loginRes = await login('sofia.rios@test.com', '38456123').expect(200);

      // Solo el par "refresh_token=valor", como lo manda un navegador
      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      const refreshPair = cookies.find((c) => c.startsWith('refresh_token='))!.split(';')[0];

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', refreshPair)
        .expect(200);

      expect(res.body.user.mustChangePassword).toBe(true);
    });

    it('el documento con puntos no sirve como contraseña: la inicial es el número normalizado', async () => {
      const cashier = await tokenOf(CASHIER);
      await createCustomer(cashier, SOFIA).expect(201);

      await login('sofia.rios@test.com', '38.456.123').expect(401);
    });

    it('pasaporte: la contraseña inicial es el número en mayúsculas', async () => {
      const cashier = await tokenOf(CASHIER);
      await createCustomer(cashier, {
        ...SOFIA,
        documentType: 'PASSPORT',
        documentNumber: 'ab-123 456',
      }).expect(201);

      await login('sofia.rios@test.com', 'ab123456').expect(401);
      const res = await login('sofia.rios@test.com', 'AB123456').expect(200);
      expect(res.body.user.mustChangePassword).toBe(true);
    });

    // CA-17AJ.3: un DNI de 7 dígitos tiene menos de 8 caracteres, el mínimo de la política
    it('un DNI de 7 dígitos es válido como contraseña inicial: no pasa por la política (CA-17AJ.3)', async () => {
      const cashier = await tokenOf(CASHIER);
      await createCustomer(cashier, { ...SOFIA, documentNumber: '1234567' }).expect(201);

      await login('sofia.rios@test.com', '1234567').expect(200);
    });

    it('un empleado entra con mustChangePassword = false', async () => {
      const res = await login(CASHIER.email, CASHIER.password).expect(200);

      expect(res.body.user.mustChangePassword).toBe(false);
    });
  });

  describe('email en uso: 409 EMAIL_IN_USE y no se crea nada (CA-17AJ.2)', () => {
    it('email de un empleado activo', async () => {
      const cashier = await tokenOf(CASHIER);

      const res = await createCustomer(cashier, { ...SOFIA, email: ADMIN.email }).expect(409);

      expect(res.body.code).toBe('EMAIL_IN_USE');
      expect(await prisma.customer.count()).toBe(0);
      expect(await prisma.account.count({ where: { role: 'CUSTOMER' } })).toBe(0);
    });

    it('email de otro cliente activo', async () => {
      const cashier = await tokenOf(CASHIER);
      await createCustomer(cashier, SOFIA).expect(201);

      const res = await createCustomer(cashier, { ...SOFIA, documentNumber: '30111222' }).expect(409);

      expect(res.body.code).toBe('EMAIL_IN_USE');
      expect(await prisma.customer.count()).toBe(1);
      expect(await prisma.account.count({ where: { role: 'CUSTOMER' } })).toBe(1);
    });

    // El email lo ocupa solo una CUENTA activa: no hay cliente activo ni empleado con ese email.
    // Pasa, por ejemplo, con la cuenta de un cliente dado de baja que sigue activa (CORR).
    // Salta el listener de accounts, no el chequeo previo de customers: la transacción tiene que
    // deshacer también el cliente que ya se había guardado.
    it('email de una cuenta activa sin cliente activo: el listener rechaza y se deshace el cliente', async () => {
      const baja = await prisma.customer.create({
        data: {
          firstName: 'Vieja',
          lastName: 'Baja',
          documentType: 'DNI',
          documentNumber: '20111222',
          email: 'sofia.rios@test.com',
          isActive: false,
          deactivatedAt: new Date(),
        },
      });
      await prisma.account.create({
        data: { email: 'sofia.rios@test.com', passwordHash: await bcrypt.hash('x', 4), role: 'CUSTOMER', customerId: baja.id },
      });
      const cashier = await tokenOf(CASHIER);

      const res = await createCustomer(cashier, SOFIA).expect(409);

      expect(res.body.code).toBe('EMAIL_IN_USE');
      // Solo queda el cliente dado de baja que ya existía: el nuevo se deshizo
      expect(await prisma.customer.count()).toBe(1);
      expect(await prisma.account.count({ where: { role: 'CUSTOMER' } })).toBe(1);
    });

    it('un email que solo usa una cuenta inactiva no está ocupado', async () => {
      const baja = await prisma.customer.create({
        data: {
          firstName: 'Vieja',
          lastName: 'Baja',
          documentType: 'DNI',
          documentNumber: '20111222',
          email: 'sofia.rios@test.com',
          isActive: false,
          deactivatedAt: new Date(),
        },
      });
      await prisma.account.create({
        data: {
          email: 'sofia.rios@test.com',
          passwordHash: await bcrypt.hash('x', 4),
          role: 'CUSTOMER',
          customerId: baja.id,
          isActive: false,
        },
      });
      const cashier = await tokenOf(CASHIER);

      await createCustomer(cashier, SOFIA).expect(201);

      expect(await prisma.account.count({ where: { email: 'sofia.rios@test.com', isActive: true } })).toBe(1);
    });
  });

  describe('lo que no cambia', () => {
    it('documento repetido sigue siendo 409 sin code y no crea cuenta', async () => {
      const cashier = await tokenOf(CASHIER);
      await createCustomer(cashier, SOFIA).expect(201);

      const res = await createCustomer(cashier, { ...SOFIA, email: 'otra@test.com' }).expect(409);

      expect(res.body).not.toHaveProperty('code');
      expect(await prisma.account.count({ where: { role: 'CUSTOMER' } })).toBe(1);
    });

    it('datos inválidos siguen siendo 400 y no crean nada', async () => {
      const cashier = await tokenOf(CASHIER);

      await createCustomer(cashier, { ...SOFIA, documentNumber: '12' }).expect(400);

      expect(await prisma.customer.count()).toBe(0);
      expect(await prisma.account.count({ where: { role: 'CUSTOMER' } })).toBe(0);
    });

    it('sin sesión: 401', async () => {
      await request(app.getHttpServer()).post('/api/customers').send(SOFIA).expect(401);
    });

    it('un cliente no puede dar de alta clientes: 403', async () => {
      const cashier = await tokenOf(CASHIER);
      await createCustomer(cashier, SOFIA).expect(201);
      const customer = await tokenOf({ email: 'sofia.rios@test.com', password: '38456123' });

      await createCustomer(customer, { ...SOFIA, documentNumber: '30111222', email: 'otra@test.com' }).expect(403);
    });
  });

  // CA-17AJ.6
  describe('el autorregistro no cambia (CA-17AJ.6)', () => {
    it('el cliente elige su contraseña y entra con mustChangePassword = false', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...SOFIA, documentNumber: '40123456', email: 'lucia@test.com', password: 'clave-de-lucia' })
        .expect(201);

      const res = await login('lucia@test.com', 'clave-de-lucia').expect(200);

      expect(res.body.user.mustChangePassword).toBe(false);
      const account = await prisma.account.findFirstOrThrow({ where: { email: 'lucia@test.com' } });
      expect(account.mustChangePassword).toBe(false);
      expect(await prisma.account.count({ where: { role: 'CUSTOMER' } })).toBe(1);
    });
  });

  // CA-17AJ.8: depende de US-57 (AuditService.capture), que todavía no existe en develop.
  it.todo('registra CUSTOMER_CREATED con la fila "Cuenta de acceso" y sin el valor de la contraseña (CA-17AJ.8, pendiente de US-57)');
});
