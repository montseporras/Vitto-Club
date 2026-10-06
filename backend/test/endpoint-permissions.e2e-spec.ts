import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CredentialsVerifier, VerifiedAccount } from '../src/auth/domain/port/credentials-verifier.js';
import { JwtAuthGuard } from '../src/auth/http/guards/jwt-auth.guard.js';
import { RolesGuard } from '../src/auth/http/guards/roles.guard.js';

type Actor = 'admin' | 'cashier' | 'customer';
type Endpoint = { method: 'get' | 'post' | 'patch' | 'delete'; path: string };
type Outcome = 'unauthenticated' | 'forbidden' | 'allowed';

const ACTORS: Actor[] = ['admin', 'cashier', 'customer'];

// Los ids no existen a propósito: si el guard deja pasar, el endpoint responde 400 o 404, y
// eso alcanza para saber que el pedido llegó al controller.
const CUSTOMER_ENDPOINTS: Endpoint[] = [
  { method: 'get', path: '/api/customers' },
  { method: 'get', path: '/api/customers/by-document?documentType=DNI&documentNumber=99999999' },
  { method: 'get', path: '/api/customers/999999' },
  { method: 'get', path: '/api/customers/999999/status-history' },
  { method: 'post', path: '/api/customers' },
  { method: 'patch', path: '/api/customers/999999' },
  { method: 'patch', path: '/api/customers/999999/deactivate' },
  { method: 'patch', path: '/api/customers/999999/activate' },
];

const EMPLOYEE_ENDPOINTS: Endpoint[] = [
  { method: 'get', path: '/api/empleados' },
  { method: 'get', path: '/api/empleados/999999' },
  { method: 'post', path: '/api/empleados' },
  { method: 'patch', path: '/api/empleados/999999' },
  { method: 'delete', path: '/api/empleados/999999' },
];

// La matriz de permisos: quién puede usar cada grupo de endpoints
const GROUPS: { name: string; endpoints: Endpoint[]; allowed: Actor[] }[] = [
  { name: 'customers', endpoints: CUSTOMER_ENDPOINTS, allowed: ['admin', 'cashier'] },
  { name: 'empleados', endpoints: EMPLOYEE_ENDPOINTS, allowed: ['admin'] },
];

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

const outcomeOf = (status: number): Outcome =>
  status === 401 ? 'unauthenticated' : status === 403 ? 'forbidden' : 'allowed';

describe('Permisos por rol de los endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const credentials = new FakeCredentials();
  const tokens = {} as Record<Actor, string>;

  const call = (endpoint: Endpoint, token?: string) => {
    const req = request(app.getHttpServer())[endpoint.method](endpoint.path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  const createEmployeeAccount = async (email: string, role: 'ADMIN' | 'CASHIER') => {
    const employee = await prisma.employee.create({
      data: { firstName: 'Test', lastName: 'Perm', phone: '3510000000', email, role },
    });
    const account = await prisma.account.create({
      data: { email, passwordHash: 'x', role, employeeId: employee.id },
    });
    return { accountId: account.id, employeeId: employee.id };
  };

  const loginAs = async (email: string, password: string): Promise<string> => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);
    return res.body.accessToken as string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CredentialsVerifier)
      .useValue(credentials)
      .compile();

    app = moduleFixture.createNestApplication();
    // Igual que main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    // En la aplicación real los guards se registran globalmente en la integración
    app.useGlobalGuards(app.get(JwtAuthGuard), app.get(RolesGuard));
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.employee.deleteMany();
    credentials.reset();

    const admin = await createEmployeeAccount('ana@test.com', 'ADMIN');
    const cashier = await createEmployeeAccount('bruno@test.com', 'CASHIER');

    const customer = await prisma.customer.create({
      data: {
        firstName: 'Lucía',
        lastName: 'Perm',
        documentType: 'DNI',
        documentNumber: '40123456',
        email: 'lucia@test.com',
      },
    });
    const customerAccount = await prisma.account.create({
      data: { email: 'lucia@test.com', passwordHash: 'x', role: 'CUSTOMER', customerId: customer.id },
    });

    credentials.add(
      { account: { accountId: admin.accountId, role: 'ADMIN', employeeId: admin.employeeId }, email: 'ana@test.com' },
      'clave-de-ana',
    );
    credentials.add(
      { account: { accountId: cashier.accountId, role: 'CASHIER', employeeId: cashier.employeeId }, email: 'bruno@test.com' },
      'clave-de-bruno',
    );
    credentials.add(
      { account: { accountId: customerAccount.id, role: 'CUSTOMER', customerId: customer.id }, email: 'lucia@test.com' },
      'clave-de-lucia',
    );

    tokens.admin = await loginAs('ana@test.com', 'clave-de-ana');
    tokens.cashier = await loginAs('bruno@test.com', 'clave-de-bruno');
    tokens.customer = await loginAs('lucia@test.com', 'clave-de-lucia');
  });

  afterAll(async () => {
    await app.close();
  });

  it('el health check es público', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  for (const group of GROUPS) {
    describe(`/api/${group.name} (pueden: ${group.allowed.join(', ')})`, () => {
      for (const endpoint of group.endpoints) {
        it(`${endpoint.method.toUpperCase()} ${endpoint.path}`, async () => {
          // Sin token: 401 con el código fijo (prueba que el filtro del módulo lo deja pasar)
          const anonymous = await call(endpoint);
          expect(anonymous.status).toBe(401);
          expect(anonymous.body.code).toBe('UNAUTHENTICATED');

          for (const actor of ACTORS) {
            const res = await call(endpoint, tokens[actor]);
            const expected: Outcome = group.allowed.includes(actor) ? 'allowed' : 'forbidden';

            expect({ actor, outcome: outcomeOf(res.status) }).toEqual({ actor, outcome: expected });

            if (expected === 'forbidden') {
              expect(res.body).toMatchObject({ statusCode: 403, error: 'Forbidden', code: 'FORBIDDEN' });
            }
          }
        });
      }
    });
  }
});
