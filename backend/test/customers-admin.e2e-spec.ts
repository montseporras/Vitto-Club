import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { deletePointsMovements } from './delete-points-movements.js';

const ADMIN = { email: 'admin@test.com', password: 'clave-del-admin' };
const CASHIER = { email: 'cajero@test.com', password: 'clave-del-cajero' };

const SOFIA = {
  firstName: 'Sofía',
  lastName: 'Ríos',
  documentType: 'DNI',
  documentNumber: '38456123',
  email: 'sofia.rios@test.com',
};

// CLI-ADM: pantalla "Clientes" del Administrador (contrato §3.8). De punta a punta, con base real,
// login real y la auditoría escrita en la misma transacción.
describe('Clientes del Administrador (CLI-ADM, e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lastAuditId = 0;
  let adminToken: string;

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
  const tokenOf = async (credentials: { email: string; password: string }) =>
    (await login(credentials.email, credentials.password).expect(200)).body.accessToken as string;
  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  const createEmployeeWithAccount = async (email: string, role: 'ADMIN' | 'CASHIER', password: string) => {
    const employee = await prisma.employee.create({
      data: { firstName: 'Test', lastName: role, phone: '3510000000', email, role },
    });
    await prisma.account.create({
      data: { email, passwordHash: await bcrypt.hash(password, 4), role, employeeId: employee.id },
    });
  };

  // Cliente cargado directo en la base (sin cuenta), con puntos si se indican
  const seedCustomer = async (data: {
    firstName: string;
    lastName: string;
    documentNumber: string;
    email: string;
    isActive?: boolean;
    documentType?: 'DNI' | 'PASSPORT';
    points?: { balance: number; lifetimePoints: number };
  }) => {
    const customer = await prisma.customer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        documentType: data.documentType ?? 'DNI',
        documentNumber: data.documentNumber,
        email: data.email,
        isActive: data.isActive ?? true,
        deactivatedAt: data.isActive === false ? new Date() : null,
      },
    });
    if (data.points) {
      await prisma.customerPoints.create({ data: { customerId: customer.id, ...data.points } });
    }
    return customer;
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

  // En orden de claves foráneas. La auditoría es solo inserción: no se borra, se mira desde lastAuditId.
  const cleanDatabase = async () => {
    await deletePointsMovements(prisma);
    // Sprint 4: los canjes apuntan a clientes, cuentas y recompensas (onDelete Restrict)
    await prisma.redemption.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.customerStatusChange.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.loyaltyProgramConfiguration.deleteMany();
  };

  beforeEach(async () => {
    await cleanDatabase();
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
    await createEmployeeWithAccount(ADMIN.email, 'ADMIN', ADMIN.password);
    await createEmployeeWithAccount(CASHIER.email, 'CASHIER', CASHIER.password);
    adminToken = await tokenOf(ADMIN);

    const last = await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } });
    lastAuditId = last?.id ?? 0;
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  describe('GET /customers (CA-CLI.1)', () => {
    beforeEach(async () => {
      await seedCustomer({
        firstName: 'Ana',
        lastName: 'Pérez',
        documentNumber: '30111222',
        email: 'ana@test.com',
        points: { balance: 50, lifetimePoints: 900 },
      });
      await seedCustomer({
        firstName: 'Beto',
        lastName: 'Gómez',
        documentNumber: '30999888',
        email: 'beto@test.com',
        points: { balance: -10, lifetimePoints: 400 },
      });
      // Sin fila en customer_points: nunca tuvo movimientos
      await seedCustomer({
        firstName: 'Carla',
        lastName: 'Alvarez',
        documentNumber: '27555444',
        email: 'carla@test.com',
      });
      await seedCustomer({
        firstName: 'Zoe',
        lastName: 'Zeta',
        documentNumber: '20111000',
        email: 'zoe@test.com',
        isActive: false,
      });
    });

    const list = (query: string, token = adminToken) =>
      request(app.getHttpServer()).get(`/api/customers?${query}`).set(as(token));

    it('cada ítem trae lo de siempre más balance, lifetimePoints y level', async () => {
      const res = await list('q=pérez').expect(200);

      expect(res.body).toEqual({
        items: [
          {
            id: expect.any(Number),
            firstName: 'Ana',
            lastName: 'Pérez',
            documentType: 'DNI',
            documentNumber: '30111222',
            email: 'ana@test.com',
            phone: null,
            dateOfBirth: null,
            active: true,
            deactivatedAt: null,
            createdAt: expect.any(String),
            balance: 50,
            lifetimePoints: 900,
            level: 'GOLD',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('q busca por documento parcial', async () => {
      const res = await list('q=3011').expect(200);

      expect(res.body.items.map((item: { lastName: string }) => item.lastName)).toEqual(['Pérez']);
    });

    it('q busca por documento con puntos (se normaliza)', async () => {
      const res = await list('q=30.999').expect(200);

      expect(res.body.items.map((item: { lastName: string }) => item.lastName)).toEqual(['Gómez']);
    });

    it('q junto con name → 400', async () => {
      const res = await list('q=perez&name=ana').expect(400);

      expect(res.body.message).toBe('No se puede buscar por q y por name a la vez.');
    });

    // Contrato S4 §3.13.4: filtro por documento
    describe('documentType y documentNumber (S4 §3.13.4)', () => {
      const lastNames = (res: { body: { items: { lastName: string }[] } }) =>
        res.body.items.map((item) => item.lastName);

      it('documentNumber busca por coincidencia parcial: 3011 encuentra 30111222', async () => {
        await seedCustomer({ firstName: 'Dora', lastName: 'Dávila', documentNumber: '30111999', email: 'dora@test.com' });

        const res = await list('documentNumber=3011').expect(200);

        expect(lastNames(res)).toEqual(['Pérez', 'Dávila']);
        expect(res.body.total).toBe(2);
      });

      it('normaliza el número: sin puntos, espacios ni guiones', async () => {
        const res = await list(`documentNumber=${encodeURIComponent('30.999 8')}`).expect(200);

        expect(lastNames(res)).toEqual(['Gómez']);
      });

      it('sin documentType se asume DNI; con PASSPORT filtra por ese tipo', async () => {
        await seedCustomer({
          firstName: 'Pablo',
          lastName: 'Pasaporte',
          documentType: 'PASSPORT',
          documentNumber: 'AAB123456',
          email: 'pablo@test.com',
        });
        await seedCustomer({
          firstName: 'Dino',
          lastName: 'Dni',
          documentNumber: '12345678',
          email: 'dino@test.com',
        });

        expect(lastNames(await list('documentNumber=123').expect(200))).toEqual(['Dni']);
        expect(lastNames(await list('documentType=DNI&documentNumber=123').expect(200))).toEqual(['Dni']);
        expect(lastNames(await list('documentType=PASSPORT&documentNumber=aab-123').expect(200))).toEqual([
          'Pasaporte',
        ]);
      });

      it('documentType solo no filtra nada', async () => {
        const res = await list('active=true&documentType=PASSPORT').expect(200);

        expect(res.body.total).toBe(3);
      });

      it('un documentType inválido → 400', async () => {
        await list('documentType=CUIT&documentNumber=123').expect(400);
      });

      it('documentNumber de más de 20 caracteres → 400', async () => {
        await list(`documentNumber=${'1'.repeat(21)}`).expect(400);
      });

      it('q junto con documentNumber → 400 con su mensaje', async () => {
        const res = await list('q=perez&documentNumber=3011').expect(400);

        expect(res.body.message).toBe('No se puede buscar por q y por documento a la vez.');
      });

      it('se combina con el filtro de nivel', async () => {
        await seedCustomer({
          firstName: 'Gina',
          lastName: 'Gold',
          documentNumber: '30111888',
          email: 'gina@test.com',
          points: { balance: 10, lifetimePoints: 1000 },
        });

        const res = await list('documentNumber=3011&level=GOLD&sort=lastName').expect(200);

        expect(lastNames(res)).toEqual(['Gold', 'Pérez']);
        expect(lastNames(await list('documentNumber=3011&level=BRONZE').expect(200))).toEqual([]);
      });

      it('el Cajero también puede filtrar', async () => {
        const cashierToken = await tokenOf(CASHIER);

        const res = await list('documentNumber=3011', cashierToken).expect(200);

        expect(lastNames(res)).toEqual(['Pérez']);
      });
    });

    it('level filtra por el nivel calculado, y sin fila de puntos es Bronce', async () => {
      const levels = async (level: string) =>
        (await list(`active=true&level=${level}`).then((res) => res.body.items)).map(
          (item: { lastName: string }) => item.lastName,
        );

      expect(await levels('GOLD')).toEqual(['Pérez']);
      expect(await levels('SILVER')).toEqual(['Gómez']);
      expect(await levels('BRONZE')).toEqual(['Alvarez']);
    });

    it('un nivel inexistente → 400', async () => {
      await list('level=PLATINUM').expect(400);
    });

    it('sort=lastName ordena por apellido; por defecto sigue siendo por id', async () => {
      const byLastName = await list('active=true&sort=lastName').expect(200);
      const byId = await list('active=true').expect(200);

      expect(byLastName.body.items.map((item: { lastName: string }) => item.lastName)).toEqual([
        'Alvarez',
        'Gómez',
        'Pérez',
      ]);
      expect(byId.body.items.map((item: { lastName: string }) => item.lastName)).toEqual([
        'Pérez',
        'Gómez',
        'Alvarez',
      ]);
    });

    it('active=true deja afuera a los clientes dados de baja', async () => {
      const res = await list('active=true&q=zeta').expect(200);

      expect(res.body.total).toBe(0);
    });

    it('un sort inválido → 400', async () => {
      await list('sort=email').expect(400);
    });

    it('el Cajero también lista (mismos endpoints desde Caja)', async () => {
      await list('active=true', await tokenOf(CASHIER)).expect(200);
    });

    it('sin token → 401', async () => {
      await request(app.getHttpServer()).get('/api/customers').expect(401);
    });
  });

  describe('PATCH /customers/:id (CA-CLI.4 a CA-CLI.8)', () => {
    let customerId: number;

    beforeEach(async () => {
      const admin = await tokenOf(ADMIN);
      const created = await request(app.getHttpServer()).post('/api/customers').set(as(admin)).send(SOFIA).expect(201);
      customerId = created.body.id;
      lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
    });

    const patch = (token: string, body: object, id = customerId) =>
      request(app.getHttpServer()).patch(`/api/customers/${id}`).set(as(token)).send(body);

    it('el Administrador sin motivo → 400 y no se guarda ni se audita nada', async () => {
      const res = await patch(await tokenOf(ADMIN), { phone: '3510000009' }).expect(400);

      expect(res.body.message).toBe('Indicá el motivo del cambio para continuar.');
      expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).phone).toBeNull();
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('el Administrador con motivo edita y la auditoría lleva una fila por campo y el motivo al final', async () => {
      const res = await patch(await tokenOf(ADMIN), {
        phone: '3510000009',
        lastName: 'Ríos Paz',
        reason: '  Pidió actualizar sus datos  ',
      }).expect(200);

      expect(res.body).toMatchObject({ phone: '3510000009', lastName: 'Ríos Paz' });
      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        module: 'CUSTOMERS',
        actionCode: 'CUSTOMER_UPDATED',
        affectedCustomerId: customerId,
        affectedCustomerName: 'Sofía Ríos Paz',
      });
      expect(rows[0].details).toEqual([
        { label: 'Apellido', value: 'Ríos → Ríos Paz' },
        { label: 'Teléfono', value: '— → 3510000009' },
        { label: 'Motivo', value: 'Pidió actualizar sus datos' },
      ]);
    });

    it('un motivo de más de 500 caracteres → 400', async () => {
      await patch(await tokenOf(ADMIN), { phone: '3510000009', reason: 'x'.repeat(501) }).expect(400);
    });

    // Contrato S4 §4 (D-02): editar un cliente es solo del Administrador
    it('el Cajero recibe 403 al editar y no se guarda ni se audita nada (D-02)', async () => {
      const cashier = await tokenOf(CASHIER);

      const res = await patch(cashier, { phone: '3510000009', reason: 'Lo pidió en caja' }).expect(403);

      expect(res.body.code).toBe('FORBIDDEN');
      expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).phone).toBeNull();
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('un cliente inactivo no se edita → 409 CUSTOMER_INACTIVE (CA-CLI.6)', async () => {
      const admin = await tokenOf(ADMIN);
      await request(app.getHttpServer()).patch(`/api/customers/${customerId}/deactivate`).set(as(admin)).expect(204);

      const res = await patch(admin, { phone: '3510000009', reason: 'x' }).expect(409);

      expect(res.body.code).toBe('CUSTOMER_INACTIVE');
    });

    it('el cliente no existe → 404', async () => {
      await patch(await tokenOf(ADMIN), { phone: '3510000009', reason: 'x' }, 999999).expect(404);
    });

    // Contrato S4 §8.1 #3 (D-03): nadie edita el documento, ni el Administrador
    it.each([
      [{ documentNumber: '38456124' }],
      [{ documentType: 'PASSPORT' }],
      [{ documentType: 'PASSPORT', documentNumber: 'AAB123456' }],
    ])('el Administrador que manda el documento (%j) recibe 400 y no se guarda ni se audita nada', async (document) => {
      const res = await patch(await tokenOf(ADMIN), { phone: '3510000009', reason: 'Error de carga', ...document }).expect(400);

      expect(JSON.stringify(res.body.message)).toContain('should not exist');
      const stored = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
      expect(stored).toMatchObject({ documentType: 'DNI', documentNumber: '38456123', phone: null });
      expect(await newAuditRows()).toHaveLength(0);
      await login(SOFIA.email, '38456123').expect(200);
    });

    it('si se corrige el email, cambia también el email de acceso (CA-CLI.8)', async () => {
      await patch(await tokenOf(ADMIN), { email: 'sofia.nueva@test.com', reason: 'Cambió de mail' }).expect(200);

      await login(SOFIA.email, '38456123').expect(401);
      await login('sofia.nueva@test.com', '38456123').expect(200);
    });

    it('sin token → 401', async () => {
      await request(app.getHttpServer()).patch(`/api/customers/${customerId}`).send({ phone: '1' }).expect(401);
    });
  });

  describe('PATCH /customers/:id/deactivate (CA-CLI.9, CA-CLI.10)', () => {
    let customerId: number;

    beforeEach(async () => {
      const admin = await tokenOf(ADMIN);
      const created = await request(app.getHttpServer()).post('/api/customers').set(as(admin)).send(SOFIA).expect(201);
      customerId = created.body.id;
      await prisma.customerPoints.create({ data: { customerId, balance: 1250, lifetimePoints: 1250 } });
      lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
    });

    it('204: cliente y cuenta quedan inactivos, se cierran las sesiones y el login falla', async () => {
      const admin = await tokenOf(ADMIN);
      await login(SOFIA.email, '38456123').expect(200);
      const account = await prisma.account.findFirstOrThrow({ where: { customerId } });
      expect(await prisma.session.count({ where: { accountId: account.id, revokedAt: null } })).toBe(1);

      await request(app.getHttpServer()).patch(`/api/customers/${customerId}/deactivate`).set(as(admin)).expect(204);

      const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
      expect(customer.isActive).toBe(false);
      expect((await prisma.account.findUniqueOrThrow({ where: { id: account.id } })).isActive).toBe(false);
      expect(await prisma.session.count({ where: { accountId: account.id, revokedAt: null } })).toBe(0);
      await login(SOFIA.email, '38456123').expect(401);
    });

    it('audita CUSTOMER_DEACTIVATED con "Saldo perdido"', async () => {
      const admin = await tokenOf(ADMIN);

      await request(app.getHttpServer()).patch(`/api/customers/${customerId}/deactivate`).set(as(admin)).expect(204);

      const rows = await newAuditRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorType: 'EMPLOYEE',
        module: 'CUSTOMERS',
        actionCode: 'CUSTOMER_DEACTIVATED',
        affectedCustomerId: customerId,
        affectedCustomerName: 'Sofía Ríos',
      });
      expect(rows[0].details).toEqual([
        { label: 'Estado', value: 'Activo → Inactivo' },
        { label: 'Saldo perdido', value: '1.250 pts' },
      ]);
    });

    it('un cliente sin puntos pierde 0 pts', async () => {
      await prisma.customerPoints.deleteMany();

      await request(app.getHttpServer())
        .patch(`/api/customers/${customerId}/deactivate`)
        .set(as(await tokenOf(ADMIN)))
        .expect(204);

      expect((await newAuditRows())[0].details).toContainEqual({ label: 'Saldo perdido', value: '0 pts' });
    });

    it('un saldo negativo se registra tal cual', async () => {
      await prisma.customerPoints.update({ where: { customerId }, data: { balance: -30 } });

      await request(app.getHttpServer())
        .patch(`/api/customers/${customerId}/deactivate`)
        .set(as(await tokenOf(ADMIN)))
        .expect(204);

      expect((await newAuditRows())[0].details).toContainEqual({ label: 'Saldo perdido', value: '-30 pts' });
    });

    it('el email del cliente dado de baja queda libre: se puede registrar otro con el mismo mail', async () => {
      const admin = await tokenOf(ADMIN);
      await request(app.getHttpServer()).patch(`/api/customers/${customerId}/deactivate`).set(as(admin)).expect(204);

      await request(app.getHttpServer())
        .post('/api/customers')
        .set(as(admin))
        .send({ ...SOFIA, documentNumber: '38456999' })
        .expect(201);
    });

    it('dar de baja a un cliente ya inactivo → 409 y no se audita de nuevo', async () => {
      const admin = await tokenOf(ADMIN);
      await request(app.getHttpServer()).patch(`/api/customers/${customerId}/deactivate`).set(as(admin)).expect(204);

      await request(app.getHttpServer()).patch(`/api/customers/${customerId}/deactivate`).set(as(admin)).expect(409);

      expect(await newAuditRows()).toHaveLength(1);
    });

    it('el cliente no existe → 404 y no se audita', async () => {
      await request(app.getHttpServer())
        .patch('/api/customers/999999/deactivate')
        .set(as(await tokenOf(ADMIN)))
        .expect(404);

      expect(await newAuditRows()).toHaveLength(0);
    });

    it('PATCH /customers/:id/activate ya no existe → 404 (CA-CLI.10)', async () => {
      const admin = await tokenOf(ADMIN);
      await request(app.getHttpServer()).patch(`/api/customers/${customerId}/deactivate`).set(as(admin)).expect(204);

      await request(app.getHttpServer()).patch(`/api/customers/${customerId}/activate`).set(as(admin)).expect(404);

      expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).isActive).toBe(false);
    });

    // Contrato S4 §4 (D-02): dar de baja es solo del Administrador
    it('el Cajero recibe 403 y el cliente sigue activo (D-02)', async () => {
      const cashier = await tokenOf(CASHIER);

      const res = await request(app.getHttpServer())
        .patch(`/api/customers/${customerId}/deactivate`)
        .set(as(cashier))
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN');
      expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).isActive).toBe(true);
      expect(await newAuditRows()).toHaveLength(0);
    });

    it('sin token → 401', async () => {
      await request(app.getHttpServer()).patch(`/api/customers/${customerId}/deactivate`).expect(401);
    });
  });
});
