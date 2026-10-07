import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const ANA = { email: 'ana@test.com', password: 'clave-de-ana' };
const BRUNO = { email: 'bruno@test.com', password: 'clave-de-bruno' };

const setCookies = (res: request.Response): string[] => {
  const raw = res.headers['set-cookie'] as string[] | string | undefined;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
};
const cookiePair = (res: request.Response) =>
  setCookies(res).find((c) => c.startsWith('refresh_token='))!.split(';')[0];

// Sin nada falso: login real, contraseñas hasheadas de verdad, cuentas reales en la base
describe('Autenticación de punta a punta (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // El hash se genera con bcryptjs directo, igual que el seed: prueba que el adaptador de
  // accounts verifica hashes hechos por otra instancia
  const createEmployeeWithAccount = async (email: string, role: 'ADMIN' | 'CASHIER', password: string) => {
    const employee = await prisma.employee.create({
      data: { firstName: 'Test', lastName: role, phone: '3510000000', email, role },
    });
    const account = await prisma.account.create({
      data: { email, passwordHash: await bcrypt.hash(password, 4), role, employeeId: employee.id },
    });
    return { employeeId: employee.id, accountId: account.id };
  };

  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/api/auth/login').send({ email, password });

  const tokenOf = async (credentials: { email: string; password: string }) =>
    (await login(credentials.email, credentials.password).expect(200)).body.accessToken as string;

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  let ana: { employeeId: number; accountId: number };
  let bruno: { employeeId: number; accountId: number };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleFixture.createNestApplication();
    // Igual que main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();

    ana = await createEmployeeWithAccount(ANA.email, 'ADMIN', ANA.password);
    bruno = await createEmployeeWithAccount(BRUNO.email, 'CASHIER', BRUNO.password);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('iniciar sesión', () => {
    it('un empleado entra con su contraseña real y recibe su identidad', async () => {
      const res = await login(ANA.email, ANA.password).expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({
        accountId: ana.accountId,
        role: 'ADMIN',
        employeeId: ana.employeeId,
        email: ANA.email,
      });
    });

    it('el email no distingue mayúsculas ni espacios en los extremos', async () => {
      await login('  Ana@TEST.com ', ANA.password).expect(200);
    });

    it('contraseña incorrecta, email inexistente y cuenta dada de baja responden exactamente lo mismo', async () => {
      await prisma.account.update({ where: { id: bruno.accountId }, data: { isActive: false } });

      const wrongPassword = await login(ANA.email, 'otra-clave-1').expect(401);
      const unknownEmail = await login('nadie@test.com', ANA.password).expect(401);
      const deactivated = await login(BRUNO.email, BRUNO.password).expect(401);

      for (const res of [wrongPassword, unknownEmail, deactivated]) {
        expect(res.body).toMatchObject({
          statusCode: 401,
          message: 'Los datos de acceso son incorrectos',
          code: 'INVALID_CREDENTIALS',
        });
      }
    });
  });

  describe('permisos por rol, con tokens reales', () => {
    it('sin token, 401; el Administrador entra a empleados y usuarios; el Cajero solo a clientes', async () => {
      await request(app.getHttpServer()).get('/api/empleados').expect(401);

      const admin = await tokenOf(ANA);
      const cashier = await tokenOf(BRUNO);

      await request(app.getHttpServer()).get('/api/empleados').set(as(admin)).expect(200);
      await request(app.getHttpServer()).get(`/api/usuarios/empleado/${bruno.employeeId}`).set(as(admin)).expect(200);

      await request(app.getHttpServer()).get('/api/customers').set(as(cashier)).expect(200);
      await request(app.getHttpServer()).get('/api/empleados').set(as(cashier)).expect(403);
      await request(app.getHttpServer()).get(`/api/usuarios/empleado/${bruno.employeeId}`).set(as(cashier)).expect(403);
    });
  });

  describe('cuentas creadas desde la aplicación', () => {
    it('el Administrador crea la cuenta de un empleado y ese empleado puede iniciar sesión', async () => {
      const carla = await prisma.employee.create({
        data: { firstName: 'Carla', lastName: 'Sin cuenta', phone: '3510000003', email: 'carla@test.com', role: 'CASHIER' },
      });
      const admin = await tokenOf(ANA);

      await request(app.getHttpServer())
        .post('/api/usuarios')
        .set(as(admin))
        .send({ employeeId: carla.id, email: 'carla@test.com', password: 'clave-de-carla' })
        .expect(201);

      const res = await login('carla@test.com', 'clave-de-carla').expect(200);
      expect(res.body.user).toMatchObject({ role: 'CASHIER', employeeId: carla.id });
    });

    it('rechaza una contraseña de más de 72 bytes aunque tenga menos de 64 caracteres', async () => {
      const carla = await prisma.employee.create({
        data: { firstName: 'Carla', lastName: 'Sin cuenta', phone: '3510000003', email: 'carla@test.com', role: 'CASHIER' },
      });
      const admin = await tokenOf(ANA);

      await request(app.getHttpServer())
        .post('/api/usuarios')
        .set(as(admin))
        .send({ employeeId: carla.id, email: 'carla@test.com', password: 'á'.repeat(37) })
        .expect(400);
    });
  });

  describe('sesiones', () => {
    it('la renovación toma el rol actual: un cajero ascendido lo ve sin volver a iniciar sesión', async () => {
      const loginRes = await login(BRUNO.email, BRUNO.password).expect(200);
      const admin = await tokenOf(ANA);

      await request(app.getHttpServer())
        .patch(`/api/empleados/${bruno.employeeId}`)
        .set(as(admin))
        .send({ firstName: 'Test', lastName: 'Ascendido', role: 'ADMIN' })
        .expect(200);

      const refreshed = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookiePair(loginRes))
        .expect(200);

      expect(refreshed.body.user.role).toBe('ADMIN');
    });

    it('dar de baja la cuenta cierra las sesiones abiertas de ese usuario', async () => {
      const brunoSession = await login(BRUNO.email, BRUNO.password).expect(200);
      const admin = await tokenOf(ANA);

      await request(app.getHttpServer()).patch(`/api/usuarios/${bruno.accountId}/deactivate`).set(as(admin)).expect(204);

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookiePair(brunoSession))
        .expect(401);
      expect(res.body.code).toBe('INVALID_SESSION');
      await login(BRUNO.email, BRUNO.password).expect(401);
    });

    it('dar de baja al empleado también cierra su sesión', async () => {
      const brunoSession = await login(BRUNO.email, BRUNO.password).expect(200);
      const admin = await tokenOf(ANA);

      await request(app.getHttpServer()).delete(`/api/empleados/${bruno.employeeId}`).set(as(admin)).expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookiePair(brunoSession))
        .expect(401);
    });
  });
});
