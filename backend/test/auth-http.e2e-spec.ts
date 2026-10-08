import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CredentialsVerifier, VerifiedAccount } from '../src/auth/domain/port/credentials-verifier.js';
import { CurrentUser } from '../src/shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../src/shared/security/current-user-data.js';
import { Public } from '../src/shared/security/public.decorator.js';
import { Roles } from '../src/shared/security/roles.decorator.js';

// Endpoints de prueba para ejercitar los guards con cada combinación de marcas
@Controller('guard-probe')
class GuardProbeController {
  @Public()
  @Get('public')
  open() {
    return { ok: true };
  }

  @Roles('ADMIN')
  @Get('admin')
  admin(@CurrentUser() user: CurrentUserData) {
    return user;
  }

  @Roles('ADMIN', 'CASHIER')
  @Get('staff')
  staff(@CurrentUser() user: CurrentUserData) {
    return user;
  }

  @Get('undeclared')
  undeclared() {
    return { ok: true };
  }
}

// Reemplaza al verificador provisorio: acá sí hay cuentas con las que entrar
class FakeCredentials extends CredentialsVerifier {
  private entries: { verified: VerifiedAccount; password: string }[] = [];

  reset(): void {
    this.entries = [];
  }

  add(verified: VerifiedAccount, password: string): void {
    this.entries.push({ verified, password });
  }

  async verify(email: string, password: string): Promise<VerifiedAccount | null> {
    const entry = this.entries.find((e) => e.verified.email === email.trim().toLowerCase());
    return entry && entry.password === password ? entry.verified : null;
  }

  async findActiveById(accountId: number): Promise<VerifiedAccount | null> {
    return this.entries.find((e) => e.verified.account.accountId === accountId)?.verified ?? null;
  }
}

const setCookies = (res: request.Response): string[] => {
  const raw = res.headers['set-cookie'] as string[] | string | undefined;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
};

const refreshCookie = (res: request.Response) => setCookies(res).find((c) => c.startsWith('refresh_token='));

// "refresh_token=valor", listo para mandar en el encabezado Cookie
const cookiePair = (res: request.Response) => refreshCookie(res)!.split(';')[0];

describe('Auth por HTTP (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const credentials = new FakeCredentials();

  const createAccount = async (email: string, role: 'ADMIN' | 'CASHIER') => {
    const employee = await prisma.employee.create({
      data: { firstName: 'Test', lastName: 'Http', phone: '3510000000', email, role },
    });
    const account = await prisma.account.create({
      data: { email, passwordHash: 'x', role, employeeId: employee.id },
    });
    return { accountId: account.id, employeeId: employee.id };
  };

  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/api/auth/login').send({ email, password });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [GuardProbeController],
    })
      .overrideProvider(CredentialsVerifier)
      .useValue(credentials)
      .compile();

    app = moduleFixture.createNestApplication();
    // Igual que main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    // Los guards ya son globales: los registra AuthModule (APP_GUARD)
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    credentials.reset();

    const cashier = await createAccount('bruno@test.com', 'CASHIER');
    const admin = await createAccount('ana@test.com', 'ADMIN');
    credentials.add(
      {
        account: { accountId: cashier.accountId, role: 'CASHIER', employeeId: cashier.employeeId },
        email: 'bruno@test.com',
        firstName: 'Bruno',
        lastName: 'Pérez',
      },
      'clave-de-bruno',
    );
    credentials.add(
      { account: { accountId: admin.accountId, role: 'ADMIN', employeeId: admin.employeeId }, email: 'ana@test.com' },
      'clave-de-ana',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('con credenciales correctas responde el access token y la identidad', async () => {
      const res = await login('bruno@test.com', 'clave-de-bruno').expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({
        role: 'CASHIER',
        email: 'bruno@test.com',
        firstName: 'Bruno',
        lastName: 'Pérez',
      });
      expect(res.body.user.accountId).toEqual(expect.any(Number));
      expect(res.body.user.employeeId).toEqual(expect.any(Number));
    });

    it('el nombre viaja en la respuesta pero no dentro del access token', async () => {
      const res = await login('bruno@test.com', 'clave-de-bruno').expect(200);

      // El contenido de un JWT es legible por cualquiera: se decodifica la parte del medio
      const payload = JSON.parse(Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString());

      expect(Object.keys(payload).sort()).toEqual(['employeeId', 'exp', 'iat', 'role', 'sub']);
      expect(JSON.stringify(payload)).not.toContain('Bruno');
    });

    it('el refresh token viaja solo en una cookie httpOnly, acotada a las rutas de auth', async () => {
      const res = await login('bruno@test.com', 'clave-de-bruno').expect(200);

      const cookie = refreshCookie(res);
      expect(cookie).toBeDefined();
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/api/auth');
      expect(cookie).toContain('SameSite=Lax');
      expect(JSON.stringify(res.body)).not.toContain(cookiePair(res).split('=')[1]);
      expect(res.body.refreshToken).toBeUndefined();
    });

    it('con credenciales incorrectas responde 401 con el código fijo y sin cookie', async () => {
      const res = await login('bruno@test.com', 'otra-clave').expect(401);

      expect(res.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Los datos de acceso son incorrectos',
        code: 'INVALID_CREDENTIALS',
        path: '/api/auth/login',
      });
      expect(refreshCookie(res)).toBeUndefined();
    });

    it('rechaza campos vacíos o de más con 400, sin intentar autenticar', async () => {
      await login('', 'clave-de-bruno').expect(400);
      await login('bruno@test.com', '').expect(400);
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'bruno@test.com', password: 'clave-de-bruno', role: 'ADMIN' })
        .expect(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('con la cookie responde lo mismo que el login y cambia la cookie', async () => {
      const loginRes = await login('bruno@test.com', 'clave-de-bruno').expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookiePair(loginRes))
        .expect(200);

      expect(res.body.user).toEqual(loginRes.body.user);
      expect(res.body.user).toMatchObject({ firstName: 'Bruno', lastName: 'Pérez' });
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(cookiePair(res)).not.toBe(cookiePair(loginRes));
    });

    it('la cookie anterior deja de servir, y el error no borra la cookie', async () => {
      const loginRes = await login('bruno@test.com', 'clave-de-bruno').expect(200);
      await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', cookiePair(loginRes)).expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookiePair(loginRes))
        .expect(401);

      expect(res.body.code).toBe('INVALID_SESSION');
      expect(setCookies(res)).toHaveLength(0);
    });

    it('sin cookie responde 401', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);

      expect(res.body.code).toBe('INVALID_SESSION');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('responde 204, borra la cookie y la sesión ya no se puede renovar', async () => {
      const loginRes = await login('bruno@test.com', 'clave-de-bruno').expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookiePair(loginRes))
        .expect(204);

      expect(refreshCookie(res)).toContain('refresh_token=;');
      await request(app.getHttpServer()).post('/api/auth/refresh').set('Cookie', cookiePair(loginRes)).expect(401);
    });

    it('sin cookie también responde 204', async () => {
      await request(app.getHttpServer()).post('/api/auth/logout').expect(204);
    });
  });

  describe('guards', () => {
    const tokenOf = async (email: string, password: string) =>
      (await login(email, password).expect(200)).body.accessToken as string;

    it('un endpoint protegido sin token responde 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/guard-probe/staff').expect(401);

      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('un token inválido responde 401', async () => {
      await request(app.getHttpServer())
        .get('/api/guard-probe/staff')
        .set('Authorization', 'Bearer no-es-un-token')
        .expect(401);
    });

    it('con el access token del login se entra, y @CurrentUser entrega la identidad', async () => {
      const token = await tokenOf('bruno@test.com', 'clave-de-bruno');

      const res = await request(app.getHttpServer())
        .get('/api/guard-probe/staff')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({ role: 'CASHIER' });
      expect(res.body.accountId).toEqual(expect.any(Number));
      expect(res.body.employeeId).toEqual(expect.any(Number));
    });

    it('un cajero no entra a un endpoint solo para administradores: 403', async () => {
      const token = await tokenOf('bruno@test.com', 'clave-de-bruno');

      const res = await request(app.getHttpServer())
        .get('/api/guard-probe/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('un administrador sí entra', async () => {
      const token = await tokenOf('ana@test.com', 'clave-de-ana');

      await request(app.getHttpServer())
        .get('/api/guard-probe/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('un endpoint público responde sin token', async () => {
      await request(app.getHttpServer()).get('/api/guard-probe/public').expect(200);
    });

    it('un endpoint sin @Roles() ni @Public() queda cerrado aunque haya sesión', async () => {
      const token = await tokenOf('ana@test.com', 'clave-de-ana');

      await request(app.getHttpServer())
        .get('/api/guard-probe/undeclared')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
