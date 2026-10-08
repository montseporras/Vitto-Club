import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const ADMIN = { email: 'admin@test.com', password: 'clave-del-admin' };
const CASHIER = { email: 'cajero@test.com', password: 'clave-del-cajero' };

const LUCIA = {
  firstName: 'Lucía',
  lastName: 'Fernández',
  documentType: 'DNI',
  documentNumber: '40.123.456',
  email: 'Lucia@Test.com',
  password: 'clave-de-lucia',
};

// SCRUM-160: autorregistro de clientes, de punta a punta y sin nada falso (base real,
// contraseñas hasheadas de verdad, login real)
describe('Autorregistro de clientes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const register = (body: object) => request(app.getHttpServer()).post('/api/registro').send(body);
  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const tokenOf = async (credentials: { email: string; password: string }) =>
    (await login(credentials.email, credentials.password).expect(200)).body.accessToken as string;

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

  // En orden de claves foráneas. Se usa también al terminar: otras suites limpian solo sus
  // tablas, y el historial de estados que dejan las bajas de acá les impediría borrar clientes.
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

  describe('registro exitoso', () => {
    it('sin iniciar sesión, crea el cliente y su cuenta y responde 201 sin tokens', async () => {
      const res = await register(LUCIA).expect(201);

      expect(res.body).toEqual({
        customerId: expect.any(Number),
        email: 'lucia@test.com',
        firstName: 'Lucía',
        lastName: 'Fernández',
      });
      expect(res.body).not.toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeUndefined();

      const customer = await prisma.customer.findUniqueOrThrow({ where: { id: res.body.customerId } });
      expect(customer).toMatchObject({ documentNumber: '40123456', email: 'lucia@test.com', isActive: true });

      const account = await prisma.account.findFirstOrThrow({ where: { customerId: res.body.customerId } });
      expect(account).toMatchObject({ email: 'lucia@test.com', role: 'CUSTOMER', isActive: true });
      expect(account.passwordHash).not.toContain(LUCIA.password);
    });

    it('después del registro, el cliente inicia sesión con su email y su contraseña', async () => {
      const { body } = await register(LUCIA).expect(201);

      const res = await login(' LUCIA@test.com ', LUCIA.password).expect(200);

      expect(res.body.user).toMatchObject({
        role: 'CUSTOMER',
        customerId: body.customerId,
        email: 'lucia@test.com',
      });
    });

    it('teléfono y fecha de nacimiento son opcionales', async () => {
      const res = await register({ ...LUCIA, phone: '1155555555', dateOfBirth: '1998-05-14' }).expect(201);

      const customer = await prisma.customer.findUniqueOrThrow({ where: { id: res.body.customerId } });
      expect(customer.phone).toBe('1155555555');
    });
  });

  describe('datos ya registrados: 409 y no se crea nada', () => {
    it('email de un cliente activo: dice que el repetido es el email', async () => {
      await register(LUCIA).expect(201);

      const res = await register({ ...LUCIA, documentNumber: '30111222', email: 'lucia@TEST.com' }).expect(409);

      expect(res.body.message).toContain('email');
      expect(res.body.message).toContain('comunicate con el restaurante');
      expect(res.body.details).toEqual([{ field: 'email', message: res.body.message }]);
      expect(await prisma.customer.count()).toBe(1);
      expect(await prisma.account.count({ where: { role: 'CUSTOMER' } })).toBe(1);
    });

    it('documento de un cliente activo: dice que el repetido es el documento', async () => {
      await register(LUCIA).expect(201);

      const res = await register({ ...LUCIA, email: 'otra@test.com' }).expect(409);

      expect(res.body.message).toContain('documento');
      expect(res.body.details).toEqual([{ field: 'documentNumber', message: res.body.message }]);
      expect(await prisma.customer.count()).toBe(1);
    });

    it('email de un empleado: 409 y no queda el cliente', async () => {
      const res = await register({ ...LUCIA, email: CASHIER.email }).expect(409);

      expect(res.body.details).toEqual([{ field: 'email', message: res.body.message }]);
      expect(await prisma.customer.count()).toBe(0);
    });

    it('email de un cliente cargado en caja (sin cuenta): 409 y no queda nada', async () => {
      await prisma.customer.create({
        data: { firstName: 'Ana', lastName: 'Caja', documentType: 'DNI', documentNumber: '30111222', email: 'lucia@test.com' },
      });

      await register(LUCIA).expect(409);

      expect(await prisma.customer.count()).toBe(1);
      expect(await prisma.account.count({ where: { role: 'CUSTOMER' } })).toBe(0);
    });
  });

  describe('datos inválidos: 400 y no se crea nada', () => {
    it.each([
      ['sin nombre', { firstName: undefined }],
      ['sin apellido', { lastName: undefined }],
      ['sin documento', { documentNumber: undefined }],
      ['sin email', { email: undefined }],
      ['sin contraseña', { password: undefined }],
      ['contraseña de menos de 8 caracteres', { password: 'corta12' }],
      ['contraseña de más de 72 bytes', { password: 'á'.repeat(40) }],
      ['contraseña igual al email', { email: 'lucia@test.com', password: 'lucia@test.com' }],
      ['DNI con formato inválido', { documentNumber: '12' }],
      ['un campo que no existe (por ejemplo, el rol)', { role: 'ADMIN' }],
    ])('%s', async (_case, overrides) => {
      await register({ ...LUCIA, ...overrides }).expect(400);

      expect(await prisma.customer.count()).toBe(0);
      expect(await prisma.account.count({ where: { role: 'CUSTOMER' } })).toBe(0);
    });
  });

  describe('después del registro', () => {
    it('si el cajero le cambia el email, el cliente entra con el nuevo y no con el viejo', async () => {
      const { body } = await register(LUCIA).expect(201);
      const cashier = await tokenOf(CASHIER);

      await request(app.getHttpServer())
        .patch(`/api/customers/${body.customerId}`)
        .set(as(cashier))
        .send({ email: 'lucia.nueva@test.com' })
        .expect(200);

      await login('lucia.nueva@test.com', LUCIA.password).expect(200);
      await login('lucia@test.com', LUCIA.password).expect(401);
    });

    it('si el email nuevo ya es de otra cuenta, el cambio se rechaza y no cambia nada', async () => {
      const { body } = await register(LUCIA).expect(201);
      const cashier = await tokenOf(CASHIER);

      await request(app.getHttpServer())
        .patch(`/api/customers/${body.customerId}`)
        .set(as(cashier))
        .send({ email: ADMIN.email })
        .expect(409);

      const customer = await prisma.customer.findUniqueOrThrow({ where: { id: body.customerId } });
      expect(customer.email).toBe('lucia@test.com');
      await login('lucia@test.com', LUCIA.password).expect(200);
    });

    it('dado de baja, el cliente ya no puede iniciar sesión', async () => {
      const { body } = await register(LUCIA).expect(201);
      const admin = await tokenOf(ADMIN);

      await request(app.getHttpServer())
        .patch(`/api/customers/${body.customerId}/deactivate`)
        .set(as(admin))
        .expect(204);

      await login('lucia@test.com', LUCIA.password).expect(401);
    });

    // Decisión del PO (2026-10-08): un cliente dado de baja puede volver a registrarse como un
    // cliente nuevo. En customers ya funciona (DNI y email únicos solo entre activos), pero la
    // cuenta vieja todavía ocupa el email en accounts (accounts.email es único entre TODAS las
    // cuentas). Se habilita cuando llegue el cambio de accounts que está haciendo Maga.
    it.skip('dado de baja, puede volver a registrarse con el mismo DNI y email (pendiente: accounts.email)', async () => {
      const first = await register(LUCIA).expect(201);
      const admin = await tokenOf(ADMIN);
      await request(app.getHttpServer())
        .patch(`/api/customers/${first.body.customerId}/deactivate`)
        .set(as(admin))
        .expect(204);

      const second = await register({ ...LUCIA, password: 'clave-nueva-123' }).expect(201);

      expect(second.body.customerId).not.toBe(first.body.customerId);
      await login('lucia@test.com', 'clave-nueva-123').expect(200);
      await login('lucia@test.com', LUCIA.password).expect(401);
    });
  });
});
