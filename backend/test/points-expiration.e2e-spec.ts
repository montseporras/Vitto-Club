import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { AuditService } from '../src/audit/application/audit.service.js';
import { PointsExpirationService } from '../src/points/application/points-expiration.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Cubre US-25 (§3.6.3 y la auditoría POINTS_EXPIRED de §3.9.3) contra Postgres real. El proceso
// no tiene endpoint: se llama directo a PointsExpirationService, igual que el cron y el comando.
describe('Vencimiento automático de puntos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let expiration: PointsExpirationService;
  let auditService: AuditService;
  // La auditoría y los movimientos son solo inserción: se miran desde el último id
  let lastAuditId = 0;

  // "Ahora" de la corrida: 01/03/2027 00:05 en Argentina
  const NOW = new Date('2027-03-01T03:05:00.000Z');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    expiration = app.get(PointsExpirationService);
    auditService = app.get(AuditService);
  });

  // Limpia al terminar: los movimientos referencian clientes (onDelete Restrict), y las suites que
  // corren después borran esas tablas sin saber de puntos.
  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await cleanDatabase();
    await prisma.loyaltyProgramConfiguration.create({
      data: {
        version: 1,
        baseAmount: 1000,
        pointsAwarded: 10,
        silverMinPoints: 300,
        goldMinPoints: 800,
        pointsExpirationMonths: 12,
        isActive: true,
      },
    });
    lastAuditId = (await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } }))?.id ?? 0;
  });

  async function cleanDatabase() {
    await prisma.pointsMovement.deleteMany();
    await prisma.pointsLot.deleteMany();
    await prisma.customerPoints.deleteMany();
    await prisma.consumption.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.loyaltyProgramConfiguration.deleteMany();
  }

  const newAuditRows = () =>
    prisma.auditLog.findMany({ where: { id: { gt: lastAuditId } }, orderBy: { id: 'asc' } });

  // Escenario:
  // - Carolina: un lote vencido con saldo parcial (quedan 200 de 500) y otro que no venció (300).
  //   Saldo 500, acumulados 800.
  // - Martín: un lote vencido con todo su saldo (150). Saldo 150.
  // - Ana: un lote vencido pero ya consumido (remaining 0, CONSUMED): no genera movimiento.
  // - Lucas: dado de baja, con un lote vencido: se excluye (decisión de Melisa).
  async function seedScenario() {
    const carolina = await prisma.customer.create({
      data: { firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456001', email: 'carolina@example.com' },
    });
    await prisma.customerPoints.create({
      data: { customerId: carolina.id, balance: 500, debt: 0, lifetimePoints: 800 },
    });
    const partialLot = await prisma.pointsLot.create({
      data: {
        customerId: carolina.id,
        initialPoints: 500,
        remainingPoints: 200,
        // 16/02/2026 21:30 en Argentina
        accreditedAt: new Date('2026-02-17T00:30:00.000Z'),
        expiresAt: new Date('2027-02-17T00:30:00.000Z'),
      },
    });
    const futureLot = await prisma.pointsLot.create({
      data: {
        customerId: carolina.id,
        initialPoints: 300,
        remainingPoints: 300,
        accreditedAt: new Date('2026-06-01T15:00:00.000Z'),
        expiresAt: new Date('2027-06-01T15:00:00.000Z'),
      },
    });

    const martin = await prisma.customer.create({
      data: { firstName: 'Martín', lastName: 'Gómez', documentType: 'PASSPORT', documentNumber: 'AAB123456', email: 'martin@example.com' },
    });
    await prisma.customerPoints.create({
      data: { customerId: martin.id, balance: 150, debt: 0, lifetimePoints: 150 },
    });
    const fullLot = await prisma.pointsLot.create({
      data: {
        customerId: martin.id,
        initialPoints: 150,
        remainingPoints: 150,
        accreditedAt: new Date('2026-02-20T15:00:00.000Z'),
        expiresAt: new Date('2027-02-20T15:00:00.000Z'),
      },
    });

    const ana = await prisma.customer.create({
      data: { firstName: 'Ana', lastName: 'Paz', documentType: 'DNI', documentNumber: '30222333', email: 'ana@example.com' },
    });
    await prisma.customerPoints.create({
      data: { customerId: ana.id, balance: 0, debt: 0, lifetimePoints: 100 },
    });
    const consumedLot = await prisma.pointsLot.create({
      data: {
        customerId: ana.id,
        initialPoints: 100,
        remainingPoints: 0,
        status: 'CONSUMED',
        accreditedAt: new Date('2026-01-10T15:00:00.000Z'),
        expiresAt: new Date('2027-01-10T15:00:00.000Z'),
      },
    });

    const lucas = await prisma.customer.create({
      data: {
        firstName: 'Lucas',
        lastName: 'Ríos',
        documentType: 'DNI',
        documentNumber: '30111222',
        email: 'lucas@example.com',
        isActive: false,
        deactivatedAt: new Date('2026-09-01T15:00:00.000Z'),
      },
    });
    await prisma.customerPoints.create({
      data: { customerId: lucas.id, balance: 80, debt: 0, lifetimePoints: 80 },
    });
    const inactiveLot = await prisma.pointsLot.create({
      data: {
        customerId: lucas.id,
        initialPoints: 80,
        remainingPoints: 80,
        accreditedAt: new Date('2026-01-05T15:00:00.000Z'),
        expiresAt: new Date('2027-01-05T15:00:00.000Z'),
      },
    });

    return { carolina, martin, ana, lucas, partialLot, futureLot, fullLot, consumedLot, inactiveLot };
  }

  it('vence entero el lote parcial y el total: lote, saldo, movimiento EXPIRATION y lifetimePoints', async () => {
    const s = await seedScenario();

    const result = await expiration.run(NOW);

    expect(result).toEqual({ expiredLots: 2, expiredPoints: 350, failures: [] });

    // Lote parcial: vence entero con lo que le quedaba (remaining 0, decisión de Melisa)
    const partial = await prisma.pointsLot.findUniqueOrThrow({ where: { id: s.partialLot.id } });
    expect(partial).toMatchObject({ status: 'EXPIRED', remainingPoints: 0, initialPoints: 500, expiredAt: NOW });
    // CA-25.3: el saldo baja, lifetimePoints (y el nivel) no
    expect(await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: s.carolina.id } })).toMatchObject({
      balance: 300,
      debt: 0,
      lifetimePoints: 800,
    });

    const full = await prisma.pointsLot.findUniqueOrThrow({ where: { id: s.fullLot.id } });
    expect(full).toMatchObject({ status: 'EXPIRED', remainingPoints: 0, expiredAt: NOW });
    expect(await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: s.martin.id } })).toMatchObject({
      balance: 0,
      lifetimePoints: 150,
    });

    const movements = await prisma.pointsMovement.findMany({ orderBy: { id: 'asc' } });
    expect(movements).toHaveLength(2);
    expect(movements[0]).toMatchObject({
      customerId: s.carolina.id,
      type: 'EXPIRATION',
      points: -200,
      balanceAfter: 300,
      lotId: s.partialLot.id,
      consumptionId: null,
      reason: null,
      // Sistema: sin cuenta
      performedByAccountId: null,
      performedByName: 'Sistema',
    });
    expect(movements[1]).toMatchObject({
      customerId: s.martin.id,
      type: 'EXPIRATION',
      points: -150,
      balanceAfter: 0,
      lotId: s.fullLot.id,
    });
  });

  it('no toca el lote que no venció, el que no tiene saldo ni el del cliente dado de baja', async () => {
    const s = await seedScenario();

    await expiration.run(NOW);

    expect(await prisma.pointsLot.findUniqueOrThrow({ where: { id: s.futureLot.id } })).toMatchObject({
      status: 'ACTIVE',
      remainingPoints: 300,
      expiredAt: null,
    });
    expect(await prisma.pointsLot.findUniqueOrThrow({ where: { id: s.consumedLot.id } })).toMatchObject({
      status: 'CONSUMED',
      expiredAt: null,
    });
    expect(await prisma.pointsLot.findUniqueOrThrow({ where: { id: s.inactiveLot.id } })).toMatchObject({
      status: 'ACTIVE',
      remainingPoints: 80,
    });
    expect(await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: s.lucas.id } })).toMatchObject({
      balance: 80,
    });
    const touched = await prisma.pointsMovement.findMany({
      where: { customerId: { in: [s.ana.id, s.lucas.id] } },
    });
    expect(touched).toHaveLength(0);
  });

  it('audita POINTS_EXPIRED con actor Sistema, el cliente afectado y las 3 filas de §3.9.3', async () => {
    const s = await seedScenario();

    await expiration.run(NOW);

    const rows = await newAuditRows();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      actorType: 'SYSTEM',
      actorAccountId: null,
      performedBy: 'Sistema',
      module: 'POINTS',
      actionCode: 'POINTS_EXPIRED',
      description: 'Venció 200 pts de Carolina Fernández',
      affectedCustomerId: s.carolina.id,
      affectedCustomerName: 'Carolina Fernández',
      documentType: 'DNI',
      documentNumber: '38456001',
      operationCode: null,
      details: [
        { label: 'Puntos vencidos', value: '−200 pts' },
        { label: 'Fecha del lote (acreditación)', value: '16/02/2026' },
        { label: 'Saldo resultante', value: '300 pts' },
      ],
    });
    expect(rows[1]).toMatchObject({
      description: 'Venció 150 pts de Martín Gómez',
      documentType: 'PASSPORT',
      documentNumber: 'AAB123456',
    });
  });

  it('CA-25.4: si corre dos veces, no vuelve a procesar los lotes vencidos', async () => {
    await seedScenario();

    await expiration.run(NOW);
    const second = await expiration.run(NOW);

    expect(second).toEqual({ expiredLots: 0, expiredPoints: 0, failures: [] });
    expect(await prisma.pointsMovement.count()).toBe(2);
    expect(await newAuditRows()).toHaveLength(2);
  });

  it('CA-25.4: dos corridas a la vez no vencen el mismo lote dos veces', async () => {
    await seedScenario();

    const [first, second] = await Promise.all([expiration.run(NOW), expiration.run(NOW)]);

    expect(first.failures).toEqual([]);
    expect(second.failures).toEqual([]);
    expect(first.expiredLots + second.expiredLots).toBe(2);
    expect(first.expiredPoints + second.expiredPoints).toBe(350);
    expect(await prisma.pointsMovement.count()).toBe(2);
    expect(await newAuditRows()).toHaveLength(2);
  });

  it('CA-25.5: manda la fecha del lote, aunque después se haya cambiado la vigencia', async () => {
    const s = await seedScenario();
    await prisma.loyaltyProgramConfiguration.updateMany({ data: { pointsExpirationMonths: 36 } });

    const result = await expiration.run(NOW);

    expect(result.expiredLots).toBe(2);
    expect(await prisma.pointsLot.findUniqueOrThrow({ where: { id: s.partialLot.id } })).toMatchObject({
      status: 'EXPIRED',
    });
  });

  it('rollback: si falla la auditoría de un lote, ese lote queda como estaba y los demás vencen', async () => {
    const s = await seedScenario();
    // Falla solo la primera auditoría (el lote de Carolina, que vence primero)
    const original = auditService.record.bind(auditService);
    jest
      .spyOn(auditService, 'record')
      .mockImplementationOnce(async () => {
        throw new Error('audit failed');
      })
      .mockImplementation(original);

    const result = await expiration.run(NOW);

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].lotId).toBe(s.partialLot.id);
    expect(result.expiredLots).toBe(1);

    // Nada de Carolina quedó escrito: ni el lote, ni el saldo, ni el movimiento, ni la auditoría
    expect(await prisma.pointsLot.findUniqueOrThrow({ where: { id: s.partialLot.id } })).toMatchObject({
      status: 'ACTIVE',
      remainingPoints: 200,
      expiredAt: null,
    });
    expect(await prisma.customerPoints.findUniqueOrThrow({ where: { customerId: s.carolina.id } })).toMatchObject({
      balance: 500,
    });
    expect(await prisma.pointsMovement.count({ where: { customerId: s.carolina.id } })).toBe(0);
    const rows = await newAuditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].affectedCustomerId).toBe(s.martin.id);
  });
});
