import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { LoyaltyConfigurationRepository } from '../src/loyalty/domain/port/loyalty-configuration.repository.js';

type RequestWithUser = Request & {
  user?: {
    role: string;
  };
};

const POINTS_EQUIVALENCE_URL = '/api/loyalty/configuration/points-equivalence';
const POINTS_VALIDITY_URL = '/api/loyalty/configuration/points-validity';
const FIRST_PURCHASE_BONUS_URL =
  '/api/loyalty/configuration/first-purchase-bonus';
const CURRENT_LOYALTY_CONFIG_URL = '/api/loyalty/configuration/current';
const LOYALTY_CONFIG_URL = '/api/loyalty/configuration';

describe('Loyalty configuration (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Test-only stand-in for the principal that the authentication module will provide.
    app.use((request: Request, _response: Response, next: NextFunction) => {
      const role = request.header('x-test-auth-role');
      if (role) {
        (request as RequestWithUser).user = { role };
      }
      next();
    });

    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.loyaltyProgramConfiguration.deleteMany();
    await prisma.loyaltyPointsConfiguration.deleteMany();
    await prisma.loyaltyPointsValidityConfiguration.deleteMany();
    await prisma.firstPurchaseBonusConfiguration.deleteMany();
    await prisma.loyaltyProgramConfiguration.create({
      data: { version: 1 },
    });
  });

  afterAll(async () => {
    await prisma.loyaltyProgramConfiguration.deleteMany();
    await prisma.loyaltyPointsConfiguration.deleteMany();
    await prisma.loyaltyPointsValidityConfiguration.deleteMany();
    await prisma.firstPurchaseBonusConfiguration.deleteMany();
    await app.close();
  });

  it('rejects a request without an authenticated principal', async () => {
    await request(app.getHttpServer()).get(POINTS_EQUIVALENCE_URL).expect(401);
  });

  it('rejects an authenticated user without the ADMIN role', async () => {
    await request(app.getHttpServer())
      .get(POINTS_EQUIVALENCE_URL)
      .set('x-test-auth-role', 'CASHIER')
      .expect(403);
  });

  it('returns 404 to an administrator until the first configuration is saved', async () => {
    await request(app.getHttpServer())
      .get(POINTS_EQUIVALENCE_URL)
      .set('x-test-auth-role', 'ADMIN')
      .expect(404);
  });

  it('rejects invalid values and does not persist them', async () => {
    const response = await request(app.getHttpServer())
      .put(POINTS_EQUIVALENCE_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({ baseAmount: -1, pointsAwarded: 10 })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(1);
  });

  it('rejects fields outside the request DTO', async () => {
    await request(app.getHttpServer())
      .put(POINTS_EQUIVALENCE_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({ baseAmount: 996, pointsAwarded: 10, role: 'ADMIN' })
      .expect(400);

    await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(1);
  });

  it('persists the equivalence, replaces it on update, and returns it on GET', async () => {
    await request(app.getHttpServer())
      .put(POINTS_EQUIVALENCE_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({ baseAmount: 996, pointsAwarded: 10 })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ baseAmount: 996, pointsAwarded: 10 });
        expect(body.updatedAt).toEqual(expect.any(String));
      });

    const updated = await request(app.getHttpServer())
      .put(POINTS_EQUIVALENCE_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({ baseAmount: 150.25, pointsAwarded: 3 })
      .expect(200);

    expect(updated.body).toMatchObject({
      baseAmount: 150.25,
      pointsAwarded: 3,
    });

    const current = await request(app.getHttpServer())
      .get(POINTS_EQUIVALENCE_URL)
      .set('x-test-auth-role', 'ADMIN')
      .expect(200);

    expect(current.body).toEqual(updated.body);
    await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(3);
  });

  it('requires an authenticated administrator to read or change points validity', async () => {
    await request(app.getHttpServer()).get(POINTS_VALIDITY_URL).expect(401);
    await request(app.getHttpServer())
      .put(POINTS_VALIDITY_URL)
      .send({ pointsExpirationMonths: 18 })
      .expect(401);

    await request(app.getHttpServer())
      .put(POINTS_VALIDITY_URL)
      .set('x-test-auth-role', 'CASHIER')
      .send({ pointsExpirationMonths: 18 })
      .expect(403);

    await expect(
      prisma.loyaltyPointsValidityConfiguration.count(),
    ).resolves.toBe(0);
  });

  it('returns the 12-month default without creating a database record', async () => {
    const response = await request(app.getHttpServer())
      .get(POINTS_VALIDITY_URL)
      .set('x-test-auth-role', 'ADMIN')
      .expect(200);

    expect(response.body).toMatchObject({
      pointsExpirationMonths: 12,
      updatedAt: expect.any(String),
    });
    await expect(
      prisma.loyaltyPointsValidityConfiguration.count(),
    ).resolves.toBe(0);
  });

  it('applies the PostgreSQL column default when months are omitted on insert', async () => {
    await prisma.$executeRaw`
      INSERT INTO "loyalty_points_validity_configuration" ("id", "updated_at")
      VALUES (1, CURRENT_TIMESTAMP)
    `;

    const stored = await prisma.loyaltyPointsValidityConfiguration.findUnique({
      where: { id: 1 },
    });
    expect(stored?.pointsExpirationMonths).toBe(12);
  });

  it('persists and returns a custom points validity', async () => {
    const response = await request(app.getHttpServer())
      .put(POINTS_VALIDITY_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({ pointsExpirationMonths: 18 })
      .expect(200);

    expect(response.body.pointsExpirationMonths).toBe(18);
    expect(response.body.updatedAt).toEqual(expect.any(String));

    const current = await request(app.getHttpServer())
      .get(POINTS_VALIDITY_URL)
      .set('x-test-auth-role', 'ADMIN')
      .expect(200);

    expect(current.body).toEqual(response.body);
    await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(2);
  });

  it.each([
    [{}, 12],
    [{ pointsExpirationMonths: null }, 12],
    [{ pointsExpirationMonths: '' }, 12],
  ])(
    'stores the 12-month default for payload %j',
    async (payload, expected) => {
      const response = await request(app.getHttpServer())
        .put(POINTS_VALIDITY_URL)
        .set('x-test-auth-role', 'ADMIN')
        .send(payload);

      expect(response.status).toBe(200, JSON.stringify(response.body));

      expect(response.body.pointsExpirationMonths).toBe(expected);
      const stored = await prisma.loyaltyProgramConfiguration.findFirst({
        where: { isActive: true },
      });
      expect(stored?.pointsExpirationMonths).toBe(expected);
    },
  );

  it('defaults to 12 months for an absent or null request body', async () => {
    for (const sendNullBody of [false, true]) {
      let call = request(app.getHttpServer())
        .put(POINTS_VALIDITY_URL)
        .set('x-test-auth-role', 'ADMIN');
      if (sendNullBody) {
        call = call.send(null);
      }
      const response = await call.expect(200);
      expect(response.body.pointsExpirationMonths).toBe(12);
    }
  });

  it.each(['abc', '12months', 1.5, 0, -2, 2_147_483_648])(
    'rejects invalid points validity %s without persisting it',
    async (pointsExpirationMonths) => {
      await request(app.getHttpServer())
        .put(POINTS_VALIDITY_URL)
        .set('x-test-auth-role', 'ADMIN')
        .send({ pointsExpirationMonths })
        .expect(400);

      await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(1);
    },
  );

  it('requires an authenticated administrator to read or change first purchase bonus', async () => {
    await request(app.getHttpServer())
      .get(FIRST_PURCHASE_BONUS_URL)
      .expect(401);
    await request(app.getHttpServer())
      .put(FIRST_PURCHASE_BONUS_URL)
      .send({ bonusType: 'FIXED_AMOUNT', bonusValue: 30 })
      .expect(401);

    await request(app.getHttpServer())
      .put(FIRST_PURCHASE_BONUS_URL)
      .set('x-test-auth-role', 'CASHIER')
      .send({ bonusType: 'FIXED_AMOUNT', bonusValue: 30 })
      .expect(403);

    await expect(prisma.firstPurchaseBonusConfiguration.count()).resolves.toBe(
      0,
    );
  });

  it('returns not found when the first purchase bonus is not configured', async () => {
    await request(app.getHttpServer())
      .get(FIRST_PURCHASE_BONUS_URL)
      .set('x-test-auth-role', 'ADMIN')
      .expect(404);
  });

  it.each([
    [{ bonusType: 'PERCENTAGE', bonusValue: 15 }, 'PERCENTAGE', 15],
    [{ bonusType: 'PERCENTAGE', bonusValue: 1 }, 'PERCENTAGE', 1],
    [{ bonusType: 'FIXED_AMOUNT', bonusValue: 30 }, 'FIXED_AMOUNT', 30],
    [{ bonusType: 'FIXED_AMOUNT', bonusValue: 10_000 }, 'FIXED_AMOUNT', 10_000],
  ])(
    'persists and returns valid first purchase bonus %j',
    async (payload, bonusType, bonusValue) => {
      const saved = await request(app.getHttpServer())
        .put(FIRST_PURCHASE_BONUS_URL)
        .set('x-test-auth-role', 'ADMIN')
        .send(payload)
        .expect(200);

      expect(saved.body).toMatchObject({ bonusType, bonusValue });
      expect(saved.body.updatedAt).toEqual(expect.any(String));

      const current = await request(app.getHttpServer())
        .get(FIRST_PURCHASE_BONUS_URL)
        .set('x-test-auth-role', 'ADMIN')
        .expect(200);

      expect(current.body).toEqual(saved.body);
      await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(2);
    },
  );

  it('replaces first purchase bonus settings without creating duplicate rows', async () => {
    await request(app.getHttpServer())
      .put(FIRST_PURCHASE_BONUS_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({ bonusType: 'FIXED_AMOUNT', bonusValue: 30 })
      .expect(200);

    const updated = await request(app.getHttpServer())
      .put(FIRST_PURCHASE_BONUS_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({ bonusType: 'PERCENTAGE', bonusValue: 15.5 })
      .expect(200);

    expect(updated.body).toMatchObject({
      bonusType: 'PERCENTAGE',
      bonusValue: 15.5,
    });
    await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(3);
  });

  it.each([
    { bonusType: 'UNKNOWN', bonusValue: 10 },
    { bonusType: 'PERCENTAGE', bonusValue: 0.1 },
    { bonusType: 'PERCENTAGE', bonusValue: 0.99 },
    { bonusType: 'PERCENTAGE', bonusValue: 0.09 },
    { bonusType: 'PERCENTAGE', bonusValue: 100.01 },
    { bonusType: 'PERCENTAGE', bonusValue: 15.123 },
    { bonusType: 'FIXED_AMOUNT', bonusValue: 0 },
    { bonusType: 'FIXED_AMOUNT', bonusValue: -1 },
    { bonusType: 'FIXED_AMOUNT', bonusValue: 1.5 },
    { bonusType: 'FIXED_AMOUNT', bonusValue: 10_001 },
    { bonusType: 'FIXED_AMOUNT', bonusValue: 'abc' },
    { bonusType: 'PERCENTAGE', bonusValue: 15, extra: true },
  ])('rejects invalid first purchase bonus %j', async (payload) => {
    await request(app.getHttpServer())
      .put(FIRST_PURCHASE_BONUS_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send(payload)
      .expect(400);

    await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(1);
  });

  it('enforces bonus value rules in PostgreSQL as well as at the API boundary', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "first_purchase_bonus_configuration"
          ("id", "bonus_type", "bonus_value", "updated_at")
        VALUES (1, 'PERCENTAGE'::"FirstPurchaseBonusType", 0.5, CURRENT_TIMESTAMP)
      `,
    ).rejects.toThrow();

    await expect(
      prisma.$executeRaw`
        INSERT INTO "first_purchase_bonus_configuration"
          ("id", "bonus_type", "bonus_value", "updated_at")
        VALUES (1, 'PERCENTAGE'::"FirstPurchaseBonusType", 101, CURRENT_TIMESTAMP)
      `,
    ).rejects.toThrow();

    await expect(
      prisma.$executeRaw`
        INSERT INTO "loyalty_program_configurations"
          ("version", "bonus_type", "bonus_value", "is_active", "valid_from")
        VALUES (2, 'PERCENTAGE'::"FirstPurchaseBonusType", 0.5, false, CURRENT_TIMESTAMP)
      `,
    ).rejects.toThrow();

    await expect(
      prisma.$executeRaw`
        INSERT INTO "first_purchase_bonus_configuration"
          ("id", "bonus_type", "bonus_value", "updated_at")
        VALUES (1, 'FIXED_AMOUNT'::"FirstPurchaseBonusType", 30, CURRENT_TIMESTAMP)
      `,
    ).resolves.toBe(1);

    await expect(
      prisma.$executeRaw`
        INSERT INTO "first_purchase_bonus_configuration"
          ("id", "bonus_type", "bonus_value", "updated_at")
        VALUES (2, 'FIXED_AMOUNT'::"FirstPurchaseBonusType", 30, CURRENT_TIMESTAMP)
      `,
    ).rejects.toThrow();
  });

  it('restricts the full configuration endpoints to administrators', async () => {
    await request(app.getHttpServer())
      .get(CURRENT_LOYALTY_CONFIG_URL)
      .expect(401);
    await request(app.getHttpServer())
      .put(LOYALTY_CONFIG_URL)
      .send({
        baseAmount: 100,
        pointsAwarded: 1,
        bonusType: 'FIXED_AMOUNT',
        bonusValue: 5,
      })
      .expect(401);
    await request(app.getHttpServer())
      .put(LOYALTY_CONFIG_URL)
      .set('x-test-auth-role', 'CASHIER')
      .send({
        baseAmount: 100,
        pointsAwarded: 1,
        bonusType: 'FIXED_AMOUNT',
        bonusValue: 5,
      })
      .expect(403);
    await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(1);
  });

  it('returns the active full snapshot and defaults validity to 12 months', async () => {
    const response = await request(app.getHttpServer())
      .get(CURRENT_LOYALTY_CONFIG_URL)
      .set('x-test-auth-role', 'ADMIN')
      .expect(200);

    expect(response.body).toMatchObject({
      version: 1,
      baseAmount: null,
      pointsAwarded: null,
      pointsExpirationMonths: 12,
      bonusType: null,
      bonusValue: null,
      isActive: true,
      validTo: null,
    });
    expect(response.body.validFrom).toEqual(expect.any(String));
    expect(response.body.createdAt).toEqual(expect.any(String));
  });

  it('writes a complete configuration as a new version and keeps the previous snapshot unchanged', async () => {
    const first = await request(app.getHttpServer())
      .put(LOYALTY_CONFIG_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({
        baseAmount: 500,
        pointsAwarded: 5,
        pointsExpirationMonths: 18,
        bonusType: 'PERCENTAGE',
        bonusValue: 15,
      })
      .expect(200);

    expect(first.body).toMatchObject({
      version: 2,
      baseAmount: 500,
      pointsAwarded: 5,
      pointsExpirationMonths: 18,
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
      isActive: true,
      validTo: null,
    });

    const updated = await request(app.getHttpServer())
      .put(LOYALTY_CONFIG_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({
        baseAmount: 1000,
        pointsAwarded: 10,
        pointsExpirationMonths: 12,
        bonusType: 'FIXED_AMOUNT',
        bonusValue: 30,
      })
      .expect(200);

    expect(updated.body.version).toBe(3);
    const versions = await prisma.loyaltyProgramConfiguration.findMany({
      orderBy: { version: 'asc' },
    });
    expect(versions).toHaveLength(3);
    expect(versions[1]).toMatchObject({
      version: 2,
      pointsAwarded: 5,
      pointsExpirationMonths: 18,
      bonusType: 'PERCENTAGE',
      isActive: false,
    });
    expect(Number(versions[1]?.baseAmount)).toBe(500);
    expect(Number(versions[1]?.bonusValue)).toBe(15);
    expect(versions[1]?.validTo).toEqual(expect.any(Date));
    expect(versions[2]).toMatchObject({ version: 3, isActive: true });
    await expect(
      prisma.loyaltyProgramConfiguration.count({ where: { isActive: true } }),
    ).resolves.toBe(1);
  });

  it('creates a version for updates through the existing section endpoints without discarding other settings', async () => {
    await request(app.getHttpServer())
      .put(LOYALTY_CONFIG_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({
        baseAmount: 500,
        pointsAwarded: 5,
        pointsExpirationMonths: 18,
        bonusType: 'FIXED_AMOUNT',
        bonusValue: 30,
      })
      .expect(200);

    const update = await request(app.getHttpServer())
      .put(POINTS_VALIDITY_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({ pointsExpirationMonths: 24 })
      .expect(200);

    expect(update.body.pointsExpirationMonths).toBe(24);
    const active = await prisma.loyaltyProgramConfiguration.findFirst({
      where: { isActive: true },
    });
    expect(active).toMatchObject({
      version: 3,
      pointsAwarded: 5,
      pointsExpirationMonths: 24,
      bonusType: 'FIXED_AMOUNT',
    });
    expect(Number(active?.baseAmount)).toBe(500);
    expect(Number(active?.bonusValue)).toBe(30);
  });

  it('rejects incomplete or invalid complete payloads without creating a version', async () => {
    await request(app.getHttpServer())
      .put(LOYALTY_CONFIG_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({
        baseAmount: 100,
        pointsAwarded: 1,
        bonusType: 'PERCENTAGE',
        bonusValue: 100.01,
      })
      .expect(400);

    await request(app.getHttpServer())
      .put(LOYALTY_CONFIG_URL)
      .set('x-test-auth-role', 'ADMIN')
      .send({ baseAmount: 100 })
      .expect(400);

    await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(1);
  });

  it('rolls back the deactivation if creation of a new version fails', async () => {
    const repository = app.get(LoyaltyConfigurationRepository);

    await expect(
      repository.updateFullConfig({
        baseAmount: 500,
        pointsAwarded: 5,
        pointsExpirationMonths: 12,
        bonusType: 'PERCENTAGE',
        bonusValue: 101,
      }),
    ).rejects.toThrow();

    const configurations = await prisma.loyaltyProgramConfiguration.findMany({
      orderBy: { version: 'asc' },
    });
    expect(configurations).toHaveLength(1);
    expect(configurations[0]).toMatchObject({
      version: 1,
      isActive: true,
      validTo: null,
    });
  });
});
