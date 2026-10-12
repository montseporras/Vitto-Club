import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AuditCategory } from '../src/audit/domain/audit.repository.js';
import {
  CredentialsVerifier,
  VerifiedAccount,
} from '../src/auth/domain/port/credentials-verifier.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

class FakeCredentials extends CredentialsVerifier {
  private readonly entries: {
    verified: VerifiedAccount;
    password: string;
  }[] = [];

  reset(): void {
    this.entries.length = 0;
  }

  add(verified: VerifiedAccount, password: string): void {
    this.entries.push({ verified, password });
  }

  async verify(
    email: string,
    password: string,
  ): Promise<VerifiedAccount | null> {
    const entry = this.entries.find(
      ({ verified }) => verified.email === email.trim().toLowerCase(),
    );
    return entry?.password === password ? entry.verified : null;
  }

  async findActiveById(accountId: number): Promise<VerifiedAccount | null> {
    return (
      this.entries.find(
        ({ verified }) => verified.account.accountId === accountId,
      )?.verified ?? null
    );
  }
}

describe('Auditoría (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const credentials = new FakeCredentials();

  const createActor = async (
    email: string,
    role: 'ADMIN' | 'CASHIER',
    lastName: string,
  ) => {
    const employee = await prisma.employee.create({
      data: {
        firstName: 'Audit',
        lastName,
        phone: '3510000000',
        email,
        role,
      },
    });
    const account = await prisma.account.create({
      data: {
        email,
        passwordHash: 'unused',
        role,
        employeeId: employee.id,
      },
    });
    return { employee, account };
  };

  const login = async (email: string, password: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.accessToken as string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CredentialsVerifier)
      .useValue(credentials)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.employee.deleteMany();
    credentials.reset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('records every category, rolls back failed operations, and protects/filter the endpoint', async () => {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const admin = await createActor(
      `admin.audit.${suffix}@vitto.club`,
      'ADMIN',
      `Audit${suffix}`,
    );
    const cashier = await createActor(
      `cashier.audit.${suffix}@vitto.club`,
      'CASHIER',
      `Cashier${suffix}`,
    );
    credentials.add(
      {
        account: {
          accountId: admin.account.id,
          role: 'ADMIN',
          employeeId: admin.employee.id,
        },
        email: admin.employee.email,
      },
      'admin-password',
    );
    credentials.add(
      {
        account: {
          accountId: cashier.account.id,
          role: 'CASHIER',
          employeeId: cashier.employee.id,
        },
        email: cashier.employee.email,
      },
      'cashier-password',
    );

    const adminToken = await login(admin.employee.email, 'admin-password');
    const cashierToken = await login(
      cashier.employee.email,
      'cashier-password',
    );
    const runMarker = `Audit${suffix}`;
    const documentNumber = String(40000000 + Number(suffix.slice(-5)));

    await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Customer',
        lastName: runMarker,
        documentType: 'DNI',
        documentNumber,
        email: `customer.audit.${suffix}@vitto.club`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/empleados')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Cashier',
        lastName: runMarker,
        email: `employee.audit.${suffix}@vitto.club`,
        role: 'CASHIER',
        phone: '3510000000',
      })
      .expect(201);

    await request(app.getHttpServer())
      .put('/api/loyalty/configuration/points-validity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pointsExpirationMonths: 18 })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Duplicate',
        lastName: runMarker,
        documentType: 'DNI',
        documentNumber,
        email: `duplicate.audit.${suffix}@vitto.club`,
      })
      .expect(409);

    await request(app.getHttpServer()).get('/api/auditoria').expect(401);
    await request(app.getHttpServer())
      .get('/api/auditoria')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    const filtered = await request(app.getHttpServer())
      .get('/api/auditoria')
      .query({ performedBy: runMarker, category: AuditCategory.CONFIGURATION })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(filtered.body.items).toHaveLength(1);
    expect(filtered.body.items[0]).toMatchObject({
      performedBy: `Audit Audit${suffix}`,
      category: AuditCategory.CONFIGURATION,
    });

    const allEntries = await request(app.getHttpServer())
      .get('/api/auditoria')
      .query({ performedBy: runMarker })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(allEntries.body.items).toHaveLength(
      Object.values(AuditCategory).length,
    );
    expect(
      allEntries.body.items
        .map((entry: { category: string }) => entry.category)
        .sort(),
    ).toEqual(Object.values(AuditCategory).sort());
  });

  it('rejects calendar-invalid dates and treats date filters as Argentina local days', async () => {
    const tokenSuffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const admin = await createActor(
      `admin.date.${tokenSuffix}@vitto.club`,
      'ADMIN',
      `Date${tokenSuffix}`,
    );
    credentials.add(
      {
        account: {
          accountId: admin.account.id,
          role: 'ADMIN',
          employeeId: admin.employee.id,
        },
        email: admin.employee.email,
      },
      'admin-password',
    );
    const token = await login(admin.employee.email, 'admin-password');

    await request(app.getHttpServer())
      .get('/api/auditoria')
      .query({ date: '2026-02-31' })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    const dates = [
      new Date('2026-02-01T02:59:59.999Z'),
      new Date('2026-02-01T03:00:00.000Z'),
      new Date('2026-02-02T02:59:59.999Z'),
      new Date('2026-02-02T03:00:00.000Z'),
    ];
    for (const createdAt of dates) {
      await prisma.auditLog.create({
        data: {
          createdAt,
          performedBy: `Date Date${tokenSuffix}`,
          actorAccountId: admin.account.id,
          category: 'SESSION',
          action: 'Argentina day boundary',
        },
      });
    }

    const response = await request(app.getHttpServer())
      .get('/api/auditoria')
      .query({ date: '2026-02-01', performedBy: `Date${tokenSuffix}` })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.items).toHaveLength(2);
    expect(
      response.body.items.map(
        (entry: { createdAt: string }) => entry.createdAt,
      ),
    ).toEqual(['2026-02-02T02:59:59.999Z', '2026-02-01T03:00:00.000Z']);
  });
});
