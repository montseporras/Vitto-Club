import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import { AuditService } from '../src/audit/application/audit.service.js';

const LEVELS_URL = '/api/loyalty/configuration/levels';
const CURRENT_URL = '/api/loyalty/configuration/current';
const FULL_URL = '/api/loyalty/configuration';
const EQUIVALENCE_URL = '/api/loyalty/configuration/points-equivalence';

// Cubre US-27 (§3.7) contra Postgres real. audit_logs es solo inserción: se miran las filas
// nuevas a partir del último id antes de cada test.
describe('Niveles de fidelización (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let actorAccountId = 0;
  let actorEmployeeId = 0;
  let lastAuditId = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    // Mismo mecanismo que loyalty.e2e-spec.ts: un empleado real como actor de la auditoría
    const issuer = moduleFixture.get(AccessTokenIssuer, { strict: false });
    app.use(async (req: Request, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-auth-role');
      if (role === 'ADMIN' || role === 'CASHIER') {
        const token = await issuer.issue({ accountId: actorAccountId, role, employeeId: actorEmployeeId });
        req.headers.authorization = `Bearer ${token}`;
      }
      next();
    });

    await app.init();
    prisma = app.get(PrismaService);
  });

  // Los saldos referencian clientes (onDelete Restrict): se limpian antes y al terminar
  async function cleanDatabase() {
    await prisma.pointsMovement.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customerStatusChange.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.loyaltyProgramConfiguration.deleteMany();
  }

  beforeEach(async () => {
    jest.restoreAllMocks();
    await cleanDatabase();
    const actor = await prisma.employee.create({
      data: { firstName: 'Ana', lastName: 'Gómez', phone: '3510000000', email: 'admin.niveles@vitto.club', role: 'ADMIN', isActive: true },
    });
    const account = await prisma.account.create({
      data: { email: actor.email, passwordHash: 'hashed:secreta123', role: 'ADMIN', isActive: true, employeeId: actor.id },
    });
    actorEmployeeId = actor.id;
    actorAccountId = account.id;

    // Versión inicial: la migración usa 300 y 800 (§3.7.2)
    await prisma.loyaltyProgramConfiguration.create({
      data: { version: 1, baseAmount: 1000, pointsAwarded: 10, pointsExpirationMonths: 12, isActive: true },
    });
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await cleanDatabase();
    await app.close();
  });

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  const asAdmin = { 'x-test-auth-role': 'ADMIN' };
  const asCashier = { 'x-test-auth-role': 'CASHIER' };

  describe('GET /api/loyalty/configuration/levels', () => {
    it('versión inicial: Bronce 0, Plata 300 y Oro 800 (CA-27.1)', async () => {
      const response = await request(app.getHttpServer()).get(LEVELS_URL).set(asAdmin);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        levels: [
          { level: 'BRONZE', minPoints: 0, editable: false },
          { level: 'SILVER', minPoints: 300, editable: true },
          { level: 'GOLD', minPoints: 800, editable: true },
        ],
        configurationVersion: 1,
        updatedAt: expect.stringMatching(/Z$/),
      });
    });

    it('Cajero → 403; sin token → 401 (CA-27.7)', async () => {
      const asCashierResponse = await request(app.getHttpServer()).get(LEVELS_URL).set(asCashier);
      const anonymous = await request(app.getHttpServer()).get(LEVELS_URL);

      expect(asCashierResponse.status).toBe(403);
      expect(anonymous.status).toBe(401);
    });
  });

  describe('PUT /api/loyalty/configuration/levels', () => {
    it('crea una versión nueva copiando el resto, responde como el GET y audita (CA-27.2)', async () => {
      const response = await request(app.getHttpServer())
        .put(LEVELS_URL)
        .set(asAdmin)
        .send({ silverMinPoints: 400, goldMinPoints: 1500 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        levels: [
          { level: 'BRONZE', minPoints: 0, editable: false },
          { level: 'SILVER', minPoints: 400, editable: true },
          { level: 'GOLD', minPoints: 1500, editable: true },
        ],
        configurationVersion: 2,
        updatedAt: expect.stringMatching(/Z$/),
      });

      const versions = await prisma.loyaltyProgramConfiguration.findMany({ orderBy: { version: 'asc' } });
      expect(versions.map((v) => [v.version, v.isActive])).toEqual([[1, false], [2, true]]);
      expect(versions[1]).toMatchObject({ pointsAwarded: 10, pointsExpirationMonths: 12, silverMinPoints: 400, goldMinPoints: 1500 });
      expect(versions[1].baseAmount?.toNumber()).toBe(1000);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        module: 'CONFIGURATION',
        actionCode: 'LEVELS_UPDATED',
        description: 'Modificó niveles',
        actorType: 'EMPLOYEE',
        actorAccountId,
        performedBy: 'Ana Gómez',
      });
      expect(rows[0].details).toEqual([
        { label: 'Plata', value: '300 → 400 pts' },
        { label: 'Oro', value: '800 → 1.500 pts' },
      ]);
    });

    it.each([
      [{ goldMinPoints: 800 }, 'Completá este campo.'],
      [{ silverMinPoints: 300.5, goldMinPoints: 800 }, 'Ingresá un número entero, sin decimales.'],
      [{ silverMinPoints: 0, goldMinPoints: 800 }, 'El umbral de Plata debe ser mayor que 0'],
      [{ silverMinPoints: 500, goldMinPoints: 500 }, 'El umbral de Oro debe ser mayor que el de Plata'],
      [{ silverMinPoints: 300, goldMinPoints: 2_147_483_648 }, 'Ingresá un número menor o igual a 2.147.483.647.'],
    ])('%j → 400 "%s", sin versión nueva ni auditoría (CA-27.3)', async (body, message) => {
      const response = await request(app.getHttpServer()).put(LEVELS_URL).set(asAdmin).send(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual([message]);
      await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(1);
      await expect(newAuditRows()).resolves.toHaveLength(0);
    });

    it('un cliente cambia de nivel sin ningún proceso aparte (CA-27.4)', async () => {
      const customer = await prisma.customer.create({
        data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
      });
      await prisma.customerPoints.create({ data: { customerId: customer.id, balance: 350, lifetimePoints: 350 } });
      const levelOf = async () =>
        (await request(app.getHttpServer()).get('/api/customers?active=true').set(asAdmin)).body.items[0].level;

      expect(await levelOf()).toBe('SILVER');

      await request(app.getHttpServer()).put(LEVELS_URL).set(asAdmin).send({ silverMinPoints: 400, goldMinPoints: 900 }).expect(200);

      expect(await levelOf()).toBe('BRONZE');
    });

    it('si la auditoría falla, no queda la versión nueva (misma transacción)', async () => {
      jest.spyOn(app.get(AuditService), 'record').mockRejectedValueOnce(new Error('falla la auditoría'));

      const response = await request(app.getHttpServer())
        .put(LEVELS_URL)
        .set(asAdmin)
        .send({ silverMinPoints: 400, goldMinPoints: 900 });

      expect(response.status).toBe(500);
      const versions = await prisma.loyaltyProgramConfiguration.findMany();
      expect(versions).toHaveLength(1);
      expect(versions[0]).toMatchObject({ version: 1, isActive: true, silverMinPoints: 300 });
    });

    it('Cajero → 403 sin guardar (CA-27.7)', async () => {
      const response = await request(app.getHttpServer())
        .put(LEVELS_URL)
        .set(asCashier)
        .send({ silverMinPoints: 400, goldMinPoints: 900 });

      expect(response.status).toBe(403);
      await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(1);
    });
  });

  describe('Los otros guardados copian los umbrales (CA-27.5)', () => {
    it('GET /current trae silverMinPoints y goldMinPoints', async () => {
      const response = await request(app.getHttpServer()).get(CURRENT_URL).set(asAdmin);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ silverMinPoints: 300, goldMinPoints: 800 });
    });

    it('un PUT seccional (equivalencia) no pisa los umbrales', async () => {
      await request(app.getHttpServer()).put(LEVELS_URL).set(asAdmin).send({ silverMinPoints: 400, goldMinPoints: 900 }).expect(200);
      await request(app.getHttpServer()).put(EQUIVALENCE_URL).set(asAdmin).send({ baseAmount: 500, pointsAwarded: 5 }).expect(200);

      const levels = await request(app.getHttpServer()).get(LEVELS_URL).set(asAdmin);
      expect(levels.body.configurationVersion).toBe(3);
      expect(levels.body.levels.map((level: { minPoints: number }) => level.minPoints)).toEqual([0, 400, 900]);
    });

    const full = { baseAmount: 1000, pointsAwarded: 10, pointsExpirationMonths: 12, bonusType: 'PERCENTAGE', bonusValue: 15 };

    it('PUT completo sin umbrales: los copia de la versión vigente', async () => {
      await request(app.getHttpServer()).put(LEVELS_URL).set(asAdmin).send({ silverMinPoints: 400, goldMinPoints: 900 }).expect(200);

      const response = await request(app.getHttpServer()).put(FULL_URL).set(asAdmin).send(full);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ silverMinPoints: 400, goldMinPoints: 900 });
    });

    it('PUT completo con umbrales: los guarda y audita LEVELS_UPDATED', async () => {
      const response = await request(app.getHttpServer())
        .put(FULL_URL)
        .set(asAdmin)
        .send({ ...full, silverMinPoints: 350, goldMinPoints: 1000 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ silverMinPoints: 350, goldMinPoints: 1000 });
      const actions = (await newAuditRows()).map((row) => row.actionCode);
      expect(actions).toContain('LEVELS_UPDATED');
    });

    it('PUT completo con solo Oro ≤ Plata vigente → 400', async () => {
      const response = await request(app.getHttpServer())
        .put(FULL_URL)
        .set(asAdmin)
        .send({ ...full, goldMinPoints: 300 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('El umbral de Oro debe ser mayor que el de Plata');
      await expect(prisma.loyaltyProgramConfiguration.count()).resolves.toBe(1);
    });
  });
});
