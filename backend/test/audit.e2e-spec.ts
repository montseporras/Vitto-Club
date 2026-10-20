import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AccessTokenIssuer } from '../src/auth/domain/port/access-token-issuer.js';
import type { AuthRole } from '../src/auth/domain/auth-role.js';
import { AuditRepository } from '../src/audit/domain/port/audit.repository.js';

// US-57: la auditoría se escribe en la misma transacción que la operación, es inalterable y
// registra la forma nueva del contrato (§3.9). Contra Postgres real, con los módulos reales.
// audit_logs rechaza UPDATE, DELETE y TRUNCATE, así que estos tests NO pueden vaciarla entre
// escenarios: cada uno lee solo las filas posteriores a `lastAuditId` (ver `newAuditRows`).

async function createApp(override?: (builder: ReturnType<typeof Test.createTestingModule>) => void) {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  override?.(builder);
  const moduleFixture: TestingModule = await builder.compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // Headers de prueba -> token real (mismo mecanismo que consumptions.e2e-spec.ts)
  const issuer = moduleFixture.get(AccessTokenIssuer, { strict: false });
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    const role = req.header('x-test-auth-role') as AuthRole | undefined;
    if (role) {
      const accountId = Number(req.header('x-test-account-id') ?? 1);
      const employeeIdHeader = req.header('x-test-employee-id');
      const token = await issuer.issue({
        accountId,
        role,
        ...(employeeIdHeader ? { employeeId: Number(employeeIdHeader) } : {}),
      });
      req.headers.authorization = `Bearer ${token}`;
    }
    next();
  });

  await app.init();
  return app;
}

async function cleanDatabase(prisma: PrismaService) {
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

async function seedEmployeeWithAccount(
  prisma: PrismaService,
  params: { email: string; role: 'ADMIN' | 'CASHIER'; firstName?: string; lastName?: string; withAccount?: boolean },
) {
  const employee = await prisma.employee.create({
    data: {
      firstName: params.firstName ?? 'Valeria',
      lastName: params.lastName ?? 'Vitto',
      phone: '3510000000',
      email: params.email,
      role: params.role,
      isActive: true,
    },
  });
  const account =
    params.withAccount === false
      ? null
      : await prisma.account.create({
          data: {
            email: params.email,
            passwordHash: 'hashed:secreta123',
            role: params.role,
            isActive: true,
            employeeId: employee.id,
          },
        });
  return { employee, account };
}

function authHeaders(role: AuthRole, accountId: number, employeeId?: number) {
  const headers: Record<string, string> = {
    'x-test-auth-role': role,
    'x-test-account-id': String(accountId),
  };
  if (employeeId !== undefined) headers['x-test-employee-id'] = String(employeeId);
  return headers;
}

async function setConfig(prisma: PrismaService) {
  await prisma.loyaltyProgramConfiguration.create({
    data: {
      version: 1,
      baseAmount: 1000,
      pointsAwarded: 10,
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
      silverMinPoints: 300,
      goldMinPoints: 800,
      pointsExpirationMonths: 12,
      isActive: true,
    },
  });
}

describe('Auditoría — registro (US-57, e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lastAuditId = 0;
  let admin: Record<string, string>;
  let cashier: Record<string, string>;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await setConfig(prisma);
    const adminSeed = await seedEmployeeWithAccount(prisma, {
      email: 'admin@vitto.club',
      role: 'ADMIN',
      firstName: 'Denise',
      lastName: 'Nagel',
    });
    const cashierSeed = await seedEmployeeWithAccount(prisma, {
      email: 'cajero@vitto.club',
      role: 'CASHIER',
      firstName: 'Diego',
      lastName: 'Sosa',
    });
    admin = authHeaders('ADMIN', adminSeed.account!.id, adminSeed.employee.id);
    cashier = authHeaders('CASHIER', cashierSeed.account!.id, cashierSeed.employee.id);

    const last = await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } });
    lastAuditId = last?.id ?? 0;
  });

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  describe('acciones que ya se auditaban, con la forma nueva (CA-57.6)', () => {
    it('EMPLOYEE_CREATED: una entrada con módulo, código, descripción y detalle', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/empleados')
        .set(admin)
        .send({
          firstName: 'Jorge',
          lastName: 'Molina',
          email: 'jorge@vitto.club',
          role: 'CASHIER',
          phone: '3510000001',
        })
        .expect(201);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        performedBy: 'Denise Nagel',
        module: 'EMPLOYEES',
        actionCode: 'EMPLOYEE_CREATED',
        description: 'Registró al empleado Jorge Molina',
        affectedCustomerId: null,
        operationCode: null,
        details: [
          { label: 'Mail', value: 'jorge@vitto.club' },
          { label: 'Rol', value: 'Cajero' },
        ],
      });
      expect(rows[0].actorAccountId).toBe(Number(admin['x-test-account-id']));
      expect(response.body.id).toBeDefined();
    });

    it('EMPLOYEE_UPDATED y EMPLOYEE_DEACTIVATED', async () => {
      const { employee } = await seedEmployeeWithAccount(prisma, {
        email: 'jorge@vitto.club',
        role: 'CASHIER',
        firstName: 'Jorge',
        lastName: 'Molina',
        withAccount: false,
      });

      await request(app.getHttpServer())
        .patch(`/api/empleados/${employee.id}`)
        .set(admin)
        .send({ firstName: 'Jorge', lastName: 'Molinas', role: 'ADMIN', phone: '3510000000' })
        .expect(200);
      await request(app.getHttpServer()).delete(`/api/empleados/${employee.id}`).set(admin).expect(200);

      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual(['EMPLOYEE_UPDATED', 'EMPLOYEE_DEACTIVATED']);
      expect(rows[0].description).toBe('Editó al empleado Jorge Molinas');
      expect(rows[0].details).toEqual([
        { label: 'Apellido', value: 'Molina → Molinas' },
        { label: 'Rol', value: 'Cajero → Administrador' },
      ]);
      expect(rows[1].details).toEqual([{ label: 'Estado', value: 'Activo → Inactivo' }]);
    });

    it('USER_ACCOUNT_CREATED / UPDATED / DEACTIVATED / REACTIVATED, sin contraseñas ni hashes', async () => {
      const { employee } = await seedEmployeeWithAccount(prisma, {
        email: 'jorge@vitto.club',
        role: 'CASHIER',
        firstName: 'Jorge',
        lastName: 'Molina',
        withAccount: false,
      });

      const created = await request(app.getHttpServer())
        .post('/api/usuarios')
        .set(admin)
        .send({ employeeId: employee.id, email: 'jorge@vitto.club', password: 'ClaveSecreta123' })
        .expect(201);
      const accountId = created.body.accountId as number;
      await request(app.getHttpServer())
        .patch(`/api/usuarios/${accountId}`)
        .set(admin)
        .send({ password: 'OtraClave456' })
        .expect(200);
      await request(app.getHttpServer()).patch(`/api/usuarios/${accountId}/deactivate`).set(admin).expect(204);
      await request(app.getHttpServer()).patch(`/api/usuarios/${accountId}/reactivate`).set(admin).expect(204);

      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual([
        'USER_ACCOUNT_CREATED',
        'USER_ACCOUNT_UPDATED',
        'USER_ACCOUNT_DEACTIVATED',
        'USER_ACCOUNT_REACTIVATED',
      ]);
      expect(rows.every((row) => row.module === 'EMPLOYEES')).toBe(true);
      expect(rows[0].details).toEqual([{ label: 'Usuario', value: 'jorge@vitto.club' }]);
      expect(rows[1].description).toBe('Cambió la contraseña de Jorge Molina');
      expect(rows[1].details).toEqual([{ label: 'Contraseña', value: 'Modificada' }]);
      expect(rows[2].details).toEqual([{ label: 'Estado del usuario', value: 'Activo → Inactivo' }]);
      expect(rows[3].details).toEqual([{ label: 'Estado del usuario', value: 'Inactivo → Activo' }]);

      const serialized = JSON.stringify(rows);
      expect(serialized).not.toContain('ClaveSecreta123');
      expect(serialized).not.toContain('OtraClave456');
      expect(serialized).not.toContain('hashed:');
      expect(serialized).not.toMatch(/\$2[aby]\$/);
    });

    it('CUSTOMER_CREATED / UPDATED / DEACTIVATED con el cliente afectado', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/customers')
        .set(cashier)
        .send({
          firstName: 'Sofía',
          lastName: 'Ríos',
          documentType: 'DNI',
          documentNumber: '30111222',
          email: 'sofia@mail.com',
        })
        .expect(201);
      const customerId = created.body.id as number;
      await request(app.getHttpServer())
        .patch(`/api/customers/${customerId}`)
        .set(cashier)
        .send({ phone: '3510000009' })
        .expect(200);
      await request(app.getHttpServer()).patch(`/api/customers/${customerId}/deactivate`).set(cashier).expect(204);

      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual([
        'CUSTOMER_CREATED',
        'CUSTOMER_UPDATED',
        'CUSTOMER_DEACTIVATED',
      ]);
      for (const row of rows) {
        expect(row).toMatchObject({
          actorType: 'EMPLOYEE',
          performedBy: 'Diego Sosa',
          module: 'CUSTOMERS',
          affectedCustomerId: customerId,
          affectedCustomerName: 'Sofía Ríos',
          documentType: 'DNI',
          documentNumber: '30111222',
        });
      }
      expect(rows[0].description).toBe('Registró al cliente Sofía Ríos');
      expect(rows[0].details).toEqual([
        { label: 'Mail', value: 'sofia@mail.com' },
        { label: 'Teléfono', value: '—' },
        { label: 'Origen', value: 'Caja' },
        { label: 'Cuenta de acceso', value: 'Creada, contraseña inicial = número de documento' },
      ]);
      expect(rows[1].details).toEqual([{ label: 'Teléfono', value: '— → 3510000009' }]);
      expect(rows[2].details).toEqual([{ label: 'Estado', value: 'Activo → Inactivo' }]);
    });

    it('configuración: el PUT completo registra una entrada por sección que cambió', async () => {
      await request(app.getHttpServer())
        .put('/api/loyalty/configuration')
        .set(admin)
        .send({
          baseAmount: 2000,
          pointsAwarded: 10,
          pointsExpirationMonths: 6,
          bonusType: 'PERCENTAGE',
          bonusValue: 15,
        })
        .expect(200);

      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual([
        'POINTS_EQUIVALENCE_UPDATED',
        'POINTS_VALIDITY_UPDATED',
      ]);
      expect(rows.every((row) => row.module === 'CONFIGURATION')).toBe(true);
      expect(rows[0].details).toEqual([
        { label: 'Monto base ($)', value: '1.000 → 2.000' },
        { label: 'Puntos por monto', value: '10 → 10' },
      ]);
      expect(rows[1].details).toEqual([{ label: 'Vigencia (meses)', value: '12 → 6' }]);
    });

    it('configuración: un guardado sin cambios igual se registra (CA-57.7)', async () => {
      await request(app.getHttpServer())
        .put('/api/loyalty/configuration')
        .set(admin)
        .send({
          baseAmount: 1000,
          pointsAwarded: 10,
          pointsExpirationMonths: 12,
          bonusType: 'PERCENTAGE',
          bonusValue: 15,
        })
        .expect(200);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].details).toEqual([{ label: 'Cambios', value: 'Se guardó sin modificar valores' }]);
    });

    it('configuración: cada PUT por sección registra su código', async () => {
      await request(app.getHttpServer())
        .put('/api/loyalty/configuration/points-equivalence')
        .set(admin)
        .send({ baseAmount: 1500, pointsAwarded: 10 })
        .expect(200);
      await request(app.getHttpServer())
        .put('/api/loyalty/configuration/points-validity')
        .set(admin)
        .send({ pointsExpirationMonths: 18 })
        .expect(200);
      await request(app.getHttpServer())
        .put('/api/loyalty/configuration/first-purchase-bonus')
        .set(admin)
        .send({ bonusType: 'FIXED_AMOUNT', bonusValue: 30 })
        .expect(200);

      const rows = await newAuditRows();
      expect(rows.map((row) => row.actionCode)).toEqual([
        'POINTS_EQUIVALENCE_UPDATED',
        'POINTS_VALIDITY_UPDATED',
        'FIRST_PURCHASE_BONUS_UPDATED',
      ]);
      expect(rows[2].details).toEqual([
        { label: 'Tipo de bonificación', value: 'Porcentaje → Puntos fijos' },
        { label: 'Valor de bonificación', value: '15 → 30' },
      ]);
    });
  });

  describe('lo que deja de registrarse (CA-57.5) y lo que no se audita', () => {
    it('el autorregistro de un cliente no escribe nada', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          firstName: 'Lucía',
          lastName: 'Paz',
          documentType: 'DNI',
          documentNumber: '28999888',
          email: 'lucia@mail.com',
          password: 'ClaveSegura123',
        })
        .expect(201);

      expect(await newAuditRows()).toEqual([]);
    });

    it('el inicio de sesión no escribe nada, ni acertado ni fallido', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@vitto.club', password: 'incorrecta' });

      expect(await newAuditRows()).toEqual([]);
    });

    it('una operación que falla (403 por rol) no escribe nada', async () => {
      await request(app.getHttpServer()).post('/api/empleados').set(cashier).send({}).expect(403);

      expect(await newAuditRows()).toEqual([]);
    });
  });

  describe('inalterable (CA-57.3)', () => {
    it('la base rechaza UPDATE, DELETE y TRUNCATE sobre audit_logs', async () => {
      await request(app.getHttpServer())
        .put('/api/loyalty/configuration/points-validity')
        .set(admin)
        .send({ pointsExpirationMonths: 18 })
        .expect(200);
      const [row] = await newAuditRows();

      await expect(
        prisma.$executeRaw`UPDATE audit_logs SET description = 'otra cosa' WHERE id = ${row.id}`,
      ).rejects.toThrow(/append-only/);
      await expect(prisma.$executeRaw`DELETE FROM audit_logs WHERE id = ${row.id}`).rejects.toThrow(
        /append-only/,
      );
      await expect(prisma.$executeRawUnsafe('TRUNCATE TABLE audit_logs')).rejects.toThrow(/append-only/);

      const intact = await prisma.auditLog.findUnique({ where: { id: row.id } });
      expect(intact?.description).toBe(row.description);
    });
  });
});

describe('Auditoría — misma transacción (CA-57.8, e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    // La escritura de la auditoría falla siempre
    app = await createApp((builder) => {
      builder.overrideProvider(AuditRepository).useValue({
        record: () => Promise.reject(new Error('la auditoría no se pudo escribir')),
      });
    });
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await setConfig(prisma);
  });

  it('si falla la auditoría, el alta de un cliente se deshace entera (cliente y cuenta)', async () => {
    const { employee, account } = await seedEmployeeWithAccount(prisma, {
      email: 'cajero@vitto.club',
      role: 'CASHIER',
    });
    const customersBefore = await prisma.customer.count();
    const accountsBefore = await prisma.account.count();

    const response = await request(app.getHttpServer())
      .post('/api/customers')
      .set(authHeaders('CASHIER', account!.id, employee.id))
      .send({
        firstName: 'Sofía',
        lastName: 'Ríos',
        documentType: 'DNI',
        documentNumber: '30111222',
        email: 'sofia@mail.com',
      });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(await prisma.customer.count()).toBe(customersBefore);
    expect(await prisma.account.count()).toBe(accountsBefore);
  });

  it('si falla la auditoría, la baja de un empleado se deshace', async () => {
    const admin = await seedEmployeeWithAccount(prisma, { email: 'admin@vitto.club', role: 'ADMIN' });
    const target = await seedEmployeeWithAccount(prisma, {
      email: 'jorge@vitto.club',
      role: 'CASHIER',
      withAccount: false,
    });

    const response = await request(app.getHttpServer())
      .delete(`/api/empleados/${target.employee.id}`)
      .set(authHeaders('ADMIN', admin.account!.id, admin.employee.id));

    expect(response.status).toBeGreaterThanOrEqual(500);
    const stored = await prisma.employee.findUnique({ where: { id: target.employee.id } });
    expect(stored?.isActive).toBe(true);
  });
});
